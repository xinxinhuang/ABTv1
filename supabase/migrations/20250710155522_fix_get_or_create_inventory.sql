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
  v_humanoid INT;
  v_weapon INT;
  v_inventory_exists BOOLEAN;
BEGIN
  -- Check if inventory exists
  SELECT EXISTS (
    SELECT 1 FROM public.player_inventory 
    WHERE player_id = p_player_id
  ) INTO v_inventory_exists;
  
  -- If inventory exists, return it
  IF v_inventory_exists THEN
    SELECT pi.humanoid_packs, pi.weapon_packs
    INTO v_humanoid, v_weapon
    FROM public.player_inventory pi
    WHERE pi.player_id = p_player_id
    FOR UPDATE;
    
    humanoid_packs := v_humanoid;
    weapon_packs := v_weapon;
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
  INTO v_humanoid, v_weapon;
  
  humanoid_packs := v_humanoid;
  weapon_packs := v_weapon;
  RETURN NEXT;
END;
$$;
