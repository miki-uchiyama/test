# 要件定義書：食事提供記録システム

**バージョン**: 1.0  
**作成日**: 2026-03-28  
**対象**: 障がい者グループホーム 職員向け

---

## 1. システム概要

障がい者グループホームにおいて、利用者ごとの朝食・昼食・夕食の提供状況を日次で記録・管理するWebシステム。  
職員が日々の食事記録を入力し、月次で一覧確認・CSV出力できる。

---

## 2. 利用者・利用環境

| 項目 | 内容 |
|------|------|
| 利用者 | グループホーム職員 |
| デバイス | PC・iPad（タブレット対応必須） |
| ネットワーク | インターネット接続環境 |
| ブラウザ | Chrome / Safari / Edge 最新版 |

---

## 3. 機能一覧

### 3.1 職員ログイン機能
- メールアドレス・パスワードによる認証（Supabase Auth）
- ログアウト機能
- 未認証時はログインページへリダイレクト

### 3.2 利用者マスタ管理機能
- 利用者の登録・編集・削除（論理削除）
- 登録項目：氏名、所属事業所、表示順、有効/無効フラグ
- 一覧表示（有効な利用者のみデフォルト表示）

### 3.3 食事提供記録入力機能
- 日付を指定して記録入力
- 有効な利用者全員分を一画面に表示
- 朝食・昼食・夕食ごとにチェックボックスで提供有無を記録
- 備考欄（テキスト入力）
- 登録者（ログインユーザー名）を自動セット
- 更新日時を自動記録
- 既存レコードがある場合は上書き更新

### 3.4 月別一覧表示機能
- 年月を指定して当月分の食事記録を一覧表示
- 行：利用者、列：日付 のクロス集計表示
- 各セルに朝/昼/夕の提供状況を表示
- 未記録日は空欄で識別可能

### 3.5 CSV出力機能
- 月別一覧をCSVファイルとしてダウンロード
- 文字コード：UTF-8 BOM付き（Excelで開ける形式）
- ファイル名：`食事記録_YYYY年MM月.csv`

---

## 4. 画面一覧

| No | 画面名 | パス | 概要 |
|----|--------|------|------|
| 1 | ログイン画面 | `/login` | メール・パスワード認証 |
| 2 | 食事記録入力画面 | `/records` | 日付指定で記録入力（メイン画面） |
| 3 | 月別一覧画面 | `/monthly` | 月次クロス集計表＋CSV出力 |
| 4 | 利用者マスタ管理画面 | `/residents` | 利用者の登録・編集・削除 |

---

## 5. データベース設計

### 5.1 テーブル一覧

| テーブル名 | 概要 |
|-----------|------|
| `residents` | 利用者マスタ |
| `meal_records` | 食事提供記録 |
| `offices` | 事業所マスタ（将来拡張用） |

### 5.2 residents（利用者マスタ）

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | uuid | PK, default gen_random_uuid() | 主キー |
| name | text | NOT NULL | 利用者氏名 |
| office_name | text | NOT NULL | 所属事業所名 |
| display_order | integer | NOT NULL, default 0 | 表示順 |
| is_active | boolean | NOT NULL, default true | 有効フラグ |
| created_at | timestamptz | NOT NULL, default now() | 作成日時 |
| updated_at | timestamptz | NOT NULL, default now() | 更新日時 |

### 5.3 meal_records（食事提供記録）

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | uuid | PK, default gen_random_uuid() | 主キー |
| resident_id | uuid | FK → residents.id | 利用者ID |
| record_date | date | NOT NULL | 記録日 |
| breakfast | boolean | NOT NULL, default false | 朝食提供有無 |
| lunch | boolean | NOT NULL, default false | 昼食提供有無 |
| dinner | boolean | NOT NULL, default false | 夕食提供有無 |
| notes | text | | 備考 |
| created_by | text | NOT NULL | 登録者（職員名） |
| created_at | timestamptz | NOT NULL, default now() | 作成日時 |
| updated_at | timestamptz | NOT NULL, default now() | 更新日時 |

**ユニーク制約**: `(resident_id, record_date)` — 1利用者1日1レコード

---

## 6. 非機能要件

| 項目 | 要件 |
|------|------|
| レスポンシブ対応 | iPad（768px以上）で快適に操作できること |
| タップターゲット | ボタン・チェックボックスは44px以上 |
| セキュリティ | 認証済みユーザーのみアクセス可能（RLS適用） |
| データ保護 | Supabaseの行レベルセキュリティ（RLS）を有効にする |
| 拡張性 | 将来的に服薬記録・送迎記録の追加が容易な設計 |

---

## 7. 将来拡張想定

- **服薬記録**: `medication_records` テーブルを追加（residents.id をFK）
- **送迎記録**: `transport_records` テーブルを追加（residents.id をFK）
- **多事業所対応**: `offices` テーブル正式導入、職員を事業所に紐づけ
- **PDF出力**: 月次報告書のPDF出力機能

---

## 8. 技術スタック

| 項目 | 採用技術 |
|------|---------|
| フロントエンド | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| バックエンド/DB | Supabase (PostgreSQL + Auth + RLS) |
| ホスティング | Vercel（推奨）またはローカル起動 |
| CSV出力 | ブラウザ側でのクライアント生成 |
