'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, User } from '@supabase/supabase-js';

interface UserContextType {
  user: User | null;
  userDetails: any | null; // You can define a stricter type for userDetails
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export interface UserContextProviderProps {
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
      setUser(sessionUser);
      if (sessionUser) {
        await getUserDetails(sessionUser);
      } else {
        setUserDetails(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = {
    user,
    userDetails,
    isLoading,
  };

  return <UserContext.Provider value={value} {...props} />;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserContextProvider.');
  }
  return context;
};
