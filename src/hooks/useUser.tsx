'use client';

import type { User } from '@supabase/supabase-js';

import { createContext, useContext, useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { onlinePlayersService } from '@/lib/services/onlinePlayersService';

interface UserContextType {
  user: User | null;
  userDetails: any | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  userDetails: null,
  isLoading: true,
});

interface UserContextProviderProps {
  children: React.ReactNode;
}

export const UserContextProvider = (props: UserContextProviderProps) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUserDetails = async (user: User) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching user details:', error);
          return;
        }
        
        setUserDetails(data);
        
        // Register user as online when profile is loaded (non-blocking)
        // Don't await this to prevent hanging the loading state
        const username = data.username || 'Anonymous';
        onlinePlayersService.registerOnline(user, username).catch(err => {
          console.error('Failed to register online status:', err);
        });
      } catch (err) {
        console.error('Error in getUserDetails:', err);
      }
    };

    const handleUserSignOut = async (userId: string) => {
      try {
        await onlinePlayersService.unregisterOnline(userId);
      } catch (err) {
        console.error('Failed to unregister online status:', err);
      }
    };

    const handleSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          await getUserDetails(sessionUser);
        }
      } catch (err) {
        console.error('Error in handleSession:', err);
      } finally {
        setIsLoading(false);
      }
    };

    handleSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        const sessionUser = session?.user ?? null;
        
        // Handle sign out - cleanup online status before clearing user data
        if (event === 'SIGNED_OUT' && user) {
          handleUserSignOut(user.id).catch(err => {
            console.error('Failed to handle user sign out:', err);
          });
        }
        
        setUser(sessionUser);
        if (sessionUser) {
          await getUserDetails(sessionUser);
        } else {
          setUserDetails(null);
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
      } finally {
        setIsLoading(false);
      }
    });

    // Cleanup function to handle page unload
    const handleBeforeUnload = () => {
      if (user) {
        // Use sendBeacon for more reliable cleanup during page unload
        try {
          const data = JSON.stringify({
            user_id: user.id
          });
          
          // Create a Blob with proper content type for sendBeacon
          const blob = new Blob([data], { type: 'application/json' });
          
          if (!navigator.sendBeacon('/api/user/offline', blob)) {
            // Fallback to regular cleanup if sendBeacon fails
            onlinePlayersService.unregisterOnline(user.id).catch(console.error);
          }
        } catch (err) {
          console.error('Error in beforeunload cleanup:', err);
          onlinePlayersService.unregisterOnline(user.id).catch(console.error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Cleanup online status when component unmounts
      if (user) {
        onlinePlayersService.unregisterOnline(user.id);
      }
    };
  }, [supabase, user?.id]); // Only depend on user.id to avoid infinite loops

  const value = {
    user,
    userDetails,
    isLoading,
  };

  return <UserContext.Provider value={value} {...props} />;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserContextProvider');
  }
  return context;
};
