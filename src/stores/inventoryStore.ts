import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PlayerInventory {
  id: string;
  player_id: string;
  humanoid_packs: number;
  weapon_packs: number;
  updated_at: string;
}

interface InventoryState {
  inventory: PlayerInventory | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface InventoryActions {
  // Inventory Management
  fetchInventory: (playerId: string) => Promise<void>;
  updateInventory: (updates: Partial<Pick<PlayerInventory, 'humanoid_packs' | 'weapon_packs'>>) => Promise<void>;
  
  // Pack Management
  addPacks: (type: 'humanoid' | 'weapon', amount: number) => Promise<void>;
  removePacks: (type: 'humanoid' | 'weapon', amount: number) => Promise<void>;
  
  // Utility Methods
  hasEnoughPacks: (type: 'humanoid' | 'weapon', amount: number) => boolean;
  getTotalPacks: () => number;
  getPackCount: (type: 'humanoid' | 'weapon') => number;
  
  // State Management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

type InventoryStore = InventoryState & InventoryActions;

const initialState: InventoryState = {
  inventory: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Inventory Management
      fetchInventory: async (playerId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('player_inventory')
            .select('*')
            .eq('player_id', playerId)
            .single();

          if (error) {
            // If no inventory exists, create one
            if (error.code === 'PGRST116') {
              const { data: newInventory, error: createError } = await supabase
                .from('player_inventory')
                .insert({
                  player_id: playerId,
                  humanoid_packs: 0,
                  weapon_packs: 0,
                })
                .select()
                .single();

              if (createError) throw createError;

              set({ 
                inventory: newInventory, 
                isLoading: false,
                lastUpdated: new Date().toISOString()
              });
              return;
            }
            throw error;
          }

          set({ 
            inventory: data, 
            isLoading: false,
            lastUpdated: new Date().toISOString()
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch inventory';
          set({ error: message, isLoading: false });
          toast.error(message);
        }
      },

      updateInventory: async (updates: Partial<Pick<PlayerInventory, 'humanoid_packs' | 'weapon_packs'>>) => {
        const { inventory } = get();
        if (!inventory) {
          throw new Error('No inventory loaded');
        }

        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('player_inventory')
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq('player_id', inventory.player_id)
            .select()
            .single();

          if (error) throw error;

          set({ 
            inventory: data, 
            isLoading: false,
            lastUpdated: new Date().toISOString()
          });
          
          toast.success('Inventory updated successfully!');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update inventory';
          set({ error: message, isLoading: false });
          toast.error(message);
          throw error;
        }
      },

      // Pack Management
      addPacks: async (type: 'humanoid' | 'weapon', amount: number) => {
        const { inventory } = get();
        if (!inventory) {
          throw new Error('No inventory loaded');
        }

        if (amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }

        const field = type === 'humanoid' ? 'humanoid_packs' : 'weapon_packs';
        const newAmount = inventory[field] + amount;

        await get().updateInventory({
          [field]: newAmount,
        });

        toast.success(`Added ${amount} ${type} pack${amount > 1 ? 's' : ''}!`);
      },

      removePacks: async (type: 'humanoid' | 'weapon', amount: number) => {
        const { inventory } = get();
        if (!inventory) {
          throw new Error('No inventory loaded');
        }

        if (amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }

        const field = type === 'humanoid' ? 'humanoid_packs' : 'weapon_packs';
        const currentAmount = inventory[field];

        if (currentAmount < amount) {
          throw new Error(`Not enough ${type} packs. You have ${currentAmount} but need ${amount}`);
        }

        const newAmount = currentAmount - amount;

        await get().updateInventory({
          [field]: newAmount,
        });

        toast.success(`Used ${amount} ${type} pack${amount > 1 ? 's' : ''}!`);
      },

      // Utility Methods
      hasEnoughPacks: (type: 'humanoid' | 'weapon', amount: number) => {
        const { inventory } = get();
        if (!inventory) return false;

        const field = type === 'humanoid' ? 'humanoid_packs' : 'weapon_packs';
        return inventory[field] >= amount;
      },

      getTotalPacks: () => {
        const { inventory } = get();
        if (!inventory) return 0;
        return inventory.humanoid_packs + inventory.weapon_packs;
      },

      getPackCount: (type: 'humanoid' | 'weapon') => {
        const { inventory } = get();
        if (!inventory) return 0;
        return type === 'humanoid' ? inventory.humanoid_packs : inventory.weapon_packs;
      },

      // State Management
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    }),
    {
      name: 'inventory-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        inventory: state.inventory,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

// Selectors for common use cases
export const useInventory = () => useInventoryStore((state) => state.inventory);
export const useInventoryLoading = () => useInventoryStore((state) => state.isLoading);
export const useInventoryError = () => useInventoryStore((state) => state.error);
export const useHumanoidPacks = () => useInventoryStore((state) => state.inventory?.humanoid_packs || 0);
export const useWeaponPacks = () => useInventoryStore((state) => state.inventory?.weapon_packs || 0);
export const useTotalPacks = () => useInventoryStore((state) => state.getTotalPacks());
export const useHasEnoughPacks = (type: 'humanoid' | 'weapon', amount: number) => 
  useInventoryStore((state) => state.hasEnoughPacks(type, amount));

// Action hooks for easier usage
export const useInventoryActions = () => {
  const store = useInventoryStore();
  return {
    fetchInventory: store.fetchInventory,
    updateInventory: store.updateInventory,
    addPacks: store.addPacks,
    removePacks: store.removePacks,
    hasEnoughPacks: store.hasEnoughPacks,
    getTotalPacks: store.getTotalPacks,
    getPackCount: store.getPackCount,
    setLoading: store.setLoading,
    setError: store.setError,
    clearError: store.clearError,
    reset: store.reset,
  };
};
