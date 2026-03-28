# 食事提供記録システム

障がい者グループホーム向けの食事提供記録管理Webアプリケーション。

---

## 機能概要

- 職員ログイン（Supabase Auth）
- 利用者マスタ管理（登録・編集・有効/無効切替）
- 日ごとの食事提供記録入力（朝食・昼食・夕食）
- 月別クロス集計一覧表示
- CSVダウンロード（Excel対応 UTF-8 BOM付き）

---

## 技術スタック

| 項目 | 内容 |
|------|------|
| フロントエンド | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| バックエンド/DB | Supabase (PostgreSQL + Auth + RLS) |
| 認証 | Supabase Auth（メール・パスワード） |

---

## ローカル起動手順

### 前提条件

- Node.js 18以上
- npm または yarn
- Supabaseアカウント（無料で作成可能：https://supabase.com）

### 手順

#### 1. パッケージインストール

```bash
npm install
```

#### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成します。

```bash
# Windows (PowerShell)
Copy-Item .env.local.example .env.local
```

#### 3. Supabase の URL と KEY を設定

`.env.local` を開いて、以下の値を設定します（設定方法は次の「Supabase設定手順」を参照）：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### 4. 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

---

## Supabase 設定手順

### 1. プロジェクト作成

1. https://supabase.com にアクセスしてサインアップ/ログイン
2. 「New project」をクリック
3. プロジェクト名（例：`meal-record`）、データベースパスワード、リージョン（`Northeast Asia (Tokyo)`）を入力
4. 「Create new project」をクリック（作成に1〜2分かかります）

### 2. データベーステーブルの作成

1. Supabaseダッシュボードの左メニューから **SQL Editor** を開く
2. `supabase/schema.sql` の内容を貼り付けて **Run** をクリック
3. エラーなく完了することを確認する

### 3. API キーの取得

1. 左メニューの **Settings** → **API** を開く
2. 以下をコピーして `.env.local` に設定：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public キー** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. 職員アカウントの作成

1. 左メニューの **Authentication** → **Users** を開く
2. 「Invite user」または「Add user」をクリック
3. 職員のメールアドレスとパスワードを入力して作成

> ⚠️ 注意：Email Confirmations が有効の場合、確認メールが届きます。開発中は **Authentication → Settings → Email Confirmations をオフ** にすることを推奨します。

### 5. メール確認を無効化（開発時推奨）

1. **Authentication** → **Settings** を開く
2. **Email Confirmations** をオフにする
3. 「Save」をクリック

---

## デプロイ（Vercel）

1. GitHubリポジトリにプッシュ
2. https://vercel.com でリポジトリをインポート
3. 環境変数に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
4. Deploy

---

## ファイル構成

```
├── .cursor/rules/          # Cursor AIルール
├── supabase/
│   └── schema.sql          # DBスキーマ（Supabase SQLエディタに貼り付けて実行）
├── src/
│   ├── app/
│   │   ├── layout.tsx      # 共通レイアウト
│   │   ├── page.tsx        # ルート（/records へリダイレクト）
│   │   ├── login/          # ログイン画面
│   │   ├── records/        # 食事記録入力画面
│   │   ├── monthly/        # 月別一覧・CSV出力画面
│   │   └── residents/      # 利用者マスタ管理画面
│   ├── components/
│   │   ├── AppShell.tsx    # 共通シェル（ナビゲーション含む）
│   │   └── Navigation.tsx  # ヘッダーナビゲーション
│   ├── lib/
│   │   ├── supabase.ts          # クライアントサイド用Supabaseクライアント
│   │   ├── supabase-server.ts   # サーバーサイド用Supabaseクライアント
│   │   └── csv.ts               # CSV生成・ダウンロードユーティリティ
│   └── types/
│       └── index.ts        # 型定義
├── middleware.ts            # 認証ミドルウェア
├── REQUIREMENTS.md          # 要件定義書
└── README.md
```

---

## 将来の拡張について

本システムは将来的な機能追加を想定した設計になっています。

### 服薬記録の追加例

`supabase/schema.sql` に以下を追加し、`/medication` ページを作成するだけで対応できます：

```sql
create table medication_records (
  id          uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id),
  record_date date not null,
  -- 服薬項目を追加...
);
```

### 送迎記録の追加例

同様に `transport_records` テーブルを追加します。
