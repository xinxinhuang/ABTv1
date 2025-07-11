-- Add get_or_create_inventory function
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
