'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

interface BattleDebugProps {
  battleId: string;
}

export function BattleDebug({ battleId }: BattleDebugProps) {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  const runDebug = async () => {
    setIsLoading(true);
    try {
      // Call our debug function
      const { data, error } = await supabase.functions.invoke('get-all-battles');
      
      if (error) {
        console.error('Debug function error:', error);
        setDebugInfo({ error: error.message });
      } else {
        console.log('Debug data:', data);
        setDebugInfo(data);
      }
    } catch (err: any) {
      console.error('Error running debug:', err);
      setDebugInfo({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Battle Debug Tools</h3>
        <Button 
          onClick={() => setShowDebug(!showDebug)} 
          variant="outline" 
          size="sm"
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </Button>
      </div>
      
      {showDebug && (
        <div className="mt-4">
          <div className="flex space-x-2 mb-4">
            <Button 
              onClick={runDebug} 
              disabled={isLoading}
              variant="secondary"
              size="sm"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Check Battle Tables
            </Button>
          </div>
          
          {debugInfo && (
            <div className="mt-4 bg-gray-900 p-4 rounded-lg overflow-auto max-h-96">
              <h4 className="font-semibold mb-2">Current Battle ID: {battleId}</h4>
              
              {debugInfo.error ? (
                <div className="text-red-500">{debugInfo.error}</div>
              ) : (
                <>
                  <h4 className="font-semibold mb-2">Available Tables:</h4>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(debugInfo.available_tables?.data || [], null, 2)}
                  </pre>
                  
                  <h4 className="font-semibold mt-4 mb-2">Battle Instances:</h4>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(debugInfo.battle_instances?.data || [], null, 2)}
                  </pre>
                  
                  <h4 className="font-semibold mt-4 mb-2">Battle Lobbies:</h4>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(debugInfo.battle_lobbies?.data || [], null, 2)}
                  </pre>
                  
                  <h4 className="font-semibold mt-4 mb-2">User Battles:</h4>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(debugInfo.user_battles?.data || [], null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
