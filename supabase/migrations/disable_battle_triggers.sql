-- Disable problematic battle triggers that are causing conflicts
-- These triggers were designed for the old battle system and are no longer needed

-- Drop the old battle card trigger that was causing conflicts
DROP TRIGGER IF EXISTS battle_card_added ON public.battle_cards;

-- Drop the old function that was checking and resolving battles
DROP FUNCTION IF EXISTS public.check_and_resolve_battle();

-- Drop any auto_resolve_battle triggers if they exist
DROP TRIGGER IF EXISTS auto_resolve_battle ON public.battle_instances;
DROP TRIGGER IF EXISTS auto_resolve_battle ON public.battle_selections;

-- Drop any auto_resolve_battle functions if they exist
DROP FUNCTION IF EXISTS public.auto_resolve_battle();

-- First, let's check and update any incompatible status values
-- Update 'pending' status to 'awaiting_opponent' (common old value)
UPDATE public.battle_instances 
SET status = 'awaiting_opponent' 
WHERE status = 'pending';

-- Update 'selecting' status to 'active' (common old value)
UPDATE public.battle_instances 
SET status = 'active' 
WHERE status = 'selecting';

-- Update 'in_progress' status to 'cards_revealed' (common old value)
UPDATE public.battle_instances 
SET status = 'cards_revealed' 
WHERE status = 'in_progress';

-- Update any other unknown status values to 'completed' (safest fallback)
UPDATE public.battle_instances 
SET status = 'completed' 
WHERE status NOT IN ('awaiting_opponent', 'active', 'cards_revealed', 'completed', 'cancelled', 'declined');

-- Now it's safe to update the check constraint
ALTER TABLE public.battle_instances 
DROP CONSTRAINT IF EXISTS battle_instances_status_check;

ALTER TABLE public.battle_instances 
ADD CONSTRAINT battle_instances_status_check 
CHECK (status IN ('awaiting_opponent', 'active', 'cards_revealed', 'completed', 'cancelled', 'declined'));

-- Add a comment to document the current battle flow
COMMENT ON TABLE public.battle_instances IS 'Battle instances are now resolved by frontend auto-resolve logic, not database triggers'; 