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

-- Update the start_timer_for_pack function to handle queue system
CREATE OR REPLACE FUNCTION start_timer_for_pack(
  p_player_id UUID,
  p_pack_type TEXT,
  p_delay_hours INT
)
RETURNS TABLE(timer_id UUID, queue_position INTEGER, is_active BOOLEAN) AS $$
DECLARE
  active_count INTEGER;
  queue_count INTEGER;
  new_queue_position INTEGER;
  new_timer_id UUID;
BEGIN
  -- Check current active timers for this category
  SELECT COUNT(*) INTO active_count
  FROM active_timers 
  WHERE player_id = p_player_id AND pack_type = p_pack_type AND is_active = TRUE;

  -- Check current queue size for this category
  SELECT COUNT(*) INTO queue_count
  FROM active_timers 
  WHERE player_id = p_player_id AND pack_type = p_pack_type 
    AND is_active = FALSE AND is_completed = FALSE;

  -- Enforce limits: 1 active max, 5 total (active + queue)
  IF active_count >= 1 THEN
    RAISE EXCEPTION 'An active timer already exists for % packs. Please wait for it to complete.', p_pack_type;
  END IF;

  IF (active_count + queue_count) >= 5 THEN
    RAISE EXCEPTION 'Maximum queue limit reached. You can only queue up to 5 % boosters at a time.', p_pack_type;
  END IF;

  -- Calculate queue position (0 for active, 1+ for queued)
  IF active_count = 0 THEN
    new_queue_position := 0;
  ELSE
    new_queue_position := queue_count + 1;
  END IF;

  -- Create new timer
  new_timer_id := gen_random_uuid();
  
  INSERT INTO active_timers (
    id, player_id, pack_type, start_time, target_delay_hours, 
    queue_position, is_active, is_completed, is_saved
  ) VALUES (
    new_timer_id, p_player_id, p_pack_type, NOW(), p_delay_hours,
    new_queue_position, new_queue_position = 0, FALSE, FALSE
  );

  -- Return the created timer details
  RETURN QUERY SELECT new_timer_id, new_queue_position, new_queue_position = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a timer and activate next in queue
CREATE OR REPLACE FUNCTION complete_timer_and_next(
  p_timer_id UUID,
  p_player_id UUID,
  p_should_activate_next BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
DECLARE
  completed_pack_type TEXT;
  next_timer_id UUID;
BEGIN
  -- Mark current timer as completed
  UPDATE active_timers 
  SET is_completed = TRUE, is_active = FALSE, is_saved = TRUE
  WHERE id = p_timer_id AND player_id = p_player_id;

  -- If we should activate next in queue, find and activate it
  IF p_should_activate_next THEN
    SELECT pack_type INTO completed_pack_type
    FROM active_timers WHERE id = p_timer_id;

    SELECT id INTO next_timer_id
    FROM active_timers
    WHERE player_id = p_player_id AND pack_type = completed_pack_type 
      AND is_active = FALSE AND is_completed = FALSE
    ORDER BY queue_position ASC
    LIMIT 1;

    IF next_timer_id IS NOT NULL THEN
      UPDATE active_timers 
      SET is_active = TRUE, queue_position = 0, start_time = NOW()
      WHERE id = next_timer_id;

      -- Update queue positions
      UPDATE active_timers 
      SET queue_position = queue_position - 1
      WHERE player_id = p_player_id AND pack_type = completed_pack_type 
        AND is_active = FALSE AND is_completed = FALSE;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;