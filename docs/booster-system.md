# Booster System Documentation

## System Overview

The ABT Booster System is a time-gated card collection mechanism that allows players to obtain new cards for their collection. The system is designed around two core principles:

1. **Unlimited Availability**: Players have access to unlimited boosters, removing inventory constraints
2. **Time-Gated Rewards**: Opening boosters requires waiting for a timer to complete
3. **Risk-Reward Balance**: Longer wait times increase the chance of obtaining rare cards

## Booster Types

The system offers two types of booster packs:

| Booster Type | Description | Default Timer | Contents |
|--------------|-------------|--------------|----------|
| **Humanoid Booster** | Contains a random humanoid character card | 4 hours | One humanoid card |
| **Weapon Booster** | Contains a random weapon card | 4 hours | One weapon card |

## Timer Mechanics

### Time-Reward Relationship

Players can adjust the timer duration for each booster between 4-24 hours:

- **Minimum Timer**: 4 hours (1% gold card chance)
- **Maximum Timer**: 24 hours (20% gold card chance)
- **Linear Scaling**: Gold card chance increases linearly between these points

The formula for calculating gold card chance is:
```
goldChancePercentage = minChance + ((hours - minHours) / (maxHours - minHours)) * (maxChance - minChance)
```

Where:
- minChance = 1%
- maxChance = 20%
- minHours = 4
- maxHours = 24

### Timer Process

1. Player starts a timer for their selected booster
2. A countdown appears in the Active Timers section
3. When the timer completes, the player can click to open the pack
4. The pack reveals the card that was generated based on the timer duration

## Card Types & Attributes

### Humanoid Cards

Humanoid cards represent characters in the game with the following possible types:

| Card Name | Primary Attribute | Base Stats |
|-----------|-------------------|------------|
| Space Marine | Strength (STR) | STR: 20+bonus, DEX: 20, INT: 20 |
| Galactic Ranger | Dexterity (DEX) | STR: 20, DEX: 20+bonus, INT: 20 |
| Void Sorcerer | Intelligence (INT) | STR: 20, DEX: 20, INT: 20+bonus |

### Weapon Cards

Weapon cards can be equipped by humanoid characters:

| Card Name | Primary Attribute | Base Stats |
|-----------|-------------------|------------|
| Plasma Rifle | Dexterity (DEX) | STR: 10, DEX: 10+bonus, INT: 10 |
| Power Fist | Strength (STR) | STR: 10+bonus, DEX: 10, INT: 10 |
| Psi-Blade | Intelligence (INT) | STR: 10, DEX: 10, INT: 10+bonus |

## Card Rarity System

Cards have three possible rarity levels based on their primary attribute value:

| Rarity | Primary Attribute Value | Visual Indicator |
|--------|------------------------|------------------|
| Bronze | < 28 | Bronze border/background |
| Silver | 28 - 34 | Silver border/background |
| Gold | ≥ 35 | Gold border/background |

### Attribute Generation

1. Each card starts with base attributes (20 for humanoids, 10 for weapons)
2. A bonus is applied to the primary attribute based on the formula:
   ```
   bonus = base * (bonusPercentage / 100)
   ```
3. The final attribute value is rolled randomly between the base value and (base + bonus)
4. The rarity is determined by the final value of the primary attribute

## Technical Implementation

### Core Components

1. **PacksPage**: Main interface for starting timers and viewing active timers
2. **ActiveTimersDisplay**: Shows countdown timers for packs being opened
3. **PackOpener**: Handles the reveal animation and display of obtained cards
4. **Timer API**: Backend services for creating timers and opening packs

### Database Schema

The system relies on several database tables:

- **active_timers**: Tracks ongoing pack timers
  - Fields: id, player_id, pack_type, start_time, target_delay_hours, status
- **player_cards**: Stores all cards owned by players
  - Fields: id, player_id, card_type, card_name, attributes, rarity, obtained_at

### Unlimited Pack System

The system is designed for unlimited pack availability:
- No inventory constraints or pack counters
- Players can start as many timers as they want
- API endpoints skip inventory validation and decrements
- UI shows "Unlimited packs available" instead of inventory counts

## User Experience

### Pack Opening Flow

1. Player navigates to the Packs page
2. Player selects a booster type and adjusts the timer duration
3. Player clicks "Start Timer" to begin the countdown
4. When the timer completes, the pack can be opened
5. The PackOpener component displays the card with a reveal animation
6. The new card is added to the player's collection

## Development Notes

The booster system supports real-time updates through Supabase subscriptions, ensuring timers are always synchronized between devices and sessions. The system also includes error handling for edge cases such as connection issues or failed card generation.
