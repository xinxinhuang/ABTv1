'use client';

import { Package, Clock, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

import BoosterFeedbackSlider from '@/components/game/BoosterFeedbackSlider';
import { ActiveTimer } from '@/types/game';
import { ActiveTimersDisplay } from '@/components/game/ActiveTimersDisplay';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PackOpener } from '@/components/game/PackOpener';
import { SparklesText } from '@/components/ui/sparkles-text';
import { supabase } from '@/lib/supabase/client';

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
      <div className="content-height bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-6xl mb-4">📦</div>
            <SparklesText 
              text="Loading..."
              colors={{ first: 'var(--color-primary-400)', second: 'var(--color-primary-500)' }}
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
                  className="w-3 h-3 bg-[var(--color-primary-500)] rounded-full"
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
    <div className="content-height bg-[var(--bg-primary)]">
      <div className="container-game py-8">
        <div className="text-center mb-8">
          <SparklesText 
            text="Card Packs"
            colors={{ first: 'var(--color-primary-400)', second: 'var(--color-primary-500)' }}
            className="text-4xl md:text-6xl font-bold"
            sparklesCount={10}
          />
        </div>

        <div className="space-y-8">
          {/* Inventory Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="interactive" className="text-center">
              <CardContent className="p-6">
                <Package className="w-8 h-8 text-[var(--color-primary-500)] mx-auto mb-4" />
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  {inventory?.humanoid_packs || 0}
                </div>
                <div className="text-[var(--text-secondary)]">
                  Humanoid Packs
                </div>
              </CardContent>
            </Card>

            <Card variant="interactive" className="text-center">
              <CardContent className="p-6">
                <Package className="w-8 h-8 text-[var(--color-primary-500)] mx-auto mb-4" />
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  {inventory?.weapon_packs || 0}
                </div>
                <div className="text-[var(--text-secondary)]">
                  Weapon Packs
                </div>
              </CardContent>
            </Card>

            <Card variant="interactive" className="text-center">
              <CardContent className="p-6">
                <Coins className="w-8 h-8 text-[var(--color-primary-500)] mx-auto mb-4" />
                <div className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  {inventory?.coins || 0}
                </div>
                <div className="text-[var(--text-secondary)]">
                  Coins
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pack Opening Section */}
          {hasActivePacks && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card variant="interactive" className="relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Humanoid Pack
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BoosterFeedbackSlider
                    packType="humanoid"
                    packName="Humanoid Pack"
                    className="w-full h-64 border border-[var(--border-primary)] rounded-[var(--radius-md)]"
                  />
                  <Button
                    onClick={() => handleOpenPack('humanoid')}
                    disabled={!inventory?.humanoid_packs}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    {inventory?.humanoid_packs ? `Open Pack (${inventory.humanoid_packs})` : 'No Packs Available'}
                  </Button>
                </CardContent>
              </Card>

              <Card variant="interactive" className="relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Weapon Pack
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BoosterFeedbackSlider
                    packType="weapon"
                    packName="Weapon Pack"
                    className="w-full h-64 border border-[var(--border-primary)] rounded-[var(--radius-md)]"
                  />
                  <Button
                    onClick={() => handleOpenPack('weapon')}
                    disabled={!inventory?.weapon_packs}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    {inventory?.weapon_packs ? `Open Pack (${inventory.weapon_packs})` : 'No Packs Available'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* No Packs Message */}
          {!hasActivePacks && (
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-6xl mb-4">📦</div>
                <div className="text-2xl text-[var(--text-primary)] mb-2">No Packs Available</div>
                <div className="text-[var(--text-secondary)]">Check back later for new packs!</div>
              </CardContent>
            </Card>
          )}

          {/* Ready Timers */}
          {readyTimers.length > 0 && (
            <Card className="border-[var(--color-success)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[var(--color-success)]">
                  <Clock className="w-5 h-5" />
                  Ready to Open!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {readyTimers.map(timer => (
                  <div key={timer.id} className="flex items-center justify-between bg-[var(--color-success)]/10 rounded-[var(--radius-md)] p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-[var(--color-success)] rounded-full animate-pulse"></div>
                      <span className="text-[var(--text-primary)] capitalize">{timer.pack_type} Pack</span>
                    </div>
                    <Button
                      onClick={() => setOpeningPack({ timerId: timer.id, packType: timer.pack_type as 'humanoid' | 'weapon' })}
                      variant="primary"
                      size="sm"
                    >
                      Open Now
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Active Timers */}
          {timers.filter(t => t.status === 'active').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Opening Soon...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActiveTimersDisplay 
                  timers={timers.filter(t => t.is_active)} 
                  onOpenPack={(timerId, packType) => setOpeningPack({ timerId, packType })}
                />
              </CardContent>
            </Card>
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
