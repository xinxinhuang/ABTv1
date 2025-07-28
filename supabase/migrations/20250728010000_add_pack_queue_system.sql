-- Add pack queue system to support single active timer + queue up to 5 per category

-- Add queue position and status columns to active_timers
ALTER TABLE active_timers 
ADD COLUMN IF NOT EXISTS queue_position INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE;

-- Create index for efficient querying of active timers and queues
CREATE INDEX IF NOT EXISTS idx_active_timers_user_category_active 
ON active_timers(player_id, pack_type, is_active) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_active_timers_user_category_queue 
ON active_timers(player_id, pack_type, queue_position) 
WHERE is_active = FALSE AND is_completed = FALSE;

-- Create a view to get current status per category
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