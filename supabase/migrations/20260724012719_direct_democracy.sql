-- Add direct_democracy flag to proposals
ALTER TABLE proposals ADD COLUMN direct_democracy boolean NOT NULL DEFAULT false;
