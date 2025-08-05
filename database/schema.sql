-- 計測データ提供APIのデータベーススキーマ

-- データ提供者テーブル
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- 計測データテーブル
CREATE TABLE measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    temperature DECIMAL(5, 2),
    humidity DECIMAL(5, 2),
    pressure DECIMAL(6, 2),
    wind_speed DECIMAL(5, 2),
    wind_direction INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 指標マスタテーブル
CREATE TABLE metrics (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- インデックス作成
CREATE INDEX idx_measurements_location ON measurements (latitude, longitude);
CREATE INDEX idx_measurements_timestamp ON measurements (timestamp);
CREATE INDEX idx_measurements_provider_timestamp ON measurements (provider_id, timestamp);
CREATE INDEX idx_providers_location ON providers (latitude, longitude);
CREATE INDEX idx_providers_api_key ON providers (api_key);

-- 地理的検索用のPostGIS拡張が使える場合のインデックス（オプション）
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE providers ADD COLUMN location GEOGRAPHY(POINT, 4326);
-- ALTER TABLE measurements ADD COLUMN location GEOGRAPHY(POINT, 4326);
-- CREATE INDEX idx_providers_location_gist ON providers USING GIST (location);
-- CREATE INDEX idx_measurements_location_gist ON measurements USING GIST (location);

-- 初期データ
INSERT INTO metrics (name, unit, description) VALUES
('temperature', '°C', '気温'),
('humidity', '%', '湿度'),
('pressure', 'hPa', '気圧'),
('wind_speed', 'm/s', '風速'),
('wind_direction', '度', '風向き');

-- サンプルデータ提供者
INSERT INTO providers (name, description, api_key, latitude, longitude, address, contact_email) VALUES
('東京センサーステーション', '東京都新宿区の気象観測所', 'demo_api_key_tokyo', 35.6762, 139.6503, '東京都新宿区', 'tokyo@example.com'),
('大阪観測所', '大阪市中央区の気象データ提供', 'demo_api_key_osaka', 34.6937, 135.5023, '大阪府大阪市中央区', 'osaka@example.com');