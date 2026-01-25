-- Add banking details columns to companies table
-- Run this in Supabase SQL Editor

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_branch_code TEXT,
ADD COLUMN IF NOT EXISTS bank_swift_code TEXT,
ADD COLUMN IF NOT EXISTS bank_reference TEXT;

-- Add comment for documentation
COMMENT ON COLUMN companies.bank_name IS 'Name of the bank (e.g., FNB, Standard Bank, ABSA)';
COMMENT ON COLUMN companies.bank_account_name IS 'Account holder name as registered with bank';
COMMENT ON COLUMN companies.bank_account_number IS 'Bank account number';
COMMENT ON COLUMN companies.bank_branch_code IS 'Branch code / Sort code';
COMMENT ON COLUMN companies.bank_swift_code IS 'SWIFT/BIC code for international transfers';
COMMENT ON COLUMN companies.bank_reference IS 'Default payment reference to show on invoices';
