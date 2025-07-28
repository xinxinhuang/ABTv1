'use client';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { supabase } from '@/lib/supabase/client';

interface StartTimerFormProps {
  onTimerStart?: () => void;
  availablePacks?: {
    humanoid: number;
    weapon: number;
  };
}

export function StartTimerForm({ onTimerStart, availablePacks }: StartTimerFormProps) {
  const router = useRouter();
  const [packType, setPackType] = useState<'humanoid' | 'weapon' | ''>('');
  const [delayHours, setDelayHours] = useState<string>('4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset form when availablePacks change
  useEffect(() => {
    if (availablePacks) {
      if (packType === 'humanoid' && availablePacks.humanoid === 0) {
        setPackType('');
      } else if (packType === 'weapon' && availablePacks.weapon === 0) {
        setPackType('');
      }
    }
  }, [availablePacks, packType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!packType || !delayHours) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to start a timer');
      }
      
      const res = await fetch('/api/timers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          packType, 
          delayHours: Number(delayHours) 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start timer');
      }
      
      toast.success(`Timer started for ${packType} pack!`);
      
      // Reset form
      setPackType('');
      setDelayHours('4');
      
      // Call the callback if provided
      if (onTimerStart) {
        onTimerStart();
      }
      
      // Refresh the page to update the UI
      router.refresh();
      
    } catch (err) {
      console.error('Error starting timer:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const packTypeOptions = [
    { 
      value: 'humanoid', 
      label: 'Humanoid Pack',
      disabled: availablePacks ? availablePacks.humanoid <= 0 : false
    },
    { 
      value: 'weapon', 
      label: 'Weapon Pack',
      disabled: availablePacks ? availablePacks.weapon <= 0 : false
    },
  ];
  
  const delayOptions = [
    { value: '4', label: '4 Hours' },
    { value: '8', label: '8 Hours' },
    { value: '24', label: '24 Hours' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start a New Timer</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pack-type">Pack Type</Label>
            <Select 
              onValueChange={(value) => setPackType(value as 'humanoid' | 'weapon')} 
              value={packType}
              disabled={loading}
            >
              <SelectTrigger id="pack-type">
                <SelectValue placeholder="Select a pack type" />
              </SelectTrigger>
              <SelectContent>
                {packTypeOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                    {option.disabled && ' (Out of stock)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delay-hours">Timer Duration</Label>
            <Select 
              onValueChange={setDelayHours} 
              value={delayHours}
              disabled={loading}
            >
              <SelectTrigger id="delay-hours">
                <SelectValue placeholder="Select a duration" />
              </SelectTrigger>
              <SelectContent>
                {delayOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Longer durations may yield better rewards.
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full mt-4" 
            disabled={!packType || !delayHours || loading}
          >
            {loading ? 'Starting Timer...' : 'Start Timer'}
          </Button>
          {error && (
            <p className="text-sm font-medium text-destructive mt-2">
              {error}
            </p>
          )}
          
          {availablePacks && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Your Packs:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                  <p className="text-xs text-blue-600 dark:text-blue-300">Humanoid</p>
                  <p className="font-bold">{availablePacks.humanoid} available</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-md">
                  <p className="text-xs text-purple-600 dark:text-purple-300">Weapon</p>
                  <p className="font-bold">{availablePacks.weapon} available</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
