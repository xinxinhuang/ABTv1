import { User, Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase/client';

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  
  // Session management
  initializeAuth: () => Promise<void>;
  refreshSession: () => Promise<void>;
  
  // Profile management
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  
  // State management
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Auth Actions
      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user && data.session) {
            set({ 
              user: data.user, 
              session: data.session,
              isLoading: false 
            });
            
            // Fetch profile after successful sign in
            await get().fetchProfile(data.user.id);
            
            toast.success('Successfully signed in!');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to sign in';
          set({ error: message, isLoading: false });
          toast.error(message);
          throw error;
        }
      },

      signUp: async (email: string, password: string, username: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
              },
            },
          });

          if (error) throw error;

          if (data.user) {
            set({ 
              user: data.user, 
              session: data.session,
              isLoading: false 
            });
            
            toast.success('Account created successfully!');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to sign up';
          set({ error: message, isLoading: false });
          toast.error(message);
          throw error;
        }
      },

      signOut: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabase.auth.signOut();
          
          if (error) throw error;
          
          // Reset all auth state
          set({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            error: null,
          });
          
          toast.success('Successfully signed out!');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to sign out';
          set({ error: message, isLoading: false });
          toast.error(message);
          throw error;
        }
      },

      // Session Management
      initializeAuth: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) throw error;
          
          if (session) {
            set({ 
              user: session.user, 
              session: session,
              isInitialized: true 
            });
            
            // Fetch profile
            await get().fetchProfile(session.user.id);
          } else {
            set({ 
              user: null, 
              session: null,
              profile: null,
              isInitialized: true 
            });
          }
          
          // Set up auth state listener
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              set({ 
                user: session.user, 
                session: session 
              });
              await get().fetchProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
              set({ 
                user: null, 
                session: null,
                profile: null 
              });
            }
          });
          
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to initialize auth';
          set({ error: message, isInitialized: true });
          console.error('Auth initialization error:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      refreshSession: async () => {
        try {
          const { data: { session }, error } = await supabase.auth.refreshSession();
          
          if (error) throw error;
          
          if (session) {
            set({ 
              user: session.user, 
              session: session 
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to refresh session';
          set({ error: message });
          console.error('Session refresh error:', error);
        }
      },

      // Profile Management
      fetchProfile: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (error) throw error;

          set({ profile: data });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch profile';
          set({ error: message });
          console.error('Profile fetch error:', error);
        }
      },

      updateProfile: async (updates: Partial<Profile>) => {
        const { user } = get();
        if (!user) throw new Error('No user logged in');

        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

          if (error) throw error;

          set({ profile: data, isLoading: false });
          toast.success('Profile updated successfully!');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update profile';
          set({ error: message, isLoading: false });
          toast.error(message);
          throw error;
        }
      },

      // State Management
      setUser: (user: User | null) => set({ user }),
      setSession: (session: Session | null) => set({ session }),
      setProfile: (profile: Profile | null) => set({ profile }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        profile: state.profile,
        isInitialized: state.isInitialized,
      }),
    }
  )
);

// Selectors for common use cases
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthSession = () => useAuthStore((state) => state.session);
export const useAuthProfile = () => useAuthStore((state) => state.profile);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);
export const useIsInitialized = () => useAuthStore((state) => state.isInitialized);
