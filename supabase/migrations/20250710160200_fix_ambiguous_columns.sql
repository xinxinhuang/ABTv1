-- Fix for ambiguous column references in get_or_create_inventory
CREATE OR REPLACE FUNCTION public.get_or_create_inventory(
  p_player_id UUID,
  p_pack_type TEXT
) 
RETURNS TABLE (
  humanoid_packs INT, 
  weapon_packs INT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Try to get the existing inventory with FOR UPDATE to lock the row
  SELECT pi.humanoid_packs, pi.weapon_packs
  INTO v_result
  FROM public.player_inventory pi
  WHERE pi.player_id = p_player_id
  FOR UPDATE;
  
  -- If we found a record, return it
  IF FOUND THEN
    humanoid_packs := v_result.humanoid_packs;
    weapon_packs := v_result.weapon_packs;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- If we get here, create a new inventory
  INSERT INTO public.player_inventory (player_id, humanoid_packs, weapon_packs)
  VALUES (
    p_player_id, 
    CASE WHEN p_pack_type = 'humanoid' THEN 1 ELSE 0 END,
    CASE WHEN p_pack_type = 'weapon' THEN 1 ELSE 0 END
  )
  RETURNING humanoid_packs, weapon_packs
  INTO v_result;
  
  humanoid_packs := v_result.humanoid_packs;
  weapon_packs := v_result.weapon_packs;
  RETURN NEXT;
END;
$$;
