-- Fix battle_instances table: Add missing updated_at column and trigger
-- Run this in Supabase SQL Editor

-- Add the missing updated_at column
ALTER TABLE public.battle_instances 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update existing records to have updated_at = created_at
UPDATE public.battle_instances 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create or replace the trigger function for updated_at
CREATE OR REPLACE FUNCTION update_battle_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_battle_instances_updated_at ON public.battle_instances;

-- Create the trigger
CREATE TRIGGER update_battle_instances_updated_at
    BEFORE UPDATE ON public.battle_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_battle_instances_updated_at();

-- Verify the fix
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'battle_instances' 
AND column_name IN ('created_at', 'updated_at');

-- Test that the constraint allows the needed statuses
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'battle_instances_status_check';

SELECT 'Database fix completed successfully!' as result; 