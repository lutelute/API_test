// SQLiteを使った簡易テスト用のサーバー（PostgreSQL不要）
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');

const app = express();
const port = process.env.PORT || 3000;
const cache = new NodeCache({ stdTTL: 300 });

app.use(cors());
app.use(express.json());

// インメモリデータベース（テスト用）
let providers = [
  {
    id: 'demo-provider-1',
    name: '東京センサーステーション',
    api_key: 'demo_api_key_tokyo',
    latitude: 35.6762,
    longitude: 139.6503,
    address: '東京都新宿区',
    contact_email: 'tokyo@example.com',
    is_active: true
  },
  {
    id: 'demo-provider-2', 
    name: '大阪観測所',
    api_key: 'demo_api_key_osaka',
    latitude: 34.6937,
    longitude: 135.5023,
    address: '大阪府大阪市中央区',
    contact_email: 'osaka@example.com',
    is_active: true
  }
];

let measurements = [];

// 認証ミドルウェア
const authenticateProvider = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      error: { code: 'UNAUTHORIZED', message: 'API key required' }
    });
  }

  const apiKey = authHeader.substring(7);
  const provider = providers.find(p => p.api_key === apiKey && p.is_active);
  
  if (!provider) {
    return res.status(401).json({
      status: 'error',
      error: { code: 'INVALID_API_KEY', message: 'Invalid API key' }
    });
  }
  
  req.provider = provider;
  next();
};

// 計算用ヘルパー関数
function calculateDistance(lat1, lon1, lat2, lon2) {
  return Math.sqrt(Math.pow(69.1 * (lat1 - lat2), 2) + 
                   Math.pow(69.1 * (lon1 - lon2) * Math.cos(lat1 / 57.3), 2));
}

// 1. 計測データ投稿
app.post('/api/v1/measurements', authenticateProvider, (req, res) => {
  try {
    const { location, measurements: newMeasurements } = req.body;
    
    if (!location || !newMeasurements || !Array.isArray(newMeasurements)) {
      return res.status(400).json({
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request format' }
      });
    }

    const recordedMeasurements = newMeasurements.map(measurement => ({
      id: uuidv4(),
      provider_id: req.provider.id,
      provider_name: req.provider.name,
      timestamp: measurement.timestamp,
      latitude: location.latitude,
      longitude: location.longitude,
      temperature: measurement.temperature || null,
      humidity: measurement.humidity || null,
      pressure: measurement.pressure || null,
      wind_speed: measurement.wind_speed || null,
      wind_direction: measurement.wind_direction || null,
      created_at: new Date().toISOString()
    }));

    measurements.push(...recordedMeasurements);
    
    res.status(201).json({
      status: 'success',
      data: {
        message: `${newMeasurements.length} measurements recorded`,
        provider: req.provider.name
      }
    });
  } catch (error) {
    console.error('Error posting measurements:', error);
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record measurements' }
    });
  }
});

// 2. 計測データ取得
app.get('/api/v1/measurements', (req, res) => {
  try {
    const { location, radius = 5, start_time, end_time } = req.query;
    
    if (!location || !start_time || !end_time) {
      return res.status(400).json({
        status: 'error',
        error: { code: 'MISSING_PARAMETERS', message: 'location, start_time, end_time are required' }
      });
    }

    const [lat, lon] = location.split(',').map(coord => parseFloat(coord.trim()));
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        status: 'error',
        error: { code: 'INVALID_LOCATION', message: 'Invalid location format' }
      });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    // フィルタリング
    const filteredMeasurements = measurements.filter(m => {
      const measurementDate = new Date(m.timestamp);
      const provider = providers.find(p => p.id === m.provider_id);
      const distance = calculateDistance(lat, lon, provider.latitude, provider.longitude);
      
      return measurementDate >= startDate && 
             measurementDate <= endDate && 
             distance <= parseFloat(radius);
    });

    const formattedMeasurements = filteredMeasurements.map(m => {
      const provider = providers.find(p => p.id === m.provider_id);
      const distance = calculateDistance(lat, lon, provider.latitude, provider.longitude);
      
      return {
        timestamp: m.timestamp,
        temperature: m.temperature,
        humidity: m.humidity,
        pressure: m.pressure,
        wind_speed: m.wind_speed,
        wind_direction: m.wind_direction,
        provider: {
          id: m.provider_id,
          name: m.provider_name,
          distance: Math.round(distance * 100) / 100
        }
      };
    });

    const uniqueProviders = [...new Set(filteredMeasurements.map(m => m.provider_id))];

    res.json({
      status: 'success',
      data: {
        location: { latitude: lat, longitude: lon, radius: parseFloat(radius) },
        period: { start: start_time, end: end_time, interval: '1m' },
        measurements: formattedMeasurements,
        total_records: formattedMeasurements.length,
        providers_count: uniqueProviders.length
      }
    });
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch measurements' }
    });
  }
});

