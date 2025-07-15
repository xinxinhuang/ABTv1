'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function DatabaseSetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setupSchema = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create online_players table
      const { error: onlinePlayersError } = await supabase.rpc('exec_sql', {
        sql_string: `
          create table if not exists public.online_players (
            id uuid references auth.users not null primary key,
            username text not null,
            last_seen timestamp with time zone default now(),
            status text default 'online' check (status in ('online', 'in_battle', 'away'))
          );
        `
      });
      
      if (onlinePlayersError) throw onlinePlayersError;
      
      // Create battle_instances table
      const { error: battleInstancesError } = await supabase.rpc('exec_sql', {
        sql_string: `
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
        `
      });
      
      if (battleInstancesError) throw battleInstancesError;
      
      // Create battle_cards table
      const { error: battleCardsError } = await supabase.rpc('exec_sql', {
        sql_string: `
          create table if not exists public.battle_cards (
            battle_id uuid references public.battle_instances not null,
            player_id uuid references auth.users not null,
            card_id uuid references public.player_cards not null,
            is_staked boolean default true,
            selected_at timestamp with time zone default now(),
            primary key (battle_id, player_id)
          );
        `
      });
      
      if (battleCardsError) throw battleCardsError;
      
      // Create card_ownership_history table
      const { error: ownershipHistoryError } = await supabase.rpc('exec_sql', {
        sql_string: `
          create table if not exists public.card_ownership_history (
            id uuid default uuid_generate_v4() primary key,
            card_id uuid references public.player_cards not null,
            previous_owner_id uuid references auth.users not null,
            new_owner_id uuid references auth.users not null,
            battle_id uuid references public.battle_instances not null,
            transferred_at timestamp with time zone default now()
          );
        `
      });
      
      if (ownershipHistoryError) throw ownershipHistoryError;
      
      // Add original_owner_id column to player_cards
      const { error: originalOwnerError } = await supabase.rpc('exec_sql', {
        sql_string: `
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
        `
      });
      
      if (originalOwnerError) throw originalOwnerError;
      
      // Create transfer_card_atomic function
      const { error: transferFunctionError } = await supabase.rpc('exec_sql', {
        sql_string: `
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
        `
      });
      
      if (transferFunctionError) throw transferFunctionError;
      
      toast.success('Database setup completed successfully!');
      setSetupComplete(true);
    } catch (err: unknown) {
      console.error('Error setting up database:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to set up database schema';
      setError(errorMessage);
      toast.error('Failed to set up database schema');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Battle Arena Database Setup</h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Setup Database Schema</h2>
        <p className="mb-4">
          This will create all the necessary tables and functions for the Battle Arena system:
        </p>
        
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>Online player tracking</li>
          <li>Battle instances</li>
          <li>Battle card selections</li>
          <li>Card ownership history</li>
          <li>Card transfer function</li>
        </ul>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        {setupComplete ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Success!</p>
            <p>Database schema has been set up successfully. You can now use the Battle Arena.</p>
          </div>
        ) : (
          <Button 
            onClick={setupSchema} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Setting up...' : 'Setup Database Schema'}
          </Button>
        )}
        
        <div className="mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Note: This requires the <code>exec_sql</code> RPC function to be enabled in your Supabase project.
            If you encounter errors, you may need to run the schema.sql file directly in the Supabase SQL editor.
          </p>
        </div>
      </div>
      
      <div className="mt-6">
        <Button 
          variant="outline"
                        onClick={() => window.location.href = '/game/arena/lobby'}
          className="w-full"
        >
          Return to Battle Arena
        </Button>
      </div>
    </div>
  );
}
