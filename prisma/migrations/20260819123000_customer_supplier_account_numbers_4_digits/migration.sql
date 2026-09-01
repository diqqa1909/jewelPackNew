WITH customer_numbers AS (
  SELECT
    "id",
    "accountNumber" AS old_number,
    'CUST-' || LPAD("id"::text, 4, '0') AS new_number
  FROM "Customer"
  WHERE "accountNumber" ~ '^CUST-0*[0-9]+$'
)
UPDATE "transactions" t
SET "account_number" = c.new_number
FROM customer_numbers c
WHERE t."account_number" = c.old_number;

WITH customer_numbers AS (
  SELECT
    "id",
    "accountNumber" AS old_number,
    'CUST-' || LPAD("id"::text, 4, '0') AS new_number
  FROM "Customer"
  WHERE "accountNumber" ~ '^CUST-0*[0-9]+$'
)
UPDATE "cash_book" cb
SET "account_no" = c.new_number
FROM customer_numbers c
WHERE cb."account_type" = 'DR'
  AND cb."account_id" = c."id"
  AND cb."account_no" = c.old_number;

UPDATE "Customer"
SET "accountNumber" = 'CUST-' || LPAD("id"::text, 4, '0')
WHERE "accountNumber" ~ '^CUST-0*[0-9]+$';

WITH supplier_numbers AS (
  SELECT
    "id",
    "accountNumber" AS old_number,
    'SUP-' || LPAD("id"::text, 4, '0') AS new_number
  FROM "Supplier"
  WHERE "accountNumber" ~ '^SUP-0*[0-9]+$'
)
UPDATE "transactions" t
SET "account_number" = s.new_number
FROM supplier_numbers s
WHERE t."account_number" = s.old_number;

WITH supplier_numbers AS (
  SELECT
    "id",
    "accountNumber" AS old_number,
    'SUP-' || LPAD("id"::text, 4, '0') AS new_number
  FROM "Supplier"
  WHERE "accountNumber" ~ '^SUP-0*[0-9]+$'
)
UPDATE "cash_book" cb
SET "account_no" = s.new_number
FROM supplier_numbers s
WHERE cb."account_type" = 'CR'
  AND cb."account_id" = s."id"
  AND cb."account_no" = s.old_number;

UPDATE "Supplier"
SET "accountNumber" = 'SUP-' || LPAD("id"::text, 4, '0')
WHERE "accountNumber" ~ '^SUP-0*[0-9]+$';
