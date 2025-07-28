import { toast } from 'sonner';

import { supabase } from './client';

/**
 * Wrapper for authentication operations with proper error handling
 */
export const auth = {
  /**
   * Get the current user session with error handling
   */
  getSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth session error:', error);
        return { session: null, error };
      }
      return { session: data.session, error: null };
    } catch (err) {
      console.error('Failed to get auth session:', err);
      return { session: null, error: err };
    }
  },

  /**
   * Get the current user with error handling
   */
  getUser: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        // Don't show error toast for auth errors - this is normal for logged out users
        console.log('Auth user error:', error.message);
        return { user: null, error };
      }
      return { user: data.user, error: null };
    } catch (err) {
      console.error('Failed to get auth user:', err);
      return { user: null, error: err };
    }
  },

  /**
   * Sign in with email and password
   */
  signInWithPassword: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error(`Sign in failed: ${error.message}`);
        return { session: null, user: null, error };
      }
      
      return { 
        session: data.session, 
        user: data.user,
        error: null 
      };
    } catch (err: any) {
      toast.error(`Sign in failed: ${err.message || 'Unknown error'}`);
      return { session: null, user: null, error: err };
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`Sign out failed: ${error.message}`);
        return { error };
      }
      return { error: null };
    } catch (err: any) {
      toast.error(`Sign out failed: ${err.message || 'Unknown error'}`);
      return { error: err };
    }
  }
};
