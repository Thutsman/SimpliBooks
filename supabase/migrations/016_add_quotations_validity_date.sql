-- Ensure validity_date exists on quotations (fix for schema cache / older deployments)
-- The app sends validity_date (mapped from form "Expiry Date"); 005 defines it but some projects may lack it.

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS validity_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days');

UPDATE quotations SET validity_date = COALESCE(validity_date, issue_date + INTERVAL '30 days') WHERE validity_date IS NULL;

ALTER TABLE quotations ALTER COLUMN validity_date SET NOT NULL;
