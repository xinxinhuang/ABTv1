# Battle Arena System Documentation

## Overview

The Battle Arena is a player-versus-player (PvP) system that allows players to pit their collected humanoid cards against each other in a strategic battle. The system implements a rock-paper-scissors style combat mechanic with card type advantages and attribute bonuses.

## Core Mechanics

### Card Type Advantages

The battle system implements a circular advantage system for humanoid cards:

```
Void Sorcerer > Space Marine > Galactic Ranger > Void Sorcerer
```

This creates a strategic element where:
- Void Sorcerer's mystical powers overwhelm Space Marine
- Space Marine's brute strength overcomes Galactic Ranger
- Galactic Ranger's speed outwits Void Sorcerer

### Attribute-Based Resolution

When two cards of the same type battle each other, the outcome is determined by comparing their primary attributes:

| Card Type | Primary Attribute | 
|-----------|-------------------|
| Space Marine | Strength (STR) |
| Galactic Ranger | Dexterity (DEX) |
| Void Sorcerer | Intelligence (INT) |

The card with the higher primary attribute value wins. If both cards have the same value, the battle results in a draw.

### Card Rarity Impact

Card rarity (bronze, silver, gold) indirectly affects battle outcomes since higher rarity cards typically have higher attribute values:

- Bronze: Primary attribute < 28
- Silver: Primary attribute 28-34
- Gold: Primary attribute ≥ 35

## Battle Process

1. **Card Selection**: Each player selects a humanoid card from their collection
2. **Battle Initiation**: The battle begins with a countdown animation
3. **Type Comparison**: System compares the card types for type advantage
4. **Attribute Comparison**: If needed, system compares primary attributes
5. **Result Determination**: Winner is calculated based on type advantage or attributes
6. **Battle Animation**: A visual display shows the battle outcome
7. **Result Display**: The system announces the winner with an explanation

## Technical Implementation

### Components

1. **ArenaPage**: The main page container for the battle arena
2. **CardSelection**: Component for browsing and selecting cards from inventory
3. **BattleArena**: Handles the battle animation and outcome calculation
4. **BattleResults**: Displays the battle outcome with explanations

### User Flow

1. Player navigates to the Battle Arena page
2. Player 1 selects a card from their collection
3. Player 2 selects a card from their collection (hot seat gameplay)
4. Players click "Start Battle" to initiate combat
5. System determines and displays the winner
6. Players can choose to battle again with new cards

## Future Enhancements

Potential improvements to the battle system could include:

1. **Weapon Card Integration**: Allow players to equip weapon cards to their humanoid cards for stat bonuses
2. **Special Abilities**: Add unique abilities to gold and silver rarity cards
3. **Online Multiplayer**: Enable battles between players on different devices
4. **Battle History**: Track and display past battle results
5. **Ranking System**: Implement an ELO-style ranking system for competitive play

## Code Structure

The battle system consists of the following files:

- `src/app/game/arena/page.tsx`: Main arena page component
- `src/components/game/battle/CardSelection.tsx`: Card selection interface
- `src/components/game/battle/BattleArena.tsx`: Battle logic and animation
- `src/components/game/battle/BattleResults.tsx`: Results display component
