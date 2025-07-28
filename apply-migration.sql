-- Apply pack queue system to existing database
-- Run this in your Supabase SQL editor

-- Add queue position and status columns to active_timers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'active_timers' 
                   AND column_name = 'queue_position') THEN
        ALTER TABLE active_timers 
        ADD COLUMN queue_position INTEGER DEFAULT 0,
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
        ADD COLUMN is_completed BOOLEAN DEFAULT FALSE,
        ADD COLUMN is_saved BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_active_timers_user_category_active 
ON active_timers(player_id, pack_type, is_active) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_active_timers_user_category_queue 
ON active_timers(player_id, pack_type, queue_position) 
WHERE is_active = FALSE AND is_completed = FALSE;

-- Update existing timers to use new schema
UPDATE active_timers 
SET 
    queue_position = 0,
    is_active = CASE WHEN status = 'active' THEN TRUE ELSE FALSE END,
    is_completed = CASE WHEN status = 'completed' THEN TRUE ELSE FALSE END,
    is_saved = FALSE
WHERE queue_position IS NULL;

-- Create or update the view for pack status
CREATE OR REPLACE VIEW user_pack_status AS
SELECT 
  player_id,
  pack_type,
  COUNT(*) FILTER (WHERE is_active = TRUE) as active_count,
  COUNT(*) FILTER (WHERE is_active = FALSE AND is_completed = FALSE) as queue_count,
  COUNT(*) FILTER (WHERE is_completed = TRUE AND is_saved = TRUE) as saved_count
FROM active_timers
WHERE is_completed = FALSE OR (is_completed = TRUE AND is_saved = TRUE)
GROUP BY player_id, pack_type;

-- Verify the migration
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'active_timers' 
AND table_schema = 'public'
ORDER BY ordinal_position;