-- Unknown vendor tier must remain a first-class state.
-- Does not rewrite existing CRITICAL/HIGH/MEDIUM/LOW values or IRA scoring.

ALTER TYPE "VendorTier" ADD VALUE IF NOT EXISTS 'UNRATED';
