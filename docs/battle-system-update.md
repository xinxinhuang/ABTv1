# Battle System Update: Simultaneous Card Submissions

## Overview

We've redesigned the battle card submission system to allow both players to submit their cards simultaneously without conflicts. This document outlines the changes made to the database schema, backend Edge Functions, and frontend components.

## Database Changes

### Battle Selections Table Redesign

The `battle_selections` table has been redesigned to store both players' selections in a single record:

- **Old Structure**: One row per player selection with columns: `id`, `battle_id`, `player_id`, `player_card_id`, `created_at`
- **New Structure**: One row per battle with columns:
  - `id`
  - `battle_id` (with unique constraint)
  - `player1_id`, `player1_card_id`, `player1_submitted_at`
  - `player2_id`, `player2_card_id`, `player2_submitted_at`
  - `created_at`, `updated_at`

This new structure eliminates race conditions by having a single record that gets updated by both players.

## Backend Changes

### New Edge Function: `select-card-v2`

Created a new Edge Function that handles the updated battle selection logic:

- Checks if a battle selection record exists for the given battle
- If it doesn't exist, creates a new record with the player's card selection
- If it exists, updates the existing record with the player's card selection
- Determines which player fields to update based on the player's role in the battle
- Updates the battle status to `cards_revealed` when both players have submitted their cards

### Updated Edge Function: `resolve-battle`

Modified the resolve-battle function to work with the new battle_selections table structure:

- Updated the query to retrieve both players' card selections from a single record
- Adjusted the logic to extract card details from the new data structure

## Frontend Changes

### Updated Components

1. **CardSelection.tsx**
   - Modified to work with the new battle_selections table structure
   - Updated to call the new `select-card-v2` Edge Function
   - Added toast notifications for user feedback

2. **BattleArena.tsx**
   - Updated to fetch and subscribe to the new battle_selections table structure
   - Modified to extract player card details from the new data structure
   - Updated to pass the correct props to child components

3. **BattleGrid.tsx**
   - Updated to display cards from the new data structure
   - Modified to handle battle resolution with the new system

## Benefits of the New System

1. **Race Condition Elimination**: By using a single record with fields for both players, we eliminate race conditions that occurred when both players submitted cards simultaneously.

2. **Simplified State Management**: The battle state is now easier to track since all selections are in a single record.

3. **Improved User Experience**: Players receive immediate feedback on their card submissions and can see when their opponent has submitted a card.

4. **More Reliable Battle Resolution**: The battle resolution process is more reliable as it always has access to both players' selections in a consistent format.

## Testing

A test script (`test-battle-system.js`) has been created to verify the functionality of the new system, simulating simultaneous card submissions from two players.

## Future Improvements

1. Add more detailed error handling and user feedback
2. Implement animations for card selection and battle resolution
3. Add a battle history feature to review past battles
