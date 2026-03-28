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
-- テーブル: staff（職員マスタ）
-- =====================================================
create table if not exists staff (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null unique,           -- 職員名
  is_active     boolean     not null default true,     -- 有効フラグ
  display_order integer     not null default 0,        -- 表示順
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists staff_updated_at on staff;
create trigger staff_updated_at
  before update on staff
  for each row execute function update_updated_at();

alter table staff enable row level security;

drop policy if exists "staff_select" on staff;
create policy "staff_select"
  on staff for select to authenticated using (true);

drop policy if exists "staff_insert" on staff;
create policy "staff_insert"
  on staff for insert to authenticated with check (true);

drop policy if exists "staff_update" on staff;
create policy "staff_update"
  on staff for update to authenticated using (true);

comment on table staff is '職員マスタ（担当者プルダウン用）';


-- =====================================================
-- テーブル: offices（事業所マスタ）
-- =====================================================
create table if not exists offices (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null unique,           -- 事業所名
  is_active     boolean     not null default true,     -- 有効フラグ（論理削除）
  created_by    text        not null default '',       -- 作成者（職員メールアドレス）
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- updated_at 自動更新トリガー
drop trigger if exists offices_updated_at on offices;
create trigger offices_updated_at
  before update on offices
  for each row execute function update_updated_at();

comment on table  offices           is '事業所マスタ';
comment on column offices.is_active is 'false = 論理削除済み（画面には表示しない）';


-- =====================================================
-- テーブル: residents（利用者マスタ）
-- =====================================================
create table if not exists residents (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,                  -- 利用者氏名
  office_id     uuid        not null references offices(id),  -- 所属事業所
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
comment on column residents.office_id    is '所属事業所（offices.id への外部キー）';
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
  notes            text,                                  -- 備考
  breakfast_staff  text        not null default '',       -- 朝食担当者名
  lunch_staff      text        not null default '',       -- 昼食担当者名
  dinner_staff     text        not null default '',       -- 夕食担当者名
  created_by       text        not null default '',       -- 作成者（職員メールアドレス）
  updated_by       text        not null default '',       -- 最終更新者
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

comment on table  meal_records                   is '食事提供記録（1利用者1日1レコード）';
comment on column meal_records.breakfast_staff   is '朝食を記録した担当者名';
comment on column meal_records.lunch_staff       is '昼食を記録した担当者名';
comment on column meal_records.dinner_staff      is '夕食を記録した担当者名';
comment on column meal_records.updated_by        is '最後に記録を更新した職員';

-- =====================================================
-- 既存DBへの列追加（schema.sql 初回実行後に追加した場合はこちらを実行）
-- =====================================================
alter table meal_records add column if not exists breakfast_staff text not null default '';
alter table meal_records add column if not exists lunch_staff      text not null default '';
alter table meal_records add column if not exists dinner_staff     text not null default '';


-- =====================================================
-- Row Level Security（RLS）
-- 認証済み職員のみ全操作を許可
-- =====================================================

-- offices
alter table offices enable row level security;

drop policy if exists "offices_select" on offices;
create policy "offices_select"
  on offices for select
  to authenticated
  using (true);

drop policy if exists "offices_insert" on offices;
create policy "offices_insert"
  on offices for insert
  to authenticated
  with check (true);

drop policy if exists "offices_update" on offices;
create policy "offices_update"
  on offices for update
  to authenticated
  using (true);

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
-- 事業所を先に登録してから、residents に office_id を指定して登録してください
-- 例:
-- insert into offices (name, created_by) values
--   ('グループホームさくら',    'admin@example.com'),
--   ('グループホームひまわり',  'admin@example.com');
--
-- insert into residents (name, office_id, display_order, created_by)
-- select '山田 太郎', id, 1, 'admin@example.com' from offices where name = 'グループホームさくら'
-- on conflict do nothing;
