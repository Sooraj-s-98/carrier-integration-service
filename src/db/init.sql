-- Enable UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================
-- USERS
-- ======================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ======================
-- CARRIERS MASTER
-- ======================
CREATE TABLE IF NOT EXISTS carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- ======================
-- USER ↔ CARRIER ACCOUNTS
-- ======================
CREATE TABLE IF NOT EXISTS user_carrier_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  carrier_code TEXT NOT NULL
    REFERENCES carriers(code),

  external_account_id TEXT,

  access_token TEXT,
  refresh_token TEXT,

  token_expires_at TIMESTAMP,
  refresh_expires_at TIMESTAMP,

  scope TEXT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, carrier_code)
);

-- ======================
-- SEED CARRIERS
-- ======================
INSERT INTO carriers (code, name)
VALUES
('ups','UPS'),
('fedex','FedEx'),
('dhl','DHL'),
('usps','USPS')
ON CONFLICT (code) DO NOTHING;
