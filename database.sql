-- Drop existing tables to start fresh
DROP TABLE IF EXISTS pack_opening_history, active_timers, player_cards, player_inventory, profiles CASCADE;

-- Profiles Table: Stores user data linked to authentication
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Inventory: Tracks how many packs each player has
CREATE TABLE player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  humanoid_packs INT NOT NULL DEFAULT 0,
  weapon_packs INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT player_inventory_player_id_key UNIQUE (player_id)
);

-- Player Cards: Stores all cards collected by players
CREATE TABLE player_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL, -- 'humanoid' or 'weapon'
  card_name TEXT NOT NULL,
  attributes JSONB NOT NULL,
  rarity TEXT NOT NULL, -- 'grey', 'blue', or 'gold'
  obtained_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active Timers: Manages ongoing pack-opening timers
CREATE TABLE active_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pack_type TEXT NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  target_delay_hours INT NOT NULL,
  status TEXT DEFAULT 'active' -- 'active', 'ready', 'completed'
);

-- Pack Opening History: Logs every pack opening event
CREATE TABLE pack_opening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pack_type TEXT NOT NULL,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  cards_received JSONB NOT NULL
);

-- Indexes for performance
CREATE INDEX ON player_inventory (player_id);
CREATE INDEX ON player_cards (player_id);
CREATE INDEX ON active_timers (player_id);
CREATE INDEX ON pack_opening_history (player_id);

-- Function to start a timer and consume a pack atomically
CREATE OR REPLACE FUNCTION start_timer_for_pack(
  p_player_id UUID,
  p_pack_column TEXT,
  p_delay_hours INT
)
RETURNS VOID AS $$
DECLARE
  current_packs INT;
BEGIN
  -- Check current pack count
  EXECUTE format('SELECT %I FROM player_inventory WHERE player_id = %L', p_pack_column, p_player_id) INTO current_packs;

  IF current_packs IS NULL OR current_packs < 1 THEN
    RAISE EXCEPTION 'Not enough packs';
  END IF;

  -- Decrement pack count
  EXECUTE format('UPDATE player_inventory SET %I = %I - 1, updated_at = NOW() WHERE player_id = %L', p_pack_column, p_pack_column, p_player_id);

  -- Insert new timer
  INSERT INTO active_timers (player_id, pack_type, target_delay_hours)
  VALUES (p_player_id, SPLIT_PART(p_pack_column, '_', 1), p_delay_hours);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Insert initial inventory
  INSERT INTO public.player_inventory (player_id, humanoid_packs, weapon_packs)
  VALUES (NEW.id, 1, 0); -- Give 1 free humanoid pack
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create inventory for a player
CREATE OR REPLACE FUNCTION public.get_or_create_inventory(
  p_player_id UUID,
  p_pack_type TEXT
) 
RETURNS TABLE (humanoid_packs INT, weapon_packs INT) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert a new inventory if it doesn't exist
  -- This uses ON CONFLICT DO NOTHING to handle race conditions
  INSERT INTO public.player_inventory (player_id, humanoid_packs, weapon_packs)
  VALUES (p_player_id, 1, 0) -- Default values
  ON CONFLICT (player_id) DO NOTHING;
  
  -- Now return the inventory (either existing or newly created)
  RETURN QUERY 
  SELECT 
    COALESCE(pi.humanoid_packs, 0) as humanoid_packs,
    COALESCE(pi.weapon_packs, 0) as weapon_packs
  FROM public.player_inventory pi
  WHERE pi.player_id = p_player_id
  FOR UPDATE; -- Lock the row for the rest of the transaction
  
  IF NOT FOUND THEN
    -- This should never happen, but just in case
    RAISE EXCEPTION 'Failed to create or retrieve inventory for player %', p_player_id;
  END IF;
END;
$$;

-- Trigger to create profile and inventory when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_opening_history ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Players can view their own profile." 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Players can update their own profile." 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only"
  ON profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policies for player_inventory
CREATE POLICY "Players can view their own inventory." 
  ON player_inventory FOR SELECT 
  USING (auth.uid() = player_id);

CREATE POLICY "Players can insert their own inventory." 
  ON player_inventory FOR INSERT 
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update their own inventory." 
  ON player_inventory FOR UPDATE 
  USING (auth.uid() = player_id);

-- Policies for player_cards
CREATE POLICY "Players can view their own cards." ON player_cards FOR SELECT USING (auth.uid() = player_id);

-- Policies for active_timers
CREATE POLICY "Players can view their own timers." ON active_timers FOR SELECT USING (auth.uid() = player_id);

-- Policies for pack_opening_history
CREATE POLICY "Players can view their own history." ON pack_opening_history FOR SELECT USING (auth.uid() = player_id);

-- Function to safely decrement inventory
CREATE OR REPLACE FUNCTION decrement_inventory(
  p_player_id UUID,
  p_column_name TEXT,
  p_amount INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE player_inventory SET %I = GREATEST(0, %I - $1), updated_at = NOW() WHERE player_id = $2', 
                p_column_name, p_column_name)
  USING p_amount, p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a timer and update inventory in a single transaction
CREATE OR REPLACE FUNCTION create_timer_with_inventory(
  p_player_id UUID,
  p_pack_type TEXT,
  p_delay_hours INTEGER,
  p_ends_at TIMESTAMPTZ
) 
RETURNS TABLE (id UUID) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_pack_column TEXT;
  v_timer_id UUID;
  v_inventory_updated BOOLEAN;
  v_error_message TEXT;
