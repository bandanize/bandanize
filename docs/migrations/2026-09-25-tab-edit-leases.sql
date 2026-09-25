-- PostgreSQL. Apply before deploying the matching backend/frontend.
-- Nullable additions preserve all existing tablatures. No user data is rewritten.
BEGIN;
ALTER TABLE tablature_model ADD COLUMN IF NOT EXISTS edit_owner_id BIGINT;
ALTER TABLE tablature_model ADD COLUMN IF NOT EXISTS edit_owner_name VARCHAR(255);
ALTER TABLE tablature_model ADD COLUMN IF NOT EXISTS edit_token VARCHAR(255);
ALTER TABLE tablature_model ADD COLUMN IF NOT EXISTS edit_expires_at TIMESTAMP WITH TIME ZONE;
COMMIT;
