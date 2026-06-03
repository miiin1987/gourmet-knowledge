-- ユーザーテーブル（LINEログインで管理）
create table users (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique not null,
  display_name text,
  picture_url text,
  created_at timestamptz not null default now()
);

-- スポットテーブル
create type spot_status as enum ('want_to_go', 'visited', 'favorite', 'pending');
create type spot_genre as enum (
  'restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway',
  'tourist_attraction', 'park', 'museum', 'shopping_mall',
  'night_club', 'spa', 'other'
);

create table spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  business_hours text,
  rating numeric(3,1),
  review_count integer,
  google_maps_url text,
  lat numeric(10,7),
  lng numeric(10,7),
  genre spot_genre,
  area text,
  ai_summary text[],
  memo text,
  source_image_url text,
  source_url text,
  status spot_status not null default 'want_to_go',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 更新日時を自動更新するトリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger spots_updated_at
  before update on spots
  for each row execute function update_updated_at();

-- LINE会話状態テーブル（複数ターンの会話管理）
create table line_conversations (
  line_user_id text primary key,
  state text not null,
  extracted_name text,
  candidates jsonb,
  created_at timestamptz not null default now()
);

-- インデックス
create index spots_user_id_idx on spots(user_id);
create index spots_status_idx on spots(user_id, status);
create index spots_genre_idx on spots(user_id, genre);
create index spots_area_idx on spots(user_id, area);
create index spots_rating_idx on spots(user_id, rating desc nulls last);
create index spots_created_at_idx on spots(user_id, created_at desc);

-- RLS（Row Level Security）は無効にしてサービスロールキーで操作
-- ※ 必要に応じて有効化してください
alter table users disable row level security;
alter table spots disable row level security;
alter table line_conversations disable row level security;
