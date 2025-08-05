# ロケーション計測データ取得API仕様

## ベースURL
```
https://your-domain.com/api/v1
```

## エンドポイント

### 1. 計測データ取得
```
GET /measurements
```

#### パラメータ
| パラメータ | 型 | 必須 | 説明 | 例 |
|-----------|---|----|------|-----|
| location | string | ✓ | 位置情報（緯度,経度） | "35.6762,139.6503" |
| start_time | string | ✓ | 開始時刻（ISO8601） | "2024-01-01T00:00:00Z" |
| end_time | string | ✓ | 終了時刻（ISO8601） | "2024-01-01T23:59:59Z" |
| interval | string | - | データ間隔（デフォルト: 1m） | "1m", "5m", "1h" |
| metrics | string | - | 取得する指標（カンマ区切り） | "temperature,humidity,pressure" |

#### レスポンス例
```json
{
  "status": "success",
  "data": {
    "location": {
      "latitude": 35.6762,
      "longitude": 139.6503,
      "address": "東京都新宿区"
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
        "pressure": 1013.25
      },
      {
        "timestamp": "2024-01-01T00:01:00Z", 
        "temperature": 15.1,
        "humidity": 65.7,
        "pressure": 1013.22
      }
    ],
    "total_records": 1440
  }
}
```

### 2. 利用可能な指標一覧
```
GET /metrics
```

#### レスポンス例
```json
{
  "status": "success",
  "data": {
    "available_metrics": [
      {
        "name": "temperature",
        "unit": "°C",
        "description": "気温"
      },
      {
        "name": "humidity", 
        "unit": "%",
        "description": "湿度"
      },
      {
        "name": "pressure",
        "unit": "hPa", 
        "description": "気圧"
      }
    ]
  }
}
```

### 3. 位置情報検索
```
GET /locations/search
```

#### パラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|---|----|------|
| query | string | ✓ | 検索クエリ（住所、地名など） |

#### レスポンス例
```json
{
  "status": "success",
  "data": {
    "locations": [
      {
        "name": "東京都新宿区",
        "latitude": 35.6762,
        "longitude": 139.6503,
        "country": "Japan"
      }
    ]
  }
}
```

## エラーレスポンス
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_LOCATION",
    "message": "指定された位置情報が無効です"
  }
}
```

## レート制限
- 1分間に60リクエスト
- 1日に1000リクエスト