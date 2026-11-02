-- Additive upgrade; the private Worker checks column presence before applying it.
ALTER TABLE "User" ADD COLUMN "billingCheckout" TEXT CHECK ("billingCheckout" IS NULL OR json_valid("billingCheckout"));
