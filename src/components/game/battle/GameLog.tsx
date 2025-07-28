'use client';

import React, { useState, useEffect } from 'react';

interface GameLogProps {
  battleState: BattleInstance | null;
}

export const GameLog: React.FC<GameLogProps> = ({ battleState }) => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!battleState) return;

    // This is a simple log generator. A real implementation would track events.
    const newLogs: string[] = [];
    
    switch (battleState.status) {
      case 'pending':
        newLogs.push('Battle is pending. Waiting for opponent...');
        break;
      case 'active':
        newLogs.push('Battle is active. Select your cards!');
        break;
      case 'cards_revealed':
        newLogs.push('Cards have been revealed. Battle in progress...');
        break;
      case 'in_progress':
        newLogs.push(`Battle in progress. Turn: ${battleState.turn || 1}`);
        break;
      case 'completed':
        if (battleState.winner_id) {
          newLogs.push(`Battle Over! Winner ID: ${battleState.winner_id.slice(0, 8)}...`);
        } else {
          newLogs.push('Battle Over! It was a draw.');
        }
        break;
    }

    setLogs(prevLogs => [...prevLogs, ...newLogs].slice(-10)); // Keep last 10 logs

  }, [battleState]);

  return (
    <div className="bg-gray-900 p-2 rounded-lg mt-4 h-48 overflow-y-auto">
      <h3 className="text-lg font-bold text-white mb-2">Game Log</h3>
      <ul>
        {logs.map((log, index) => (
          <li key={index} className="text-sm text-gray-300">{log}</li>
        ))}
      </ul>
    </div>
  );
};
