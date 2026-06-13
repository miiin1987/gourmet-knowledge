# グルメ・おでかけナレッジ

SNSで見つけたお店や観光スポットを、**LINEで送るだけ**でかんたんに管理できるWebアプリです。

**デモ:** https://gourmet-knowledge.vercel.app

---

## 概要

「Instagramで見つけたお店、あとで絶対忘れる」という課題を解決するためのサービスです。  
LINEで写真・URL・店名を送ると、AI + Google Mapsが自動で情報を収集・整理して保存します。  
Webからはキーワード・エリア・ジャンルで検索・管理ができます。

---

## 主な機能

### LINEから登録
- **写真を送る** → AIが店名・エリアを読み取り、Google Mapsで詳細情報を取得
- **URLを送る** → Googleマップ・食べログ・InstagramなどのURLを解析して自動登録
- **店名を送る** → 候補が複数ある場合は番号で選択するだけ
- 複数ターンの会話を管理（店名が不明な場合はエリアを追加で聞く）

### Web画面
- **スポット一覧** — キーワード・エリア・ジャンル・ステータスで絞り込み・検索
- **スポット登録** — Googleマップ URLを貼るだけで自動入力
- **ステータス管理** — 「行きたい / 行った / お気に入り / 保留」を切り替え
- **詳細ページ** — 住所・電話番号・営業時間・AIレビュー要約を表示

### LINEログイン連携
- LINEログインでユーザー認証
- LINEから登録したデータとWebが自動で紐づく

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) / TypeScript / Tailwind CSS |
| バックエンド | Next.js API Routes (Edge対応) |
| データベース | Supabase (PostgreSQL) |
| 認証 | LINE Login OAuth 2.1 |
| LINE連携 | LINE Messaging API (Webhook) |
| AI | OpenAI API (GPT-4o) — 画像解析・URL解析・レビュー要約 |
| 地図・店舗情報 | Google Maps Places API |
| デプロイ | Vercel |

---

## システム構成

```
【LINEからの登録フロー】

LINE App
  │ 写真 / URL / テキスト
  ▼
LINE Messaging API
  │ Webhook
  ▼
Next.js API (/api/line/webhook)
  │
  ├─ 画像 → OpenAI Vision API → 店名・エリア抽出
  ├─ URL  → OpenAI API → 店名・エリア抽出
  └─ テキスト → 店名として処理
        │
        ▼
  Google Maps Places API
  　店舗情報取得（住所・評価・営業時間・マップURL）
  　レビュー取得 → OpenAI API で3行要約
        │
        ▼
  Supabase (spots テーブル)
        │
        ▼
  LINE Bot が登録完了を返信

【Webからの閲覧・管理フロー】

ブラウザ
  │ LINEログイン
  ▼
Next.js App
  │
  ├─ 一覧・検索 → /api/spots (GET)
  ├─ 登録       → /api/spots (POST) + /api/analyze
  └─ 更新       → /api/spots/[id] (PATCH)
        │
        ▼
  Supabase
```

---

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/miiin1987/gourmet-knowledge.git
cd gourmet-knowledge
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、以下を設定します。

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LINE Login
LINE_LOGIN_CHANNEL_ID=your_line_login_channel_id
LINE_LOGIN_CHANNEL_SECRET=your_line_login_channel_secret

# LINE Messaging API
LINE_CHANNEL_SECRET=your_messaging_api_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_messaging_api_access_token

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 3. Supabaseスキーマの実行

Supabase の SQL Editor で `supabase/schema.sql` を実行します。

### 4. LINE Developersの設定

**LINEログインチャネル**
- コールバックURL: `https://your-domain.vercel.app/api/auth/line/callback`

**Messaging APIチャネル**
- Webhook URL: `https://your-domain.vercel.app/api/line/webhook`
- Webhookの利用: オン

### 5. 起動

```bash
npm run dev
```

http://localhost:3000 を開きます。

---

## 工夫した点

### LINEの非同期処理
LINE Webhookは5秒以内に200を返さないとリトライが発生します。  
`@vercel/functions` の `waitUntil` を使い、即座にレスポンスを返しつつバックグラウンドでAI・Maps処理を実行しています。

```ts
await replyToLine(replyToken, [buildProcessingMessage()])  // 即座に「処理中...」を返信
waitUntil(handleLineEvent(event, lineUserId))              // AI処理はバックグラウンドで
```

### 複数ターン会話の状態管理
店名だけ送られてきた場合にエリアを追加で聞く、複数の候補がある場合に番号選択を促すなど、複数ターンの会話を `line_conversations` テーブルで状態管理しています。

### コールバックURLの自動生成
LINE OAuthのコールバックURLをリクエストのホストから動的に生成することで、ローカル・本番の切り替え時に環境変数の設定ミスが起きない設計にしています。

---

## ディレクトリ構成

```
src/
├── app/
│   ├── api/
│   │   ├── auth/line/          # LINEログイン・コールバック
│   │   ├── line/webhook/       # LINE Messaging API Webhook
│   │   ├── spots/              # スポットCRUD API
│   │   └── analyze/            # URL解析API
│   ├── login/                  # ログインページ
│   ├── register/               # スポット登録ページ
│   └── spots/[id]/             # スポット詳細ページ
├── components/
│   ├── SpotListPage.tsx         # 一覧・検索
│   ├── RegisterForm.tsx         # 登録フォーム
│   └── SpotDetailClient.tsx     # 詳細表示
└── lib/
    ├── supabase/                # Supabaseクライアント
    ├── spot-processor.ts        # 登録フロー制御
    ├── google-maps.ts           # Places API
    └── line.ts                  # LINE API ユーティリティ
```
