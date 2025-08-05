const express = require('express');
const cors = require('cors');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const NodeCache = require('node-cache');
const pool = require('./database');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const cache = new NodeCache({ stdTTL: 300 }); // 5分キャッシュ

app.use(cors());
app.use(express.json());

// バリデーションスキーマ
const measurementSchema = Joi.object({
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().optional()
  }).required(),
  measurements: Joi.array().items(
    Joi.object({
      timestamp: Joi.string().isoDate().required(),
      temperature: Joi.number().optional(),
      humidity: Joi.number().min(0).max(100).optional(),
      pressure: Joi.number().optional(),
      wind_speed: Joi.number().min(0).optional(),
      wind_direction: Joi.number().min(0).max(360).optional()
    })
  ).min(1).required(),
  provider: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required()
  }).required()
});

const providerSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().optional()
  }).required(),
  contact: Joi.string().email().optional()
});

// 認証ミドルウェア
const authenticateProvider = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      error: { code: 'UNAUTHORIZED', message: 'API key required' }
    });
  }

  const apiKey = authHeader.substring(7);
  try {
    const result = await pool.query(
      'SELECT id, name FROM providers WHERE api_key = $1 AND is_active = true',
      [apiKey]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        error: { code: 'INVALID_API_KEY', message: 'Invalid API key' }
      });
    }
    
    req.provider = result.rows[0];
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' }
    });
  }
};

// 1. 計測データ投稿
app.post('/api/v1/measurements', authenticateProvider, async (req, res) => {
  try {
    const { error, value } = measurementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const { location, measurements } = value;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const measurement of measurements) {
        await client.query(`
          INSERT INTO measurements (
            provider_id, timestamp, latitude, longitude, 
            temperature, humidity, pressure, wind_speed, wind_direction
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          req.provider.id,
          measurement.timestamp,
          location.latitude,
          location.longitude,
          measurement.temperature || null,
          measurement.humidity || null,
          measurement.pressure || null,
          measurement.wind_speed || null,
          measurement.wind_direction || null
        ]);
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        status: 'success',
        data: {
          message: `${measurements.length} measurements recorded`,
          provider: req.provider.name
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error posting measurements:', error);
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record measurements' }
    });
  }
});

// 2. 計測データ取得
app.get('/api/v1/measurements', async (req, res) => {
  try {
    const { location, radius = 5, start_time, end_time, interval = '1m', metrics } = req.query;
    
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

    // キャッシュキー生成
    const cacheKey = `measurements_${lat}_${lon}_${radius}_${start_time}_${end_time}_${interval}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    // 地理的検索クエリ（簡易版）
    const result = await pool.query(`
      SELECT 
        m.timestamp, m.temperature, m.humidity, m.pressure, 
        m.wind_speed, m.wind_direction,
        p.id as provider_id, p.name as provider_name,
        p.latitude as provider_lat, p.longitude as provider_lon,
        SQRT(POW(69.1 * (p.latitude - $1), 2) + 
             POW(69.1 * ($2 - p.longitude) * COS(p.latitude / 57.3), 2)) AS distance
      FROM measurements m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.timestamp BETWEEN $3 AND $4
      AND SQRT(POW(69.1 * (p.latitude - $1), 2) + 
               POW(69.1 * ($2 - p.longitude) * COS(p.latitude / 57.3), 2)) <= $5
      ORDER BY m.timestamp ASC
    `, [lat, lon, start_time, end_time, radius]);

    const measurements = result.rows.map(row => ({
      timestamp: row.timestamp,
      temperature: row.temperature,
      humidity: row.humidity,
      pressure: row.pressure,
      wind_speed: row.wind_speed,
      wind_direction: row.wind_direction,
      provider: {
        id: row.provider_id,
        name: row.provider_name,
        distance: Math.round(row.distance * 100) / 100
      }
    }));

    const uniqueProviders = [...new Set(result.rows.map(row => row.provider_id))];

    const response = {
      status: 'success',
      data: {
        location: { latitude: lat, longitude: lon, radius },
        period: { start: start_time, end: end_time, interval },
        measurements,
        total_records: measurements.length,
        providers_count: uniqueProviders.length
      }
    };

    cache.set(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch measurements' }
    });
  }
});

// 3. データ提供者登録
app.post('/api/v1/providers', async (req, res) => {
  try {
    const { error, value } = providerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: error.details[0].message }
      });
    }

    const { name, description, location, contact } = value;
    const apiKey = uuidv4();

    const result = await pool.query(`
      INSERT INTO providers (name, description, api_key, latitude, longitude, address, contact_email)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, api_key
    `, [name, description, apiKey, location.latitude, location.longitude, location.address, contact]);

    res.status(201).json({
      status: 'success',
      data: {
        id: result.rows[0].id,
        api_key: result.rows[0].api_key,
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
app.get('/api/v1/providers/nearby', async (req, res) => {
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

    const result = await pool.query(`
      SELECT 
        id, name, description, latitude, longitude, address,
        SQRT(POW(69.1 * (latitude - $1), 2) + 
             POW(69.1 * ($2 - longitude) * COS(latitude / 57.3), 2)) AS distance
      FROM providers 
      WHERE is_active = true
      AND SQRT(POW(69.1 * (latitude - $1), 2) + 
               POW(69.1 * ($2 - longitude) * COS(latitude / 57.3), 2)) <= $3
      ORDER BY distance ASC
    `, [lat, lon, radius]);

    const providers = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      location: {
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        address: row.address
      },
      distance: Math.round(row.distance * 100) / 100
    }));

    res.json({
      status: 'success',
      data: { providers }
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
app.get('/api/v1/metrics', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, unit, description FROM metrics WHERE is_active = true');
    
    res.json({
      status: 'success',
      data: { available_metrics: result.rows }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch metrics' }
    });
  }
});

// ヘルスチェック
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Measurement Data Provider API running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});