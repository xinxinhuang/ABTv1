'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Error fetching user details:', error);
      } else {
        setUserDetails(data);
        
        // Register user as online when profile is loaded
        try {
          const username = data.username || 'Anonymous';
          await onlinePlayersService.registerOnline(user, username);
        } catch (err) {
          console.error('Failed to register online status:', err);
        }
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
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        await getUserDetails(sessionUser);
      }
      setIsLoading(false);
    };

    handleSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const sessionUser = session?.user ?? null;
      
      // Handle sign out - cleanup online status before clearing user data
      if (event === 'SIGNED_OUT' && user) {
        await handleUserSignOut(user.id);
      }
      
      setUser(sessionUser);
      if (sessionUser) {
        await getUserDetails(sessionUser);
      } else {
        setUserDetails(null);
      }
      setIsLoading(false);
    });

    // Cleanup function to handle page unload
    const handleBeforeUnload = () => {
      if (user) {
        // Use sendBeacon for more reliable cleanup during page unload
        const data = JSON.stringify({
          user_id: user.id
        });
        
        // Fallback to regular cleanup if sendBeacon fails
        try {
          navigator.sendBeacon('/api/user/offline', data);
        } catch (err) {
          onlinePlayersService.unregisterOnline(user.id);
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
