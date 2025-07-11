-- Online player tracking
create table if not exists public.online_players (
  id uuid references auth.users not null primary key,
  username text not null,
  last_seen timestamp with time zone default now(),
  status text default 'online' check (status in ('online', 'in_battle', 'away'))
);

-- Battle instances
create table if not exists public.battle_instances (
  id uuid default uuid_generate_v4() primary key,
  player1_id uuid references auth.users not null,
  player2_id uuid references auth.users not null,
  status text default 'pending' check (status in ('pending', 'selecting', 'active', 'completed')),
  winner_id uuid references auth.users,
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  transfer_completed boolean default false
);

-- Battle card selections
create table if not exists public.battle_cards (
  battle_id uuid references public.battle_instances not null,
  player_id uuid references auth.users not null,
  card_id uuid references public.player_cards not null,
  is_staked boolean default true,
  selected_at timestamp with time zone default now(),
  primary key (battle_id, player_id)
);

-- Card ownership history
create table if not exists public.card_ownership_history (
  id uuid default uuid_generate_v4() primary key,
  card_id uuid references public.player_cards not null,
  previous_owner_id uuid references auth.users not null,
  new_owner_id uuid references auth.users not null,
  battle_id uuid references public.battle_instances not null,
  transferred_at timestamp with time zone default now()
);

-- Add original_owner_id column to player_cards if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                where table_schema = 'public' 
                and table_name = 'player_cards' 
                and column_name = 'original_owner_id') then
    alter table public.player_cards add column original_owner_id uuid references auth.users;
    
    -- Set existing cards' original_owner_id to current owner
    update public.player_cards set original_owner_id = player_id where original_owner_id is null;
  end if;
end $$;

-- Function for atomic card transfer
create or replace function public.transfer_card_atomic(
  battle_id uuid,
  winner_id uuid,
  loser_id uuid,
  card_id uuid
) returns void as $$
begin
  -- Check if battle is actually completed and winner is correct
  if not exists (
    select 1 from battle_instances 
    where id = battle_id and winner_id = winner_id and status = 'completed'
  ) then
    raise exception 'Invalid battle state for transfer';
  end if;
  
  -- Check if transfer already completed
  if exists (
    select 1 from battle_instances
    where id = battle_id and transfer_completed = true
  ) then
    raise exception 'Card transfer already completed';
  end if;
  
  -- Atomic transfer with ownership history
  update player_cards set player_id = winner_id where id = card_id;
  
  insert into card_ownership_history (
    card_id, previous_owner_id, new_owner_id, battle_id
  ) values (
    card_id, loser_id, winner_id, battle_id
  );
  
  -- Mark transfer as completed
  update battle_instances set transfer_completed = true where id = battle_id;
end;
$$ language plpgsql;
