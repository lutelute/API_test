# 計測データ提供API

ロケーション指定で計測データを取得・投稿できるAPIサービス

## 🚀 クイックスタート

### 1. 依存関係インストール
```bash
npm install
```

### 2. サーバー起動
```bash
node test_api.js
```

### 3. APIテスト実行
```bash
./test_requests.sh
```

## 📡 API エンドポイント

### 利用者向け

#### データ取得
```bash
curl "http://localhost:3001/api/v1/measurements?location=35.6762,139.6503&start_time=2024-01-01T00:00:00Z&end_time=2024-01-01T01:00:00Z&radius=10"
```

#### 近隣の提供者検索
```bash
curl "http://localhost:3001/api/v1/providers/nearby?location=35.6762,139.6503&radius=50"
```

#### 利用可能指標
```bash
curl "http://localhost:3001/api/v1/metrics"
```

### データ提供者向け

#### 提供者登録
```bash
curl -X POST "http://localhost:3001/api/v1/providers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テスト観測所",
    "location": {
      "latitude": 35.6762,
      "longitude": 139.6503,
      "address": "東京都新宿区"
    },
    "contact": "test@example.com"
  }'
```

#### データ投稿（APIキー必要）
```bash
curl -X POST "http://localhost:3001/api/v1/measurements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo_api_key_tokyo" \
  -d '{
    "location": {
      "latitude": 35.6762,
      "longitude": 139.6503
    },
    "measurements": [{
      "timestamp": "2024-01-01T12:00:00Z",
      "temperature": 22.5,
      "humidity": 65.0,
      "pressure": 1013.25
    }],
    "provider": {
      "id": "demo-provider-1",
      "name": "テスト観測所"
    }
  }'
```

## 🔑 デモAPIキー

- 東京センサーステーション: `demo_api_key_tokyo`
- 大阪観測所: `demo_api_key_osaka`

## 🧪 テスト状況

✅ サーバー起動確認済み
✅ 全API動作確認済み  
✅ 120件のテストデータ生成済み
✅ 認証機能動作確認済み

## 🌐 デプロイ

### Railway（推奨）
1. [Railway](https://railway.app)にサインアップ
2. GitHubリポジトリ連携
3. 自動デプロイ完了

### その他選択肢
- Render
- Vercel
- Heroku

## 🏗️ 本格運用

PostgreSQLを使用する場合：
```bash
node src/server_provider.js
```

環境変数設定：
```bash
export DATABASE_URL="postgresql://username:password@host:port/database"
```