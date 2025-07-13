# Database Schema Documentation

This document provides a comprehensive overview of the database schema for the Booster Card Game application.

## Tables Overview

The database consists of the following tables:

1. **active_timers** - Tracks active timers for pack opening and other time-based events
2. **battle_instances** - Records battle instances between players
3. **battle_selections** - Stores card selections for battles
4. **card_ownership_history** - Tracks the history of card ownership transfers
5. **cards** - Stores the master list of all cards in the game
6. **notifications** - Stores user notifications
7. **online_players** - Tracks which players are currently online
8. **pack_opening_history** - Records history of pack openings
9. **player_cards** - Links players to the cards they own
10. **player_inventory** - Tracks player's inventory of packs and other items
11. **profiles** - Stores user profile information

## Table Structures

### battle_selections

This table stores the card selections for battles, with one record per battle containing both players' selections.

| Column Name | Data Type | Nullable | Description |
|-------------|-----------|----------|-------------|
| id | uuid | NO | Primary key |
| battle_id | uuid | NO | Foreign key to battle_instances.id |
| player1_id | uuid | YES | Foreign key to profiles.id for the first player |
| player1_card_id | uuid | YES | Foreign key to player_cards.id for the first player's selected card |
| player1_submitted_at | timestamp with time zone | YES | When player 1 submitted their card |
| player2_id | uuid | YES | Foreign key to profiles.id for the second player |
| player2_card_id | uuid | YES | Foreign key to player_cards.id for the second player's selected card |
| player2_submitted_at | timestamp with time zone | YES | When player 2 submitted their card |
| created_at | timestamp with time zone | NO | Record creation timestamp |
| updated_at | timestamp with time zone | NO | Record update timestamp |

**Foreign Key Relationships:**
- battle_id → battle_instances.id
- player1_id → profiles.id
- player1_card_id → player_cards.id
- player2_id → profiles.id
- player2_card_id → player_cards.id

### battle_instances

This table stores information about battle instances between players.

| Column Name | Data Type | Nullable | Description |
|-------------|-----------|----------|-------------|
| id | uuid | NO | Primary key |
| challenger_id | uuid | NO | Foreign key to profiles.id for the challenger |
| opponent_id | uuid | NO | Foreign key to profiles.id for the opponent |
| status | text | NO | Current status of the battle (e.g., 'active', 'cards_revealed', 'in_progress', 'completed') |
| winner_id | uuid | YES | Foreign key to profiles.id for the winner (if battle is completed) |
| created_at | timestamp with time zone | NO | Record creation timestamp |
| updated_at | timestamp with time zone | YES | Record update timestamp |

**Foreign Key Relationships:**
- challenger_id → profiles.id
- opponent_id → profiles.id
- winner_id → profiles.id

### player_cards

This table links players to the cards they own.

| Column Name | Data Type | Nullable | Description |
|-------------|-----------|----------|-------------|
| id | uuid | NO | Primary key |
| player_id | uuid | NO | Foreign key to profiles.id |
| card_id | uuid | NO | Foreign key to cards.id |
| obtained_at | timestamp with time zone | NO | When the player obtained the card |

**Foreign Key Relationships:**
- player_id → profiles.id
- card_id → cards.id

### cards

This table stores the master list of all cards in the game.

| Column Name | Data Type | Nullable | Description |
|-------------|-----------|----------|-------------|
| id | uuid | NO | Primary key |
| name | text | NO | Card name |
| type | text | NO | Card type (e.g., 'humanoid', 'weapon') |
| rarity | text | NO | Card rarity (e.g., 'bronze', 'silver', 'gold') |
| attributes | jsonb | YES | Card attributes stored as JSON |
| created_at | timestamp with time zone | NO | Record creation timestamp |

### player_inventory

This table tracks a player's inventory of packs and other items.

| Column Name | Data Type | Nullable | Description |
|-------------|-----------|----------|-------------|
| id | uuid | NO | Primary key |
| player_id | uuid | YES | Foreign key to profiles.id |
| humanoid_packs | integer | YES | Number of humanoid packs owned |
| weapon_packs | integer | YES | Number of weapon packs owned |
| created_at | timestamp with time zone | YES | Record creation timestamp |

**Foreign Key Relationships:**
- player_id → profiles.id

### profiles

This table stores user profile information.

| Column Name | Data Type | Nullable | Description |
|-------------|-----------|----------|-------------|
| id | uuid | NO | Primary key, foreign key to auth.users.id |
| username | text | YES | User's display name |
| avatar_url | text | YES | URL to user's avatar image |
| updated_at | timestamp with time zone | YES | Record update timestamp |

**Foreign Key Relationships:**
- id → auth.users.id

### card_ownership_history

This table tracks the history of card ownership transfers.

| Column Name | Data Type | Nullable | Description |
|-------------|-----------|----------|-------------|
| id | uuid | NO | Primary key |
| card_id | uuid | NO | Foreign key to player_cards.id |
| previous_owner_id | uuid | NO | Foreign key to auth.users.id |
| new_owner_id | uuid | NO | Foreign key to auth.users.id |
| battle_id | uuid | NO | Foreign key to battle_instances.id |
| transferred_at | timestamp with time zone | YES | When the card was transferred |

**Foreign Key Relationships:**
- card_id → player_cards.id
- previous_owner_id → auth.users.id
- new_owner_id → auth.users.id
- battle_id → battle_instances.id

## Key Design Aspects

### Battle System Structure

The battle system uses three main tables:
- **battle_instances**: Tracks the overall battle state between two players
- **battle_selections**: Stores the card selections for each battle with explicit player1 and player2 fields
- **card_ownership_history**: Records card transfers resulting from battles

The battle flow is managed through the `status` field in the battle_instances table, which can have values like:
- 'active': Battle is active but cards haven't been selected yet
- 'cards_revealed': Both players have selected cards
- 'in_progress': Battle resolution is in progress
- 'completed': Battle has been resolved with a winner

### Card Attributes

Card attributes are stored as JSONB in the cards table, allowing for flexible attribute structures depending on card type. Common attributes include:
- Attack power
- Defense
- Special abilities
- Element type

### Pack System

The game implements an unlimited packs system where:
- Players can own multiple pack types (humanoid_packs, weapon_packs)
- Pack opening is tracked in pack_opening_history
- Cards obtained from packs are added to player_cards

### Real-time Features

The database supports real-time features through:
- **online_players**: Tracks currently online players
- **notifications**: Stores notifications for challenges and other events
- Supabase real-time subscriptions for battle state changes

## Row Level Security (RLS) Policies

The database implements Row Level Security to ensure data access control:
- Players can only access their own inventory and cards
- Battle participants can only access battles they are involved in
- Card selection is restricted to battle participants

## Database Relationships Diagram

```
profiles
  ↑
  |
  +--- player_inventory
  |
  +--- player_cards ----+
  |     ↑               |
  |     |               |
  |     +--- cards      |
  |                     |
  +--- battle_instances-+
        ↑               |
        |               |
  +-----+               |
  |                     |
  +--- battle_selections|
                        |
card_ownership_history --+
```

This diagram shows the key relationships between tables in the database.
