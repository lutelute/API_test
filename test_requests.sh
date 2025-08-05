#!/bin/bash

echo "=== 計測データ提供API テスト ==="
echo

# ベースURL
BASE_URL="http://localhost:3001/api/v1"

echo "1. ヘルスチェック"
curl -s "$BASE_URL/health" | jq '.'
echo

echo "2. 利用可能な指標一覧"
curl -s "$BASE_URL/metrics" | jq '.'
echo

echo "3. 近隣のデータ提供者一覧（東京）"
curl -s "$BASE_URL/providers/nearby?location=35.6762,139.6503&radius=50" | jq '.'
echo

echo "4. 計測データ取得（東京周辺、過去1時間）"
START_TIME=$(date -u -v-1H '+%Y-%m-%dT%H:%M:%SZ')
END_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
curl -s "$BASE_URL/measurements?location=35.6762,139.6503&radius=10&start_time=$START_TIME&end_time=$END_TIME" | jq '.data | {location, period, total_records, providers_count}'
echo

echo "5. 新しいデータ提供者登録"
curl -s -X POST "$BASE_URL/providers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "横浜気象観測所",
    "description": "横浜市のテスト気象データ提供",
    "location": {
      "latitude": 35.4478,
      "longitude": 139.6425,
      "address": "神奈川県横浜市"
    },
    "contact": "yokohama@example.com"
  }' | jq '.'
echo

echo "6. 計測データ投稿（要APIキー）"
API_KEY="demo_api_key_tokyo"
CURRENT_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
curl -s -X POST "$BASE_URL/measurements" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"location\": {
      \"latitude\": 35.6762,
      \"longitude\": 139.6503,
      \"address\": \"東京都新宿区\"
    },
    \"measurements\": [
      {
        \"timestamp\": \"$CURRENT_TIME\",
        \"temperature\": 22.5,
        \"humidity\": 68.0,
        \"pressure\": 1015.2,
        \"wind_speed\": 3.2,
        \"wind_direction\": 180
      }
    ],
    \"provider\": {
      \"id\": \"demo-provider-1\",
      \"name\": \"東京センサーステーション\"
    }
  }" | jq '.'
echo

echo "=== テスト完了 ==="