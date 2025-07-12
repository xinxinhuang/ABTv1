'use client';

import React, { useState, useEffect } from 'react';

// Define an interface for the battle state for type safety
interface BattleState {
  status: 'pending' | 'in_progress' | 'completed' | 'declined';
  battle_state: {
    turn: number;
    winner?: string | null; // Winner may not be present initially
  };
}

interface GameLogProps {
  battleState: BattleState | null;
}

export const GameLog: React.FC<GameLogProps> = ({ battleState }) => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!battleState) return;

    // This is a simple log generator. A real implementation would track events.
    const newLogs: string[] = [];
    if (battleState.status === 'in_progress') {
        newLogs.push(`Turn: ${battleState.battle_state.turn}`);
    } else if (battleState.status === 'completed') {
        newLogs.push(`Battle Over! Winner: ${battleState.battle_state.winner}`);
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
