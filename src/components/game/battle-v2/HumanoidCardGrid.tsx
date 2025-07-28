/**
 * HumanoidCardGrid Component
 * Displays only humanoid cards in a grid layout for battle selection
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Loader2, Filter, SortAsc, SortDesc } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { HumanoidCard } from '@/types/battle-consolidated';
import { getCardRarityColor } from '@/lib/battle-v2/utils';

import { CardDisplay } from '../CardDisplay';

interface HumanoidCardGridProps {
  cards: HumanoidCard[];
  selectedCardId: string | null;
  onCardSelect: (cardId: string) => void;
  onConfirmSelection: () => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

type SortOption = 'name' | 'rarity' | 'str' | 'dex' | 'int' | 'total' | 'recent';
type FilterOption = 'all' | 'bronze' | 'silver' | 'gold';

export const HumanoidCardGrid: React.FC<HumanoidCardGridProps> = ({
  cards,
  selectedCardId,
  onCardSelect,
  onConfirmSelection,
  loading = false,
  error = null,
  disabled = false
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Memoized filtered and sorted cards
  const processedCards = useMemo(() => {
    let filtered = [...cards];

    // Apply rarity filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(card => card.rarity === filterBy);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case 'name':
          return sortOrder === 'asc' 
            ? a.card_name.localeCompare(b.card_name)
            : b.card_name.localeCompare(a.card_name);
        
        case 'rarity':
          const rarityOrder = { bronze: 1, silver: 2, gold: 3 };
          aValue = rarityOrder[a.rarity];
          bValue = rarityOrder[b.rarity];
          break;
        
        case 'str':
          aValue = a.attributes.str;
          bValue = b.attributes.str;
          break;
        
        case 'dex':
          aValue = a.attributes.dex;
          bValue = b.attributes.dex;
          break;
        
        case 'int':
          aValue = a.attributes.int;
          bValue = b.attributes.int;
          break;
        
        case 'total':
          aValue = a.attributes.str + a.attributes.dex + a.attributes.int;
          bValue = b.attributes.str + b.attributes.dex + b.attributes.int;
          break;
        
        case 'recent':
          aValue = new Date(a.obtained_at).getTime();
          bValue = new Date(b.obtained_at).getTime();
          break;
        
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [cards, sortBy, sortOrder, filterBy]);

  const handleCardClick = (cardId: string) => {
    if (disabled) return;
    onCardSelect(cardId);
  };

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
        <p className="text-gray-400">Loading your humanoid cards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500 rounded-lg">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Error Loading Cards</h3>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-400 mb-2">No Humanoid Cards</h3>
        <p className="text-gray-500">
          You don't have any humanoid cards yet. Open some humanoid packs to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-white">
            Choose Your Humanoid Card
          </h2>
          <span className="text-sm text-gray-400">
            ({processedCards.length} of {cards.length} cards)
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </Button>
      </div>

      {/* Filter and Sort Controls */}
      {showFilters && (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rarity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Rarity
              </label>
              <div className="flex space-x-2">
                {(['all', 'bronze', 'silver', 'gold'] as FilterOption[]).map(rarity => (
                  <button
                    key={rarity}
                    onClick={() => setFilterBy(rarity)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      filterBy === rarity
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {rarity === 'all' ? 'All' : rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sort by
              </label>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'total', label: 'Total' },
                  { key: 'str', label: 'STR' },
                  { key: 'dex', label: 'DEX' },
                  { key: 'int', label: 'INT' },
                  { key: 'rarity', label: 'Rarity' },
                  { key: 'name', label: 'Name' },
                  { key: 'recent', label: 'Recent' }
                ] as { key: SortOption; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleSort(key)}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      sortBy === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span>{label}</span>
                    {sortBy === key && (
                      sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {processedCards.map(card => (
          <div
            key={card.id}
            className={`relative cursor-pointer transition-all duration-200 transform ${
              disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:scale-105 hover:z-10'
            } ${
              selectedCardId === card.id
                ? 'ring-4 ring-yellow-400 ring-opacity-75 scale-105 z-20'
                : 'hover:ring-2 hover:ring-blue-400 hover:ring-opacity-50'
            }`}
            onClick={() => handleCardClick(card.id)}
          >
            {/* Selection indicator */}
            {selectedCardId === card.id && (
              <div className="absolute -top-2 -right-2 z-30">
                <div className="bg-yellow-400 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              </div>
            )}

            {/* Card Display */}
            <div className="relative">
              <CardDisplay card={card} isRevealed={true} />
              
              {/* Card stats overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white p-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${getCardRarityColor(card.rarity)}`}>
                    {card.rarity.toUpperCase()}
                  </span>
                  <span className="font-bold">
                    {card.attributes.str + card.attributes.dex + card.attributes.int}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>STR: {card.attributes.str}</span>
                  <span>DEX: {card.attributes.dex}</span>
                  <span>INT: {card.attributes.int}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selection Summary and Confirm Button */}
      {selectedCardId && (
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-400">Card Selected</h3>
              {(() => {
                const selectedCard = cards.find(c => c.id === selectedCardId);
                return selectedCard ? (
                  <p className="text-gray-300">
                    {selectedCard.card_name} - Total: {
                      selectedCard.attributes.str + selectedCard.attributes.dex + selectedCard.attributes.int
                    }
                  </p>
                ) : null;
              })()}
            </div>
            
            <Button
              onClick={onConfirmSelection}
              disabled={disabled}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2"
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      )}

      {/* No cards after filtering */}
      {processedCards.length === 0 && cards.length > 0 && (
        <div className="p-6 text-center text-gray-400">
          <p>No cards match the current filters.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilterBy('all');
              setSortBy('total');
            }}
            className="mt-2"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};