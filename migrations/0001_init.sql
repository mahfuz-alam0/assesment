CREATE TABLE dealerships (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE vehicles (
  id INTEGER PRIMARY KEY,
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_vehicles_dealership ON vehicles(dealership_id);
