import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card, ActiveTimer, BattleInstance } from '@/types/game';

interface GameState {
  // Cards
  cards: Card[];
  selectedCard: Card | null;
  
  // Timers
  activeTimers: ActiveTimer[];
  
  // Battles
  activeBattles: BattleInstance[];
  currentBattle: BattleInstance | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Filters and sorting
  cardFilters: {
    type?: 'humanoid' | 'weapon';
    rarity?: 'bronze' | 'silver' | 'gold';
    sortBy: 'name' | 'rarity' | 'obtained_at';
    sortOrder: 'asc' | 'desc';
  };
}

interface GameActions {
  // Card Management
  fetchCards: (playerId: string) => Promise<void>;
  addCard: (card: Card) => void;
  removeCard: (cardId: string) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  selectCard: (card: Card | null) => void;
  
  // Timer Management
  fetchActiveTimers: (playerId: string) => Promise<void>;
  startTimer: (packType: 'humanoid' | 'weapon', delayHours: number) => Promise<string>;
  openPack: (timerId: string) => Promise<Card>;
  removeTimer: (timerId: string) => void;
  
  // Battle Management
  fetchActiveBattles: (playerId: string) => Promise<void>;
  createBattle: (cardId: string) => Promise<string>;
  joinBattle: (battleId: string, cardId: string) => Promise<void>;
  selectBattleCard: (battleId: string, cardId: string) => Promise<void>;
  setCurrentBattle: (battle: BattleInstance | null) => void;
  
  // Filters and Sorting
  setCardFilters: (filters: Partial<GameState['cardFilters']>) => void;
  getFilteredCards: () => Card[];
  
