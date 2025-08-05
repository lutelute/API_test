# 無料サーバー選択肢

## 推奨オプション

### 1. Railway (最推奨)
- **無料枠**: 月500時間実行、1GB RAM
- **データベース**: PostgreSQL無料提供
- **特徴**: Git連携、自動デプロイ、環境変数管理
- **適用**: Node.js/Pythonアプリ + PostgreSQL

### 2. Render
- **無料枠**: Web Service無料、750時間/月
- **データベース**: PostgreSQL 90日間無料
- **特徴**: 自動スリープ機能、HTTPS自動設定
- **制限**: 非アクティブ時に15分でスリープ

### 3. Vercel (フロントエンド + Serverless)
- **無料枠**: Serverless Functions 100GB/月
- **データベース**: Vercel Postgres（Neon）
- **特徴**: 高速CDN、自動スケーリング
- **適用**: API Routes + Next.js

## データベース選択肢

### 1. Supabase (推奨)
- **無料枠**: 500MB、リアルタイム機能
- **特徴**: PostgreSQL、認証機能、API自動生成
- **制限**: 2プロジェクトまで

### 2. PlanetScale
- **無料枠**: 5GB、ブランチ機能
- **特徴**: MySQL互換、スキーマレス
- **制限**: 1データベースまで

### 3. Neon
- **無料枠**: 0.5GB、自動スケーリング
- **特徴**: PostgreSQL、ブランチ機能
- **制限**: 1プロジェクトまで

## 推奨構成

### パターン1: Railway + Supabase
```
Railway (API サーバー) + Supabase (データベース) + Cloudflare (CDN)
```

### パターン2: Vercel Serverless
```
Vercel (API + フロントエンド) + Vercel Postgres + Cloudflare
```

### パターン3: Render
```
Render (API サーバー) + Render PostgreSQL + Cloudflare
```

## セットアップ手順（Railway推奨）

1. **Railwayアカウント作成**: [railway.app](https://railway.app)
2. **GitHubリポジトリ連携**
3. **環境変数設定**:
   - `OPENWEATHER_API_KEY`
   - `DATABASE_URL`
4. **PostgreSQL追加**: Railway内でワンクリック
5. **Cloudflare設定**: DNS設定でCDN有効化

## コスト見積もり（月額）

| サービス | 無料枠 | 有料移行ライン |
|---------|--------|---------------|
| Railway | 500時間/月 | $5/月〜 |
| Supabase | 500MB | $25/月〜 |
| Cloudflare | 無制限 | $20/月〜 |
| **合計** | **完全無料** | **$50/月〜** |