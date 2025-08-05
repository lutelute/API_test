const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const cache = new NodeCache({ stdTTL: 300 }); // 5分キャッシュ

app.use(cors());
app.use(express.json());

// OpenWeatherMap API設定
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// 計測データ取得エンドポイント
app.get('/api/v1/measurements', async (req, res) => {
  try {
    const { location, start_time, end_time, interval = '1m', metrics = 'temperature,humidity,pressure' } = req.query;
    
    if (!location || !start_time || !end_time) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'location, start_time, end_time are required'
        }
      });
    }

    // 座標解析
    const [lat, lon] = location.split(',').map(coord => parseFloat(coord.trim()));
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_LOCATION',
          message: '位置情報の形式が無効です。"latitude,longitude"の形式で指定してください'
        }
      });
    }

    // キャッシュキー生成
    const cacheKey = `measurements_${lat}_${lon}_${start_time}_${end_time}_${interval}_${metrics}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    // 現在の気象データを取得（デモ用）
    const weatherResponse = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
      params: {
        lat,
        lon,
        appid: OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });

    const weatherData = weatherResponse.data;
    
    // 時間範囲に基づいてダミーデータ生成（実際の実装では過去データAPIを使用）
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const measurements = generateMeasurements(startDate, endDate, weatherData, interval);

    const response = {
      status: 'success',
      data: {
        location: {
          latitude: lat,
          longitude: lon,
          address: weatherData.name || 'Unknown'
        },
        period: {
          start: start_time,
          end: end_time,
          interval
        },
        measurements,
        total_records: measurements.length
      }
    };

    // キャッシュに保存
    cache.set(cacheKey, response);
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({
      status: 'error',
      error: {
        code: 'INTERNAL_ERROR',
        message: 'データの取得中にエラーが発生しました'
      }
    });
  }
});

// 利用可能な指標一覧
app.get('/api/v1/metrics', (req, res) => {
  res.json({
    status: 'success',
    data: {
      available_metrics: [
        {
          name: 'temperature',
          unit: '°C',
          description: '気温'
        },
        {
          name: 'humidity',
          unit: '%',
          description: '湿度'
        },
        {
          name: 'pressure',
          unit: 'hPa',
          description: '気圧'
        }
      ]
    }
  });
});

// 位置情報検索
app.get('/api/v1/locations/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'MISSING_QUERY',
          message: 'search query is required'
        }
      });
    }

    const geoResponse = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
      params: {
        q: query,
        appid: OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });

    const geoData = geoResponse.data;
    
    res.json({
      status: 'success',
      data: {
        locations: [{
          name: geoData.name,
          latitude: geoData.coord.lat,
          longitude: geoData.coord.lon,
          country: geoData.sys.country
        }]
      }
    });
  } catch (error) {
    res.status(404).json({
      status: 'error',
      error: {
        code: 'LOCATION_NOT_FOUND',
        message: '指定された場所が見つかりませんでした'
      }
    });
  }
});

// ダミーデータ生成関数
function generateMeasurements(startDate, endDate, baseWeather, interval) {
  const measurements = [];
  const intervalMs = getIntervalMs(interval);
  
  let currentTime = new Date(startDate);
  const baseTemp = baseWeather.main.temp;
  const baseHumidity = baseWeather.main.humidity;
  const basePressure = baseWeather.main.pressure;
  
  while (currentTime <= endDate) {
    // ランダムな変動を加える
    const tempVariation = (Math.random() - 0.5) * 4; // ±2度
    const humidityVariation = (Math.random() - 0.5) * 20; // ±10%
    const pressureVariation = (Math.random() - 0.5) * 10; // ±5hPa
    
    measurements.push({
      timestamp: currentTime.toISOString(),
      temperature: Math.round((baseTemp + tempVariation) * 10) / 10,
      humidity: Math.max(0, Math.min(100, baseHumidity + humidityVariation)),
      pressure: Math.round((basePressure + pressureVariation) * 100) / 100
    });
    
    currentTime = new Date(currentTime.getTime() + intervalMs);
  }
  
  return measurements;
}

function getIntervalMs(interval) {
  switch (interval) {
    case '1m': return 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    default: return 60 * 1000;
  }
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Make sure to set OPENWEATHER_API_KEY environment variable`);
});