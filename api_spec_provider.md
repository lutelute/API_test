# 計測データ提供API仕様

## 概要
ロケーション指定で計測データを提供するAPIサービス
- データ提供者が計測データを投稿
- 利用者がロケーション指定でデータを取得

## ベースURL
```
https://your-domain.com/api/v1
```

## エンドポイント

### 1. 計測データ投稿（データ提供者用）
```
POST /measurements
```

#### リクエストボディ
```json
{
  "location": {
    "latitude": 35.6762,
    "longitude": 139.6503,
    "address": "東京都新宿区"
  },
  "measurements": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "temperature": 15.5,
      "humidity": 65.2,
      "pressure": 1013.25,
      "wind_speed": 2.3,
      "wind_direction": 180
    }
  ],
  "provider": {
    "id": "sensor_station_001",
    "name": "新宿センサーステーション"
  }
}
```

### 2. 計測データ取得（利用者用）
```
GET /measurements
```

#### パラメータ
| パラメータ | 型 | 必須 | 説明 | 例 |
|-----------|---|----|------|-----|
| location | string | ✓ | 位置情報（緯度,経度） | "35.6762,139.6503" |
| radius | number | - | 検索半径（km、デフォルト: 5） | 10 |
| start_time | string | ✓ | 開始時刻（ISO8601） | "2024-01-01T00:00:00Z" |
| end_time | string | ✓ | 終了時刻（ISO8601） | "2024-01-01T23:59:59Z" |
| interval | string | - | データ間隔（デフォルト: 1m） | "1m", "5m", "1h" |
| metrics | string | - | 取得する指標 | "temperature,humidity" |

### 3. データ提供者登録
```
POST /providers
```

#### リクエストボディ
```json
{
  "name": "新宿気象観測所",
  "description": "新宿区の気象データを提供",
  "location": {
    "latitude": 35.6762,
    "longitude": 139.6503,
    "address": "東京都新宿区"
  },
  "contact": "sensor@example.com"
}
```

### 4. 近隣のデータ提供者一覧
```
GET /providers/nearby
```

#### パラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|---|----|------|
| location | string | ✓ | 位置情報（緯度,経度） |
| radius | number | - | 検索半径（km、デフォルト: 10） |

## レスポンス例

### 計測データ取得レスポンス
```json
{
  "status": "success",
  "data": {
    "location": {
      "latitude": 35.6762,
      "longitude": 139.6503,
      "radius": 5
    },
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-01T23:59:59Z",
      "interval": "1m"
    },
    "measurements": [
      {
        "timestamp": "2024-01-01T00:00:00Z",
        "temperature": 15.2,
        "humidity": 65.5,
        "pressure": 1013.25,
        "provider": {
          "id": "sensor_001",
          "name": "新宿センサー",
          "distance": 1.2
        }
      }
    ],
    "total_records": 1440,
    "providers_count": 3
  }
}
```

## 認証
データ投稿には API キーが必要:
```
Authorization: Bearer YOUR_API_KEY
```