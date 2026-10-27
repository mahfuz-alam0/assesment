-- drops everything incl. wrangler's migration log so `db:migrate` rebuilds the schema
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS dealerships;
DROP TABLE IF EXISTS d1_migrations;
