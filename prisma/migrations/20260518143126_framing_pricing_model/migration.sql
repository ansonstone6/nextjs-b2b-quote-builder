-- Framing-specific pricing model: per-linear-foot moulding, per-sq-ft glass/mat,
-- supplier + profile + stock metadata on mouldings.

ALTER TYPE "OptionModifierType" ADD VALUE IF NOT EXISTS 'area';
ALTER TYPE "PricingRuleType" ADD VALUE IF NOT EXISTS 'base_per_perimeter';

ALTER TABLE "materials"
  ADD COLUMN "price_per_foot" DECIMAL(14,4),
  ADD COLUMN "supplier" TEXT,
  ADD COLUMN "profile_width_inches" DECIMAL(6,3),
  ADD COLUMN "in_stock" BOOLEAN NOT NULL DEFAULT TRUE;
