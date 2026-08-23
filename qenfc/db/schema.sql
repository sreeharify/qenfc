-- qeNFC database schema
-- Run this once in the Neon SQL editor (see setup.txt, step "Set up the database").
-- Safe to re-run: every statement uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_sub TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qr_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,              -- the value that goes in the QR link, e.g. "99999"
  claim_key TEXT NOT NULL,                -- the key printed under the QR code
  claimed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolios (
  id SERIAL PRIMARY KEY,
  qr_code_id INTEGER UNIQUE NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  google_review_link TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  twitter_x TEXT,
  tiktok TEXT,
  youtube TEXT,
  linkedin TEXT,
  address TEXT,
  logo_url TEXT,
  theme_color TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Used for simple database-backed rate limiting (e.g. the QR "claim" endpoint).
CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  bucket TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits (ip, bucket, created_at);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes (code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_claimed_by ON qr_codes (claimed_by);