BEGIN
  -- Determine the pack column to update
  v_pack_column := p_pack_type || '_packs';
  
  -- Check if player has enough packs
  EXECUTE format('SELECT %I > 0 FROM player_inventory WHERE player_id = $1', v_pack_column)
  INTO v_inventory_updated
  USING p_player_id;
  
  IF NOT FOUND OR NOT v_inventory_updated THEN
    RAISE EXCEPTION 'Not enough % packs', p_pack_type;
  END IF;
  
  -- Begin transaction
  BEGIN
    -- Create the timer
    INSERT INTO active_timers (
      player_id, 
      pack_type, 
      target_delay_hours, 
      status, 
      start_time, 
      ends_at
    )
    VALUES (
      p_player_id,
      p_pack_type,
      p_delay_hours,
      'active',
      NOW(),
      p_ends_at
    )
    RETURNING active_timers.id INTO v_timer_id;
    
    -- Decrement the pack count
    PERFORM decrement_inventory(p_player_id, v_pack_column, 1);
    
    -- Return the new timer ID
    RETURN QUERY SELECT v_timer_id as id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Get the error message
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RAISE EXCEPTION 'Failed to create timer: %', v_error_message;
  END;
END;
$$;

-- Function to open a pack, generate a card, and clean up the timer
CREATE OR REPLACE FUNCTION open_pack(
  p_player_id UUID,
  p_timer_id UUID
)
RETURNS TABLE(card_type TEXT, card_name TEXT, attributes JSONB, rarity TEXT) AS $$
DECLARE
  v_timer active_timers;
  v_bonus_percentage INT;
  v_generated_card RECORD;
BEGIN
  -- 1. Validate the timer
  SELECT * INTO v_timer FROM active_timers
  WHERE id = p_timer_id AND player_id = p_player_id;

  IF v_timer IS NULL THEN
    RAISE EXCEPTION 'Timer not found or does not belong to user';
  END IF;

  IF (NOW() - v_timer.start_time) < (v_timer.target_delay_hours * INTERVAL '1 hour') THEN
    RAISE EXCEPTION 'Timer is not yet ready';
  END IF;

  -- 2. Calculate bonus
  v_bonus_percentage := v_timer.target_delay_hours * 10; -- e.g., 1hr=10%, 4hr=40%, 8hr=80%

  -- 3. Generate card (This part is conceptual in SQL, actual generation is in JS)
  -- We'll assume the card data is passed in or generated by the calling code.
  -- For the sake of a complete transaction, we'll just use placeholders.

  -- The actual card generation will happen in the API route. This function
  -- will receive the generated card and just handle the DB operations.
  -- So we need to adjust the function signature.

  -- Let's redefine the function to accept the card data.
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Corrected function to handle the full pack opening transaction
CREATE OR REPLACE FUNCTION open_pack_and_get_card(
    p_player_id UUID,
    p_timer_id UUID,
    p_card_type TEXT,
    p_card_name TEXT,
    p_attributes JSONB,
    p_rarity TEXT
)
RETURNS TABLE(id UUID, player_id UUID, card_type TEXT, card_name TEXT, attributes JSONB, rarity TEXT, obtained_at TIMESTAMPTZ) AS $$
DECLARE
    v_timer active_timers;
    new_card player_cards;
    v_pack_type TEXT;
BEGIN
    -- Validate the timer
    SELECT * INTO v_timer FROM active_timers WHERE active_timers.id = p_timer_id AND active_timers.player_id = p_player_id;
    IF v_timer IS NULL THEN
        RAISE EXCEPTION 'Timer not found or does not belong to user';
    END IF;

    IF (NOW() - v_timer.start_time) < (v_timer.target_delay_hours * INTERVAL '1 hour') THEN
        RAISE EXCEPTION 'Timer is not yet ready';
    END IF;

    -- Get the pack type from the timer
    v_pack_type := v_timer.pack_type;

    -- Check and update inventory
    IF v_pack_type = 'humanoid' THEN
        UPDATE player_inventory 
        SET humanoid_packs = humanoid_packs - 1 
        WHERE player_id = p_player_id 
        AND humanoid_packs > 0
        RETURNING player_id INTO p_player_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'No humanoid packs available';
        END IF;
    ELSIF v_pack_type = 'weapon' THEN
        UPDATE player_inventory 
        SET weapon_packs = weapon_packs - 1 
        WHERE player_id = p_player_id 
        AND weapon_packs > 0
        RETURNING player_id INTO p_player_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'No weapon packs available';
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid pack type';
    END IF;

    -- Insert the new card
    INSERT INTO player_cards (player_id, card_type, card_name, attributes, rarity)
    VALUES (p_player_id, p_card_type, p_card_name, p_attributes, p_rarity)
    RETURNING * INTO new_card;

    -- Log the event
    INSERT INTO pack_opening_history (player_id, pack_type, cards_received)
    VALUES (p_player_id, v_pack_type, jsonb_build_object('cards', jsonb_build_array(to_jsonb(new_card))));

    -- Delete the timer
    DELETE FROM active_timers WHERE active_timers.id = p_timer_id;

    -- Return the newly created card
    RETURN QUERY SELECT * FROM player_cards WHERE player_cards.id = new_card.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
