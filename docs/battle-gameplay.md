# Battle Gameplay Development Plan

## 1. Overview

This document outlines the development plan for the real-time, turn-based battle gameplay feature. It details the user flow, component architecture, database schema interactions, and the server-side logic required to implement the complete battle sequence.

**Last Updated**: July 12, 2025

## 2. Battle Flow & State Machine

The battle will be managed by a state machine within the `battle_lobbies` table, using the `status` column. The flow is as follows:

1.  **`active`**: The initial state when players are redirected to the battle page. The UI will prompt both players to select a card.
2.  **`player1_selected`**: Player 1 has selected and confirmed their card. Player 2 is still selecting.
3.  **`player2_selected`**: Player 2 has selected and confirmed their card. Player 1 is still selecting.
4.  **`cards_revealed`**: Both players have confirmed their selections. The battle logic is triggered, cards are revealed, and the game log is displayed.
5.  **`completed`**: The battle is over. The winner is announced, and the card ownership transfer is complete. A "Return to Lobby" button is displayed.

## 3. Component Architecture

The battle page (`/game/arena/battle/[battleId]/page.tsx`) will be the main container and will orchestrate the display of the following components based on the current battle state:

-   **`BattleLobbyInfo`**: Displays information about the two players in the battle.
-   **`CardSelector`**: Renders the current player's card collection and allows them to select and confirm one card for battle. This will be hidden after confirmation.
-   **`BattleArena`**: The main view where the selected cards are shown (initially face-down, then revealed). It will display animations or visual cues for the battle.
-   **`GameLog`**: A text-based log that appears after cards are revealed, describing the sequence of events in the battle (e.g., "Player A's Hydra attacks Player B's Griffin...").
-   **`BattleResult`**: A modal or banner that clearly announces the winner and the card that was won.

## 4. Core Game Logic & Winner Determination

The battle outcome is decided based on a clear hierarchy of rules, executed within the `resolve_battle` function.

1.  **Type Advantage (Rock-Paper-Scissors)**: The primary determinant is the card type, which follows a circular advantage system:
    -   **Void Sorcerer** beats **Space Marine**
    -   **Space Marine** beats **Galactic Ranger**
    -   **Galactic Ranger** beats **Void Sorcerer**

2.  **Attribute Tiebreaker**: If both players select cards of the same type, the winner is determined by comparing the relevant primary attribute:
    -   **Space Marines**: Highest **Strength** wins.
    -   **Galactic Rangers**: Highest **Dexterity** wins.
    -   **Void Sorcerers**: Highest **Intelligence** wins.

3.  **Rarity Influence**: Card rarity (Bronze, Silver, Gold) indirectly affects the outcome, as higher rarity cards generally have superior attribute values. However, a high-attribute common card can still beat a low-attribute rare card, preserving strategic depth.

4.  **Final Tie**: In the rare event that the primary attributes are also identical, the battle will be declared a draw. No cards will be exchanged.

## 5. Database & Server-Side Logic

### Table: `battle_cards`

To handle card selections for each battle, the `battle_cards` table is used:

-   **`id`**: Primary Key (UUID)
-   **`battle_id`**: Foreign Key to `battle_instances.id`
-   **`player_id`**: Foreign Key to `profiles.id`
-   **`player_card_id`**: Foreign Key to the selected card in `player_cards.id`
-   **`created_at`**: Timestamp

*Constraint*: A unique constraint on `(battle_id, player_id)` prevents a player from submitting more than one card.

### Supabase Edge Functions

-   **`select-cards`**: This Edge Function is called when a player confirms their card selection.
    1.  Validates that the player is part of the battle.
    2.  Inserts a record into the `battle_cards` table.
    3.  Checks if the other player has also selected their card. If so, it updates the `battle_instances` status to `cards_revealed`.

-   **`resolve-battle`**: This server-authoritative Edge Function is triggered when the status changes to `cards_revealed`.
    1.  Fetches the two selected cards from `battle_cards`.
    2.  Executes the core game logic to determine the winner based on card stats.
    3.  Transfers card ownership by updating the `player_id` in the `player_cards` table for the loser's card.
    4.  Updates the `battle_instances` status to `completed`.
    5.  Inserts a record into the `battle_results` table for historical tracking.

## 6. Implementation Steps

1.  **Create Migration**: Write the SQL script to create the `battle_cards` table and apply it.
2.  **Build UI Shell**: Develop the basic layout of the battle page and the individual components (`CardSelector`, `BattleArena`, etc.) with placeholder data.
3.  **Fetch Data**: Implement logic on the battle page to fetch battle data and the current player's card collection.
4.  **Implement `select-cards`**: Create the `select-cards` Edge Function and wire it up to the `CardSelector` component.
5.  **Real-time State Sync**: Use Supabase real-time subscriptions to listen for changes in the `battle_instances` status and `battle_cards` table to update the UI for both players automatically.
6.  **Implement `resolve-battle`**: Create the `resolve-battle` Edge Function with the core game logic.
7.  **Display Results**: Build the UI to reveal the cards, show the game log, and display the final battle result.

## 7. Recent Improvements (July 12, 2025)

### Route Parameter Standardization

To ensure consistency across the battle system, the following changes have been implemented:

1. **Route Parameter Naming**:
   - Changed from `/battle/[lobbyId]` to `/game/arena/battle/[battleId]`
   - Created a redirect from the old route to the new route for backward compatibility

2. **Database Query Parameters**:
   - Updated all database queries to use `battle_id` consistently instead of `lobby_id`
   - Changed filters in real-time Supabase subscriptions from `lobby_id=eq.${battleId}` to `battle_id=eq.${battleId}`

3. **Component Architecture**:
   - Refactored the battle arena component to use a custom `useBattle` hook
   - Consolidated business logic, state management, and real-time subscriptions into the hook
   - Made the battle page a lean presentational component that renders UI based on hook state

### Edge Function Improvements

1. **Import Resolution**:
   - Updated import statements to use direct URLs instead of relying on the import map
   - Added TypeScript linting directives to suppress non-critical errors

2. **CORS Handling**:
   - Defined CORS headers directly in the function files
   - Added proper handling of OPTIONS preflight requests
   - Made functions more flexible with parameter handling

3. **Battle Flow Reliability**:
   - Fixed card count checking in the battle cards subscription
   - Added detailed logging for battle status transitions
   - Implemented a robust periodic check to ensure battles transition properly
   - Enhanced the battle transition logic to properly load both players' cards