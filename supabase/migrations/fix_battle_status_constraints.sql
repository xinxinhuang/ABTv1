-- Fix Battle Status Constraints for V2 System
-- This migration fixes the status constraint mismatch between database and edge functions

-- First, update any existing battles with old status values
UPDATE public.battle_instances 
SET status = 'active' 
WHERE status = 'awaiting_opponent';

UPDATE public.battle_instances 
SET status = 'cards_revealed' 
WHERE status = 'in_progress';

-- Drop the old constraint
ALTER TABLE public.battle_instances 
DROP CONSTRAINT IF EXISTS battle_instances_status_check;

-- Add the new constraint with all required status values for V2 system
ALTER TABLE public.battle_instances 
ADD CONSTRAINT battle_instances_status_check 
CHECK (status IN ('pending', 'awaiting_opponent', 'active', 'cards_revealed', 'in_progress', 'completed', 'cancelled', 'declined'));

-- Add explanation column if it doesn't exist (for battle resolution details)
ALTER TABLE public.battle_instances 
ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_battle_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_battle_instances_updated_at ON public.battle_instances;
CREATE TRIGGER update_battle_instances_updated_at
    BEFORE UPDATE ON public.battle_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_battle_instances_updated_at();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_battle_instances_status ON public.battle_instances(status);
CREATE INDEX IF NOT EXISTS idx_battle_instances_challenger ON public.battle_instances(challenger_id);
CREATE INDEX IF NOT EXISTS idx_battle_instances_opponent ON public.battle_instances(opponent_id);
CREATE INDEX IF NOT EXISTS idx_battle_cards_battle_id ON public.battle_cards(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_cards_player_id ON public.battle_cards(player_id);

-- Add notifications table if it doesn't exist (for battle results)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  reference_id UUID,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add card ownership history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.card_ownership_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES public.player_cards(id) ON DELETE CASCADE,
  previous_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transfer_type TEXT NOT NULL DEFAULT 'battle_win',
  battle_id UUID REFERENCES public.battle_instances(id) ON DELETE SET NULL,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_ownership_history ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policies for card ownership history
CREATE POLICY "Users can view card ownership history for their cards" 
  ON public.card_ownership_history FOR SELECT 
  USING (auth.uid() = previous_owner_id OR auth.uid() = new_owner_id);

-- Add comment to document the current battle flow
COMMENT ON TABLE public.battle_instances IS 'Battle instances for V2 system with proper status flow: awaiting_opponent -> active -> cards_revealed -> completed';