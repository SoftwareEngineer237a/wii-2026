-- Schéma des inscriptions numériques WOMEN INCREASE INTERNATIONAL
-- À coller dans le SQL Editor du projet Supabase.

create extension if not exists pgcrypto;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  badge_type text not null check (badge_type in ('standard', 'vip')),
  amount integer not null check (
    (badge_type = 'standard' and amount = 2000) or
    (badge_type = 'vip' and amount = 5000)
  ),
  qr_code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.registrations enable row level security;

-- L’unicité de qr_code crée déjà son index PostgreSQL. Aucune politique publique.