// 3. データ提供者登録
app.post('/api/v1/providers', (req, res) => {
  try {
    const { name, description, location, contact } = req.body;
    
    if (!name || !location) {
      return res.status(400).json({
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'name and location are required' }
      });
    }

    const newProvider = {
      id: uuidv4(),
      name,
      description: description || '',
      api_key: uuidv4(),
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address || '',
      contact_email: contact || '',
      is_active: true,
      created_at: new Date().toISOString()
    };

    providers.push(newProvider);

    res.status(201).json({
      status: 'success',
      data: {
        id: newProvider.id,
        api_key: newProvider.api_key,
        message: 'Provider registered successfully'
      }
    });
  } catch (error) {
    console.error('Error registering provider:', error);
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'Failed to register provider' }
    });
  }
});

// 4. 近隣のデータ提供者一覧
app.get('/api/v1/providers/nearby', (req, res) => {
  try {
    const { location, radius = 10 } = req.query;
    
    if (!location) {
      return res.status(400).json({
        status: 'error',
        error: { code: 'MISSING_LOCATION', message: 'location parameter is required' }
      });
    }

    const [lat, lon] = location.split(',').map(coord => parseFloat(coord.trim()));
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        status: 'error',
        error: { code: 'INVALID_LOCATION', message: 'Invalid location format' }
      });
    }

    const nearbyProviders = providers
      .filter(p => p.is_active)
      .map(p => ({
        ...p,
        distance: calculateDistance(lat, lon, p.latitude, p.longitude)
      }))
      .filter(p => p.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance)
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        location: {
          latitude: p.latitude,
          longitude: p.longitude,
          address: p.address
        },
        distance: Math.round(p.distance * 100) / 100
      }));

    res.json({
      status: 'success',
      data: { providers: nearbyProviders }
    });
  } catch (error) {
    console.error('Error fetching nearby providers:', error);
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch providers' }
    });
  }
});

// 5. 利用可能な指標一覧
app.get('/api/v1/metrics', (req, res) => {
  const metrics = [
    { name: 'temperature', unit: '°C', description: '気温' },
    { name: 'humidity', unit: '%', description: '湿度' },
    { name: 'pressure', unit: 'hPa', description: '気圧' },
    { name: 'wind_speed', unit: 'm/s', description: '風速' },
    { name: 'wind_direction', unit: '度', description: '風向き' }
  ];

  res.json({
    status: 'success',
    data: { available_metrics: metrics }
  });
});

// ヘルスチェック
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    providers_count: providers.length,
    measurements_count: measurements.length
  });
});

// テスト用データ生成
function generateTestData() {
  const now = new Date();
  const testMeasurements = [];
  
  providers.forEach(provider => {
    // 過去1時間のデータを1分間隔で生成
    for (let i = 0; i < 60; i++) {
      const timestamp = new Date(now.getTime() - (i * 60 * 1000));
      testMeasurements.push({
        id: uuidv4(),
        provider_id: provider.id,
        provider_name: provider.name,
        timestamp: timestamp.toISOString(),
        latitude: provider.latitude,
        longitude: provider.longitude,
        temperature: 15 + Math.random() * 10,
        humidity: 50 + Math.random() * 30,
        pressure: 1010 + Math.random() * 20,
        wind_speed: Math.random() * 10,
        wind_direction: Math.random() * 360,
        created_at: new Date().toISOString()
      });
    }
  });
  
  measurements.push(...testMeasurements);
  console.log(`Generated ${testMeasurements.length} test measurements`);
}

app.listen(port, () => {
  console.log(`Measurement Data Provider API running on port ${port}`);
  console.log('Test mode - using in-memory database');
  console.log('Available demo API keys:');
  providers.forEach(p => {
    console.log(`  ${p.name}: ${p.api_key}`);
  });
  
  // テストデータ生成
  generateTestData();
});