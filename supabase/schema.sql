-- =====================================================
-- 食事提供記録システム Supabase スキーマ
-- 対象DB: PostgreSQL (Supabase)
-- 実行方法: Supabase ダッシュボード > SQL Editor に貼り付けて Run
-- ※ 何度実行しても安全（冪等）
-- =====================================================


-- =====================================================
-- 共通トリガー関数: updated_at の自動更新
-- =====================================================
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =====================================================
-- テーブル: residents（利用者マスタ）
-- =====================================================
create table if not exists residents (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,                  -- 利用者氏名
  office_name   text        not null,                  -- 所属事業所名
  display_order integer     not null default 0,        -- 一覧表示順
  is_active     boolean     not null default true,     -- 有効フラグ（論理削除）
  created_by    text        not null default '',       -- 作成者（職員メールアドレス）
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- updated_at 自動更新トリガー
drop trigger if exists residents_updated_at on residents;
create trigger residents_updated_at
  before update on residents
  for each row execute function update_updated_at();

comment on table  residents              is '利用者マスタ';
comment on column residents.is_active    is 'false = 論理削除済み（画面には表示しない）';
comment on column residents.created_by   is '登録した職員のメールアドレス';


-- =====================================================
-- テーブル: meal_records（食事提供記録）
-- =====================================================
create table if not exists meal_records (
  id            uuid        primary key default gen_random_uuid(),
  resident_id   uuid        not null references residents(id) on delete cascade,
  record_date   date        not null,                  -- 記録日
  breakfast     boolean     not null default false,    -- 朝食提供
  lunch         boolean     not null default false,    -- 昼食提供
  dinner        boolean     not null default false,    -- 夕食提供
  notes         text,                                  -- 備考
  created_by    text        not null default '',       -- 作成者（職員メールアドレス）
  updated_by    text        not null default '',       -- 最終更新者（職員メールアドレス）
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- 1利用者につき1日1レコードのみ許可
  unique (resident_id, record_date)
);

-- updated_at 自動更新トリガー
drop trigger if exists meal_records_updated_at on meal_records;
create trigger meal_records_updated_at
  before update on meal_records
  for each row execute function update_updated_at();

-- 月別検索・利用者別検索のインデックス
create index if not exists meal_records_record_date_idx  on meal_records(record_date);
create index if not exists meal_records_resident_id_idx  on meal_records(resident_id);

comment on table  meal_records              is '食事提供記録（1利用者1日1レコード）';
comment on column meal_records.updated_by   is '最後に記録を更新した職員のメールアドレス（監査用）';


-- =====================================================
-- Row Level Security（RLS）
-- 認証済み職員のみ全操作を許可
-- =====================================================

-- residents
alter table residents enable row level security;

drop policy if exists "residents_select" on residents;
create policy "residents_select"
  on residents for select
  to authenticated
  using (true);

drop policy if exists "residents_insert" on residents;
create policy "residents_insert"
  on residents for insert
  to authenticated
  with check (true);

drop policy if exists "residents_update" on residents;
create policy "residents_update"
  on residents for update
  to authenticated
  using (true);

-- meal_records
alter table meal_records enable row level security;

drop policy if exists "meal_records_select" on meal_records;
create policy "meal_records_select"
  on meal_records for select
  to authenticated
  using (true);

drop policy if exists "meal_records_insert" on meal_records;
create policy "meal_records_insert"
  on meal_records for insert
  to authenticated
  with check (true);

drop policy if exists "meal_records_update" on meal_records;
create policy "meal_records_update"
  on meal_records for update
  to authenticated
  using (true);

drop policy if exists "meal_records_delete" on meal_records;
create policy "meal_records_delete"
  on meal_records for delete
  to authenticated
  using (true);


-- =====================================================
-- サンプルデータ（初期動作確認用）
-- 不要な場合はこのブロックをコメントアウトしてください
-- =====================================================
-- insert into residents (name, office_name, display_order, created_by) values
--   ('山田 太郎', 'グループホームさくら', 1, 'admin@example.com'),
--   ('鈴木 花子', 'グループホームさくら', 2, 'admin@example.com'),
--   ('田中 一郎', 'グループホームひまわり', 3, 'admin@example.com')
-- on conflict do nothing;
