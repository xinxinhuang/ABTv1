'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { SparklesText } from '@/components/ui/sparkles-text';
import { PackOpener } from '@/components/game/PackOpener';
import { ActiveTimersDisplay } from '@/components/game/ActiveTimersDisplay';
import { Skeleton } from '@/components/ui/Skeleton';
import { ActiveTimer } from '@/types/game';
import { motion } from 'framer-motion';
import BoosterFeedbackSlider from '@/components/game/BoosterFeedbackSlider';

interface PlayerInventory {
  humanoid_packs: number;
  weapon_packs: number;
  coins: number;
}

export default function PacksPage() {
  const [inventory, setInventory] = useState<PlayerInventory | null>(null);
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingPack, setOpeningPack] = useState<{
    timerId: string;
    packType: 'humanoid' | 'weapon';
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = '/login';
          return;
        }

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
  }, []);

  const handleOpenPack = async (packType: 'humanoid' | 'weapon') => {
    if (!inventory) return;

    const availablePacks = packType === 'humanoid' ? inventory.humanoid_packs : inventory.weapon_packs;
    
    if (availablePacks <= 0) {
      toast.error(`You don't have any ${packType} packs!`);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to open packs');
        return;
      }

      const response = await fetch('/api/timers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          pack_type: packType,
          timer_duration: 5 // 5 seconds for demo
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start pack opening');
      }

      const timer = await response.json();
      toast.success('Pack opening started!');
      
      // Immediately open the pack since timer is short
      setTimeout(() => {
        setOpeningPack({
          timerId: timer.id,
          packType: packType
        });
      }, 100);
      
    } catch (error) {
      console.error('Error opening pack:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to open pack');
    }
  };

  const handlePackComplete = (cards: any[]) => {
    setOpeningPack(null);
    toast.success(`Received ${cards.length} new card${cards.length > 1 ? 's' : ''}!`);
  };

  const handlePackCancel = () => {
    setOpeningPack(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
        <div className="text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-6xl mb-4">📦</div>
            <SparklesText 
              text="Loading..."
              colors={{ first: '#ffd43b', second: '#fab005' }}
              className="text-2xl md:text-4xl font-bold"
              sparklesCount={8}
            />
            <motion.div
              className="flex justify-center gap-2 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-yellow-400 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  const hasActivePacks = (inventory?.humanoid_packs || 0) + (inventory?.weapon_packs || 0) > 0;
  const readyTimers = timers.filter(t => t.status === 'ready');

  return (
    <div className="content-height flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
      <div className="text-center space-y-12 max-w-4xl mx-auto p-8">
        <SparklesText 
          text="Card Packs"
          colors={{ first: '#ffd43b', second: '#fab005' }}
          className="text-4xl md:text-6xl font-bold"
          sparklesCount={10}
        />

        <div className="space-y-8">
          {/* Inventory Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap justify-center gap-6"
          >
            <motion.div 
              className="bg-blue-500/20 border border-blue-500/30 rounded-2xl px-8 py-4 text-center hover:bg-blue-500/30 transition-colors cursor-pointer group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-3xl font-bold text-blue-300 group-hover:text-blue-200 transition-colors">
                {inventory?.humanoid_packs || 0}
              </div>
              <div className="text-blue-200 group-hover:text-blue-100 transition-colors flex items-center gap-2 justify-center">
                <span>🤖</span>
                <span>Humanoid Packs</span>
              </div>
            </motion.div>
            <motion.div 
              className="bg-purple-500/20 border border-purple-500/30 rounded-2xl px-8 py-4 text-center hover:bg-purple-500/30 transition-colors cursor-pointer group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-3xl font-bold text-purple-300 group-hover:text-purple-200 transition-colors">
                {inventory?.weapon_packs || 0}
              </div>
              <div className="text-purple-200 group-hover:text-purple-100 transition-colors flex items-center gap-2 justify-center">
                <span>⚔️</span>
                <span>Weapon Packs</span>
              </div>
            </motion.div>
            <motion.div 
              className="bg-amber-500/20 border border-amber-500/30 rounded-2xl px-8 py-4 text-center hover:bg-amber-500/30 transition-colors cursor-pointer group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-3xl font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                {inventory?.coins || 0}
              </div>
              <div className="text-amber-200 group-hover:text-amber-100 transition-colors flex items-center gap-2 justify-center">
                <span>💰</span>
                <span>Coins</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Pack Opening Buttons with Feedback Sliders */}
          {hasActivePacks && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              <div className="relative group">
                <BoosterFeedbackSlider
                  packType="humanoid"
                  packName="Humanoid Pack"
                  className="w-80 h-80 border-2 border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-xl"
                />
                <button
                  onClick={() => handleOpenPack('humanoid')}
                  disabled={!inventory?.humanoid_packs}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600/90 hover:bg-blue-700/90 disabled:bg-gray-600/90 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg backdrop-blur-sm"
                >
                  {inventory?.humanoid_packs ? `Open (${inventory.humanoid_packs})` : 'No Packs'}
                </button>
              </div>

              <div className="relative group">
                <BoosterFeedbackSlider
                  packType="weapon"
                  packName="Weapon Pack"
                  className="w-80 h-80 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 shadow-lg hover:shadow-xl"
                />
                <button
                  onClick={() => handleOpenPack('weapon')}
                  disabled={!inventory?.weapon_packs}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-600/90 hover:bg-purple-700/90 disabled:bg-gray-600/90 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg backdrop-blur-sm"
                >
                  {inventory?.weapon_packs ? `Open (${inventory.weapon_packs})` : 'No Packs'}
                </button>
              </div>
            </motion.div>
          )}

          {/* No Packs Message */}
          {!hasActivePacks && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">📦</div>
              <div className="text-2xl text-gray-300 mb-2">No Packs Available</div>
              <div className="text-gray-400">Check back later for new packs!</div>
            </motion.div>
          )}

          {/* Ready Timers */}
          {readyTimers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6"
            >
              <h3 className="text-2xl font-bold text-green-300 mb-4">Ready to Open!</h3>
              <div className="space-y-3">
                {readyTimers.map(timer => (
                  <div key={timer.id} className="flex items-center justify-between bg-green-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-200 capitalize">{timer.pack_type} Pack</span>
                    </div>
                    <button
                      onClick={() => setOpeningPack({ timerId: timer.id, packType: timer.pack_type as 'humanoid' | 'weapon' })}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Open Now
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Active Timers */}
          {timers.filter(t => t.status === 'active').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-500/10 border border-gray-500/30 rounded-2xl p-6"
            >
              <h3 className="text-2xl font-bold text-gray-300 mb-4">Opening Soon...</h3>
              <ActiveTimersDisplay timers={timers.filter(t => t.status === 'active')} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Pack Opener Modal */}
      {openingPack && (
        <PackOpener
          timerId={openingPack.timerId}
          packType={openingPack.packType}
          onComplete={handlePackComplete}
          onCancel={handlePackCancel}
        />
      )}
    </div>
  );
}
