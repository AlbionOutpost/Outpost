-- Preserve existing accounts and subscription mappings; new checkout intents start absent.
ALTER TABLE "User" ADD COLUMN "billingCheckout" JSONB;
