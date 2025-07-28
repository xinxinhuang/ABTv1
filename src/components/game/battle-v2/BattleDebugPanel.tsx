/**
 * BattleDebugPanel Component
 * Development-only debugging panel for battle state inspection
 */

'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Bug, Wifi, WifiOff, RefreshCw, Eye } from 'lucide-react';
import { User } from '@supabase/supabase-js';

import { BattleInstance, HumanoidCard, BattleRealtimeEvent } from '@/types/battle-consolidated';
import { getBattlePhaseDisplayName } from '@/lib/battle-v2/utils';

interface BattleDebugPanelProps {
  battle: BattleInstance | null;
  user: User | null;
  playerCard: HumanoidCard | null;
  opponentCard: HumanoidCard | null;
  isConnected: boolean;
  lastEvent: BattleRealtimeEvent | null;
  playerHasSelected: boolean;
  opponentHasSelected: boolean;
}

export const BattleDebugPanel: React.FC<BattleDebugPanelProps> = ({
  battle,
  user,
  playerCard,
  opponentCard,
  isConnected,
  lastEvent,
  playerHasSelected,
  opponentHasSelected
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'battle' | 'cards' | 'realtime' | 'state'>('battle');

  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 border-t border-gray-600 text-white">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-2 flex items-center justify-center space-x-2 hover:bg-gray-800 transition-colors"
      >
        <Bug className="h-4 w-4 text-green-400" />
        <span className="text-sm font-medium">Debug Panel</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="border-t border-gray-700">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700">
            {[
              { key: 'battle', label: 'Battle', icon: Eye },
              { key: 'cards', label: 'Cards', icon: RefreshCw },
              { key: 'realtime', label: 'Real-time', icon: isConnected ? Wifi : WifiOff },
              { key: 'state', label: 'State', icon: Bug }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 max-h-96 overflow-y-auto">
            {activeTab === 'battle' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-400">Battle Information</h3>
                {battle ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div><strong>ID:</strong> {battle.id}</div>
                      <div><strong>Status:</strong> {battle.status}</div>
                      <div><strong>Phase:</strong> {getBattlePhaseDisplayName(battle.status)}</div>
                      <div><strong>Challenger:</strong> {battle.challenger_id}</div>
                      <div><strong>Opponent:</strong> {battle.opponent_id}</div>
                    </div>
                    <div className="space-y-2">
                      <div><strong>Winner:</strong> {battle.winner_id || 'TBD'}</div>
                      <div><strong>Created:</strong> {formatTimestamp(battle.created_at)}</div>
                      <div><strong>Updated:</strong> {battle.updated_at ? formatTimestamp(battle.updated_at) : 'N/A'}</div>
                      <div><strong>Completed:</strong> {battle.completed_at ? formatTimestamp(battle.completed_at) : 'N/A'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-400">No battle data available</div>
                )}
              </div>
            )}

            {activeTab === 'cards' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-400">Card Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-blue-400 mb-2">Player Card</h4>
                    {playerCard ? (
                      <div className="space-y-1 text-sm">
                        <div><strong>Name:</strong> {playerCard.card_name}</div>
                        <div><strong>Type:</strong> {playerCard.card_type}</div>
                        <div><strong>Rarity:</strong> {playerCard.rarity}</div>
                        <div><strong>STR:</strong> {playerCard.attributes.str}</div>
                        <div><strong>DEX:</strong> {playerCard.attributes.dex}</div>
                        <div><strong>INT:</strong> {playerCard.attributes.int}</div>
                        <div><strong>Total:</strong> {
                          playerCard.attributes.str + playerCard.attributes.dex + playerCard.attributes.int
                        }</div>
                      </div>
                    ) : (
                      <div className="text-gray-400">No player card data</div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-red-400 mb-2">Opponent Card</h4>
                    {opponentCard ? (
                      <div className="space-y-1 text-sm">
                        <div><strong>Name:</strong> {opponentCard.card_name}</div>
                        <div><strong>Type:</strong> {opponentCard.card_type}</div>
                        <div><strong>Rarity:</strong> {opponentCard.rarity}</div>
                        <div><strong>STR:</strong> {opponentCard.attributes.str}</div>
                        <div><strong>DEX:</strong> {opponentCard.attributes.dex}</div>
                        <div><strong>INT:</strong> {opponentCard.attributes.int}</div>
                        <div><strong>Total:</strong> {
                          opponentCard.attributes.str + opponentCard.attributes.dex + opponentCard.attributes.int
                        }</div>
                      </div>
                    ) : (
                      <div className="text-gray-400">No opponent card data</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'realtime' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-400">Real-time Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className={`flex items-center space-x-2 ${
                      isConnected ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                      <span><strong>Connection:</strong> {isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div><strong>Last Event:</strong></div>
                    {lastEvent ? (
                      <div className="text-sm space-y-1">
                        <div><strong>Type:</strong> {lastEvent.type}</div>
                        <div><strong>Player:</strong> {lastEvent.playerId}</div>
                        <div><strong>Time:</strong> {formatTimestamp(lastEvent.timestamp)}</div>
                        {lastEvent.data && (
                          <div>
                            <strong>Data:</strong>
                            <pre className="text-xs bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                              {formatJson(lastEvent.data)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400">No events received</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'state' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-400">Component State</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-400">Selection Status</h4>
                    <div><strong>Player Selected:</strong> {playerHasSelected ? 'Yes' : 'No'}</div>
                    <div><strong>Opponent Selected:</strong> {opponentHasSelected ? 'Yes' : 'No'}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-400">User Info</h4>
                    {user ? (
                      <div className="space-y-1">
                        <div><strong>ID:</strong> {user.id}</div>
                        <div><strong>Email:</strong> {user.email}</div>
                        <div><strong>Role:</strong> {
                          battle?.challenger_id === user.id ? 'Challenger' : 
                          battle?.opponent_id === user.id ? 'Opponent' : 'Unknown'
                        }</div>
                      </div>
                    ) : (
                      <div className="text-gray-400">No user data</div>
                    )}
                  </div>
                </div>
                
                {/* Raw State Dump */}
                <div className="mt-4">
                  <h4 className="font-semibold text-blue-400 mb-2">Raw Battle Data</h4>
                  <pre className="text-xs bg-gray-800 p-3 rounded overflow-x-auto max-h-48 overflow-y-auto">
                    {formatJson({
                      battle,
                      playerCard: playerCard ? {
                        id: playerCard.id,
                        name: playerCard.card_name,
                        type: playerCard.card_type,
                        attributes: playerCard.attributes
                      } : null,
                      opponentCard: opponentCard ? {
                        id: opponentCard.id,
                        name: opponentCard.card_name,
                        type: opponentCard.card_type,
                        attributes: opponentCard.attributes
                      } : null,
                      state: {
                        playerHasSelected,
                        opponentHasSelected,
                        isConnected
                      }
                    })}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};