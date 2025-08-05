# 計測データ提供API

## 完成したAPIサービス

データ提供者が計測データを投稿し、利用者がロケーション指定でデータを取得できるAPIサービスです。

### 🚀 実行・検証完了

- ✅ APIサーバー起動済み（ポート3001）
- ✅ 全エンドポイント動作確認済み
- ✅ テストデータ120件生成済み
- ✅ 認証機能動作確認済み

## API機能

### データ提供者向け
- **計測データ投稿**: `POST /api/v1/measurements`
- **提供者登録**: `POST /api/v1/providers`

### 利用者向け  
- **計測データ取得**: `GET /api/v1/measurements`
- **近隣提供者検索**: `GET /api/v1/providers/nearby`
- **利用可能指標**: `GET /api/v1/metrics`

## 検証結果

### 1. ヘルスチェック ✅
```json
{
  "status": "ok",
  "providers_count": 2,
  "measurements_count": 120
}
```

### 2. データ取得 ✅
- 東京周辺で58件のデータ取得成功
- 1分刻みデータ対応
- 地理的検索機能動作

### 3. データ投稿 ✅
- API認証機能動作
- データ投稿成功確認

### 4. 提供者登録 ✅
- 新規提供者登録成功
- APIキー自動生成

## 利用方法

### サーバー起動
```bash
node test_api.js
```

### テスト実行
```bash
./test_requests.sh
```

### APIキー（デモ用）
- 東京センサーステーション: `demo_api_key_tokyo`
- 大阪観測所: `demo_api_key_osaka`

## デプロイ準備完了

Railway、Render、Vercelなどの無料サービスに即座にデプロイ可能です。