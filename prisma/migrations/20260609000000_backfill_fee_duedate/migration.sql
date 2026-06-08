UPDATE "Fee"
SET "dueDate" = 
  CASE 
    WHEN "type" = 'MONTHLY' THEN date_trunc('month', NOW()) + INTERVAL '1 month' + INTERVAL '1 day'
    ELSE NOW() + INTERVAL '30 days'
  END
WHERE "dueDate" IS NULL;