  // State Management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

type GameStore = GameState & GameActions;

const initialState: GameState = {
  cards: [],
  selectedCard: null,
  activeTimers: [],
  activeBattles: [],
  currentBattle: null,
  isLoading: false,
  error: null,
  cardFilters: {
    sortBy: 'obtained_at',
    sortOrder: 'desc',
  },
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Card Management
      fetchCards: async (playerId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('player_cards')
            .select('*')
            .eq('player_id', playerId)
            .order('obtained_at', { ascending: false });

          if (error) throw error;

          set({ cards: data || [], isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch cards';
          set({ error: message, isLoading: false });
          toast.error(message);
        }
      },

      addCard: (card: Card) => {
        set(state => ({
          cards: [card, ...state.cards],
        }));
      },

      removeCard: (cardId: string) => {
        set(state => ({
          cards: state.cards.filter(card => card.id !== cardId),
        }));
      },

      updateCard: (cardId: string, updates: Partial<Card>) => {
        set(state => ({
          cards: state.cards.map(card => 
            card.id === cardId ? { ...card, ...updates } : card
          ),
        }));
      },

      selectCard: (card: Card | null) => {
        set({ selectedCard: card });
      },

      // Timer Management
      fetchActiveTimers: async (playerId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('active_timers')
            .select('*')
            .eq('player_id', playerId)
            .in('status', ['active', 'ready'])
            .order('start_time', { ascending: false });

          if (error) throw error;

          set({ activeTimers: data || [], isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch timers';
          set({ error: message, isLoading: false });
          toast.error(message);
        }
      },

      startTimer: async (packType: 'humanoid' | 'weapon', delayHours: number) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/timers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              packType,
              delayHours,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to start timer');
          }

          const result = await response.json();
          
          if (!result.timerId) {
            throw new Error('No timer ID returned from server');
          }

          // Refresh timers
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await get().fetchActiveTimers(user.id);
          }

          set({ isLoading: false });
          toast.success(`Timer started! Pack will be ready in ${delayHours} hours.`);
          
          return result.timerId;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to start timer';
          set({ error: message, isLoading: false });
          toast.error(message);
          throw error;
        }
      },

      openPack: async (timerId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/timers/open', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ timerId }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to open pack');
          }

          const newCard = await response.json();
          
          // Add the new card to the store
          get().addCard(newCard);
          
          // Remove the timer
          get().removeTimer(timerId);
          
          set({ isLoading: false });
          toast.success('Pack opened successfully!');
          
          return newCard;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to open pack';
          set({ error: message, isLoading: false });
          toast.error(message);
          throw error;
        }
      },

      removeTimer: (timerId: string) => {
        set(state => ({
          activeTimers: state.activeTimers.filter(timer => timer.id !== timerId),
        }));
      },

      // Battle Management
      fetchActiveBattles: async (playerId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('battle_instances')
            .select('*')
            .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
            .in('status', ['pending', 'selecting', 'active'])
            .order('created_at', { ascending: false });

          if (error) throw error;

          set({ activeBattles: data || [], isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch battles';
          set({ error: message, isLoading: false });
          toast.error(message);
        }
      },

      createBattle: async (cardId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('You must be logged in to create a battle');

          // Create battle instance
          const { data: battleData, error: battleError } = await supabase
            .from('battle_instances')
            .insert({
              player1_id: user.id,
              player2_id: user.id, // Temporary, will be updated when opponent joins
              status: 'pending',
            })
            .select()
            .single();

          if (battleError || !battleData) {
            throw new Error('Failed to create battle');
          }

          // Add card to battle
          const { error: cardError } = await supabase
            .from('battle_cards')
            .insert({
              battle_id: battleData.id,
              player_id: user.id,
              card_id: cardId,
              is_staked: true,
            });

          if (cardError) {
            throw new Error('Failed to add card to battle');
          }

          // Refresh battles
          await get().fetchActiveBattles(user.id);

          set({ isLoading: false });
          toast.success('Battle created successfully!');
          
          return battleData.id;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create battle';
          set({ error: message, isLoading: false });
          toast.error(message);
          throw error;
        }
      },

      joinBattle: async (battleId: string, cardId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('You must be logged in to join a battle');

          // Update battle to add player2
          const { error: battleError } = await supabase
            .from('battle_instances')
            .update({
              player2_id: user.id,
              status: 'selecting',
            })
            .eq('id', battleId);

          if (battleError) {
            throw new Error('Failed to join battle');
          }

          // Add card to battle
          const { error: cardError } = await supabase
            .from('battle_cards')
            .insert({
              battle_id: battleId,
              player_id: user.id,
              card_id: cardId,
              is_staked: true,
            });

          if (cardError) {
            throw new Error('Failed to add card to battle');
          }

          // Refresh battles
          await get().fetchActiveBattles(user.id);

          set({ isLoading: false });
          toast.success('Joined battle successfully!');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to join battle';
          set({ error: message, isLoading: false });
          toast.error(message);
          throw error;
        }
      },

      selectBattleCard: async (battleId: string, cardId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('You must be logged in to select a card');

          const { error } = await supabase
            .from('battle_cards')
            .insert({
              battle_id: battleId,
              player_id: user.id,
              card_id: cardId,
              is_staked: true,
            });

          if (error) throw error;

          set({ isLoading: false });
          toast.success('Card selected for battle!');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to select card';
          set({ error: message, isLoading: false });
          toast.error(message);
          throw error;
        }
      },

      setCurrentBattle: (battle: BattleInstance | null) => {
        set({ currentBattle: battle });
      },

      // Filters and Sorting
      setCardFilters: (filters: Partial<GameState['cardFilters']>) => {
        set(state => ({
          cardFilters: { ...state.cardFilters, ...filters },
        }));
      },

      getFilteredCards: () => {
        const { cards, cardFilters } = get();
        let filteredCards = [...cards];

        // Apply type filter
        if (cardFilters.type) {
          filteredCards = filteredCards.filter(card => card.card_type === cardFilters.type);
        }

        // Apply rarity filter
        if (cardFilters.rarity) {
          filteredCards = filteredCards.filter(card => card.rarity === cardFilters.rarity);
        }

        // Apply sorting
        filteredCards.sort((a, b) => {
          const { sortBy, sortOrder } = cardFilters;
          let aValue: string | number;
          let bValue: string | number;

          switch (sortBy) {
            case 'name':
              aValue = a.card_name.toLowerCase();
              bValue = b.card_name.toLowerCase();
              break;
            case 'rarity':
              const rarityOrder = { bronze: 1, silver: 2, gold: 3 };
              aValue = rarityOrder[a.rarity];
              bValue = rarityOrder[b.rarity];
              break;
            case 'obtained_at':
              aValue = new Date(a.obtained_at).getTime();
              bValue = new Date(b.obtained_at).getTime();
              break;
            default:
              aValue = a.card_name.toLowerCase();
              bValue = b.card_name.toLowerCase();
          }

          if (sortOrder === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          }
        });

        return filteredCards;
      },

      // State Management
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    }),
    {
      name: 'game-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cards: state.cards,
        activeTimers: state.activeTimers,
        cardFilters: state.cardFilters,
      }),
    }
  )
);

// Selectors for common use cases
export const useCards = () => useGameStore((state) => state.cards);
export const useSelectedCard = () => useGameStore((state) => state.selectedCard);
export const useActiveTimers = () => useGameStore((state) => state.activeTimers);
export const useActiveBattles = () => useGameStore((state) => state.activeBattles);
export const useCurrentBattle = () => useGameStore((state) => state.currentBattle);
export const useGameLoading = () => useGameStore((state) => state.isLoading);
export const useGameError = () => useGameStore((state) => state.error);
export const useCardFilters = () => useGameStore((state) => state.cardFilters);
export const useFilteredCards = () => useGameStore((state) => state.getFilteredCards());
