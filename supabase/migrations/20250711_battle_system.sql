-- Create battle-related tables
CREATE TABLE IF NOT EXISTS public.battle_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('awaiting_opponent', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  winner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.battle_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES public.battle_instances(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.player_cards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_hidden BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.battle_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES public.battle_instances(id) ON DELETE CASCADE,
  winner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loser_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transferred_card_id UUID NOT NULL REFERENCES public.player_cards(id) ON DELETE CASCADE,
  bonus_card_id UUID NOT NULL REFERENCES public.player_cards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.battle_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id UUID NOT NULL REFERENCES public.battle_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create function to transfer card and complete battle
CREATE OR REPLACE FUNCTION public.transfer_card_and_complete_battle(
  p_battle_id UUID,
  p_winner_id UUID,
  p_loser_id UUID,
  p_transferred_card_id UUID,
  p_bonus_card_id UUID,
  p_explanation TEXT
) RETURNS VOID AS $$
BEGIN
  -- Update the transferred card's ownership
  UPDATE public.player_cards
  SET player_id = p_winner_id
  WHERE id = p_transferred_card_id;
  
  -- Update battle status to completed
  UPDATE public.battle_instances
  SET 
    status = 'completed',
    winner_id = p_winner_id,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_battle_id;
  
  -- Create battle result record
  INSERT INTO public.battle_results (
    battle_id,
    winner_id,
    loser_id,
    explanation,
    transferred_card_id,
    bonus_card_id
  ) VALUES (
    p_battle_id,
    p_winner_id,
    p_loser_id,
    p_explanation,
    p_transferred_card_id,
    p_bonus_card_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check and resolve battles automatically
CREATE OR REPLACE FUNCTION public.check_and_resolve_battle() RETURNS TRIGGER AS $$
DECLARE
  card_count INTEGER;
  battle_status TEXT;
BEGIN
  -- Check if this is the second card for this battle
  SELECT COUNT(*) INTO card_count
  FROM public.battle_cards
  WHERE battle_id = NEW.battle_id;
  
  IF card_count = 2 THEN
    -- Get the battle status
    SELECT status INTO battle_status
    FROM public.battle_instances
    WHERE id = NEW.battle_id;
    
    -- If battle is awaiting opponent, update to in_progress
    IF battle_status = 'awaiting_opponent' THEN
      UPDATE public.battle_instances
      SET 
        status = 'in_progress',
        updated_at = NOW()
      WHERE id = NEW.battle_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check and resolve battles when cards are added
CREATE TRIGGER battle_card_added
AFTER INSERT ON public.battle_cards
FOR EACH ROW
EXECUTE FUNCTION public.check_and_resolve_battle();

-- Create RLS policies for battle tables
ALTER TABLE public.battle_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_notifications ENABLE ROW LEVEL SECURITY;

-- Battle instances policies
CREATE POLICY "Users can view all battle instances"
  ON public.battle_instances FOR SELECT
  USING (true);

CREATE POLICY "Users can create battle instances"
  ON public.battle_instances FOR INSERT
  WITH CHECK (challenger_id = auth.uid());

-- Battle cards policies
CREATE POLICY "Users can view all battle cards"
  ON public.battle_cards FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own battle cards"
  ON public.battle_cards FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Battle results policies
CREATE POLICY "Users can view all battle results"
  ON public.battle_results FOR SELECT
  USING (true);

-- Battle notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.battle_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.battle_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
