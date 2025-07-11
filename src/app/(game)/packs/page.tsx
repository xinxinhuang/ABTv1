'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { StartTimerForm } from '@/components/game/StartTimerForm';
import { ActiveTimersDisplay } from '@/components/game/ActiveTimersDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ActiveTimer } from '@/types/game';

interface PlayerInventory {
  humanoid_packs: number;
  weapon_packs: number;
  coins: number;
}

export default function PacksPage() {
  // Using the centralized supabase client
  const [inventory, setInventory] = useState<PlayerInventory | null>(null);
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('packs');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = '/login';
          return;
        }

        // Fetch inventory and timers in parallel
        const [inventoryRes, timersRes] = await Promise.all([
          supabase
            .from('player_inventory')
            .select('*')
            .eq('player_id', session.user.id)
            .single(),
          supabase
            .from('active_timers')
            .select('*')
            .eq('player_id', session.user.id)
            .order('start_time', { ascending: true })
        ]);

        if (inventoryRes.data) {
          setInventory(inventoryRes.data);
        }

        if (timersRes.data) {
          setTimers(timersRes.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Set up real-time subscription for timers
    const subscription = supabase
      .channel('timers_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'active_timers' 
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTimers(prev => [...prev, payload.new as ActiveTimer]);
          } else if (payload.eventType === 'DELETE') {
            setTimers(prev => prev.filter(t => t.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setTimers(prev => 
              prev.map(t => t.id === payload.new.id ? (payload.new as ActiveTimer) : t)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Removed supabase from dependencies

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const handleTimerStart = () => {
    // This will be called when a new timer is started
    // The real-time subscription will handle the UI update
    toast.success('Timer started successfully!');
    
    // Switch to the timers tab
    setActiveTab('timers');
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Card Packs</h1>
          <p className="text-muted-foreground">Open packs to collect powerful cards</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="font-medium">Humanoid Packs:</span>
            <span className="font-bold">{inventory?.humanoid_packs || 0}</span>
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="font-medium">Weapon Packs:</span>
            <span className="font-bold">{inventory?.weapon_packs || 0}</span>
          </div>
          <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="font-medium">Coins:</span>
            <span className="font-bold">{inventory?.coins || 0}</span>
          </div>
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="packs">My Packs</TabsTrigger>
          <TabsTrigger value="timers">Active Timers</TabsTrigger>
        </TabsList>

        <TabsContent value="packs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Packs</CardTitle>
            </CardHeader>
            <CardContent>
              <StartTimerForm 
                onTimerStart={handleTimerStart}
                availablePacks={inventory ? {
                  humanoid: inventory.humanoid_packs,
                  weapon: inventory.weapon_packs
                } : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Timers</CardTitle>
            </CardHeader>
            <CardContent>
              <ActiveTimersDisplay timers={timers} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
