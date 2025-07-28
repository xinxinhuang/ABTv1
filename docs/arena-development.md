# Arena Development Summary

## Current Implementation (as of July 25, 2025)

### Overview

We've implemented a consolidated real-time battle system (V2) for the ABT Booster Game that allows players to create and accept battle challenges with pre-selected humanoid cards. The system follows a "stake and play" model where players put up one of their cards as a stake, with the winner claiming the loser's card plus receiving a bonus card. The battle system follows a rock-paper-scissors style combat mechanic with card type advantages and attribute-based resolution, while leveraging Supabase for player authentication, battle state management, and card ownership transfers.

**Note**: The legacy battle system (V1) has been completely removed as part of a comprehensive code cleanup. All battle functionality now uses the V2 system exclusively.

### Core Features

1. **Real-Time Battle Arena Interface**
   - Challenge creation interface
   - Available challenges listing
   - Face-down card staking system
   - Automated battle resolution
   - Results notification system
   - Match history tracking
   - Card transfer system (winner takes loser's card)
   - Bonus card reward for winners

2. **Card Selection**
   - Access to player's personal card inventory
   - Filtering by card type (Space Marine, Galactic Ranger, Void Sorcerer)
   - Visual selection interface with card preview
   - Card staking confirmation
   - Hidden card information until battle resolution

3. **Battle Mechanics**
   - Type advantage system: Void Sorcerer > Space Marine > Galactic Ranger > Void Sorcerer
   - Attribute-based resolution for same-type battles
   - Consideration of card rarity through their attribute values
   - Automated card ownership transfer system
   - Bonus card generation for winners
   - Risk/reward staking mechanics

### Technical Components

1. **Pages and Components (V2 System)**
   - `src/app/game/arena/page.tsx`: Main arena navigation page
   - `src/app/game/arena/lobby/page.tsx`: Challenge listing and creation page
   - `src/app/game/arena/battle-v2/[id]/page.tsx`: Battle results viewing page (V2)
   - `src/components/game/battle-v2/CreateChallenge.tsx`: Challenge creation interface
   - `src/components/game/battle-v2/ChallengeList.tsx`: Available challenges display
   - `src/components/game/battle-v2/CardSelection.tsx`: Card selection interface
   - `src/components/game/battle-v2/BattleResults.tsx`: Results display component
   - `src/components/game/battle-v2/Notifications.tsx`: Battle notification component
   - `src/components/ui/ScrollArea.tsx`: Custom scroll area for card lists

2. **Hooks and Logic (V2 System)**
   - `src/hooks/battle-v2/useBattleV2.ts`: Main battle hook
   - `src/hooks/battle-v2/useBattleRealtime.ts`: Real-time updates
   - `src/hooks/battle-v2/useCardSelection.ts`: Card selection logic
   - `src/lib/battle-v2/battleResolution.ts`: Battle resolution logic
   - `src/lib/battle-v2/cardTransfer.ts`: Card ownership transfer

3. **Type Definitions (Consolidated)**
   - `src/types/battle-consolidated.ts`: Single source of truth for all battle types
   - Includes both active V2 types and legacy types for backward compatibility
   - Provides clear migration path from legacy implementations

2. **Navigation Integration**
   - Battle Arena section in main navigation
   - Challenge count badge showing available challenges
   - Notification indicator for completed battles
   - Battle history access in user profile
   - Consistent navigation structure with other game sections

3. **Visual Design**
   - Animated battle sequence with networked synchronization
   - Card highlight for winners
   - Type advantage explanation
   - Player avatars and profile displays
   - Battle spectator mode UI
   - Consistent UI with the rest of the application

## Implementation Details

### Card Ownership & Staking System

The battle system includes a high-stakes card transfer mechanic:
1. All cards are permanently branded with their original owner's ID
2. When entering a battle, players stake their selected card
3. The winner claims the loser's card, which is transferred to their inventory
4. Transferred cards maintain their original owner's branding
5. Players can view a card's ownership history
6. Optional practice mode allows battles without card staking

### Online Battle System

The online battle system uses Supabase for authentication and real-time capabilities:
1. Players connect to the battle lobby and see online opponents
2. Challenge requests can be sent to online players, indicating stake/no-stake mode
3. When accepted, a dedicated battle instance is created
4. Both players select cards from their own inventories
5. Battle state is synchronized in real-time via Supabase channels
6. Card ownership transfer is processed automatically after battle completion

### Battle Logic

The battle logic follows these steps:
1. Compare card types for inherent type advantages
2. If same type, compare primary attribute values
3. If still tied, declare a draw

```typescript
// Type advantage system: Void Sorcerer > Space Marine > Galactic Ranger > Void Sorcerer
if (card1.card_name === 'Void Sorcerer' && card2.card_name === 'Space Marine') {
  return { winner: 'player1', message: 'Void Sorcerer\'s mystical powers overwhelm Space Marine!' };
} else if (card1.card_name === 'Space Marine' && card2.card_name === 'Galactic Ranger') {
  return { winner: 'player1', message: 'Space Marine\'s brute strength overcomes Galactic Ranger!' };
} else if (card1.card_name === 'Galactic Ranger' && card2.card_name === 'Void Sorcerer') {
  return { winner: 'player1', message: 'Galactic Ranger\'s speed outwits Void Sorcerer!' };
}
// ... similar logic for player2 winning scenarios
```

### User Flow

#### Creating a Challenge
1. Player navigates to Arena page
2. Player selects "Create Challenge" button
3. Player browses their collection to select a card to stake
4. Player confirms challenge creation
5. System creates battle instance with status "awaiting_opponent"
6. Challenge appears in the arena lobby for other players

#### Accepting a Challenge
1. Player navigates to Arena lobby
2. Player views list of available challenges
3. Player selects a challenge to accept
4. Player browses their collection to select a card to stake
5. Player confirms challenge acceptance
6. System updates battle status to "in_progress" and automatically resolves the battle
7. System determines the winner based on card types and attributes
8. System transfers the loser's card to the winner's collection
9. System generates a bonus card for the winner
10. Both players receive notifications about battle completion

#### Viewing Results
1. Player receives notification about battle completion
2. Player navigates to battle results page
3. Player views both cards and battle outcome explanation
4. Winner sees confirmation of card transfer and bonus card
5. Players can request a rematch or return to lobby

## Current Implementation

### Database Schema

The online battle system uses the following Supabase tables:

```sql
-- Online player tracking
create table public.battle_instances (
  id uuid references auth.users not null primary key,
  challenger_id uuid references auth.users not null,
  opponent_id uuid references auth.users,
  status text default 'awaiting_opponent' check (status in ('awaiting_opponent', 'in_progress', 'completed')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  winner_id uuid references auth.users,
  completed_at timestamp with time zone
);

-- battle_cards: Tracks cards staked for each battle
create table public.battle_cards (
  id uuid default uuid_generate_v4() primary key,
  battle_id uuid references public.battle_instances not null,
  player_id uuid references auth.users not null,
  card_id uuid references public.cards not null,
  created_at timestamp with time zone default now(),
  is_hidden boolean default true
);

-- battle_results: Records battle outcomes
create table public.battle_results (
  id uuid default uuid_generate_v4() primary key,
  battle_id uuid references public.battle_instances not null,
  winner_id uuid references auth.users not null,
  loser_id uuid references auth.users not null,
  explanation text not null,
  created_at timestamp with time zone default now(),
  transferred_card_id uuid references public.cards not null,
  bonus_card_id uuid references public.cards not null
);

-- battle_notifications: Stores notifications for players
create table public.battle_notifications (
  id uuid default uuid_generate_v4() primary key,
  battle_id uuid references public.battle_instances not null,
  user_id uuid references auth.users not null,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- card_ownership_history: Tracks card ownership history
create table public.card_ownership_history (
  id uuid default uuid_generate_v4() primary key,
  card_id uuid references public.cards not null,
  previous_owner_id uuid references auth.users not null,
  new_owner_id uuid references auth.users not null,
  battle_id uuid references public.battle_instances not null,
  transferred_at timestamp with time zone default now()
);
```

### Real-time Communication

The system uses Supabase's real-time channels for:

- Player online status updates
- Battle challenge requests and responses
- Card selection synchronization
- Battle state broadcasting
- Chat messages during battles
- Card ownership transfer notifications

## Future Development Plans

### Short-term Enhancements

1. **Weapon Card Integration**
   - Allow players to equip weapon cards to their humanoid cards
   - Create stat bonuses based on weapon-humanoid combinations
   - Add visual indicators for equipped weapons
   - Synchronize weapon equipment status in online battles

2. **Enhanced Battle Statistics**
   - Global and player-specific leaderboards
   - ELO-style ranking system
   - Track win/loss records against specific opponents
   - Calculate win rates for different card types
   - Card acquisition/loss statistics
   - Original card creation vs. captured card metrics
   - Detailed battle analytics dashboard

3. **UI Improvements**
   - Add more detailed battle animations
   - Improve visual feedback during combat
   - Add sound effects

### Medium-term Features

1. **Advanced Matchmaking System**
   - Skill-based matchmaking using ELO ratings
   - Scheduled tournaments with automatic brackets
   - Custom game modes with special rules
   - Spectator mode for popular matches

2. **Card Special Abilities**
   - Add unique abilities to gold and silver cards
   - Create ability activation animations
   - Balance abilities across card types

### Long-term Vision

1. **Season-based Competitive System**
   - Seasonal resets and rewards
   - Special seasonal cards and cosmetics
   - Division-based ranking system
   - Professional tournament integration

2. **Tournament System**
   - Scheduled tournaments with prizes
   - Bracket-style elimination rounds
   - Tournament history and champions list

3. **Deck Building**
   - Allow players to create card combinations
   - Add team bonuses for themed decks
   - Save and share deck configurations

## Technical Architecture & Considerations

### Supabase Real-time Strengths

1. **WebSocket-based Channels**
   - Supabase uses WebSockets under the hood, providing low latency communication
   - Perfect for real-time battle synchronization and turn-based combat
   - Enables instant updates for card selections and battle state changes

2. **Built-in Presence Tracking**
   - The `online_players` table with last_seen timestamps leverages Supabase's presence tracking
   - Simplifies online player discovery without building custom presence systems
   - Automatically handles player status updates (online, in-battle, away)

3. **Atomic Transactions**
   - Card ownership transfers require bulletproof data integrity
   - Supabase's PostgreSQL backend provides ACID compliance for critical operations
   - Ensures cards are never duplicated or lost during transfers between players

4. **Row-level Security**
   - Battle data is secured so players can only see appropriate information
   - Prevents cheating by restricting access to opponent's card selection until revealed
   - Enables secure spectator mode with limited data visibility

### Implementation Example

```typescript
// Connection state management for battle instances
const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');

// Handle battle channel subscription with reconnection handling
const battleChannel = supabase.channel(`battle:${battleId}`)
  .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'battle_instances', filter: `id=eq.${battleId}` },
      handleBattleStateChange
  )
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'battle_cards' },
      handleCardSelection
  )
  .on('system', { event: 'error' }, () => {
    setConnectionState('disconnected');
    showReconnectionUI();
  })
  .on('system', { event: 'reconnect' }, () => {
    setConnectionState('reconnecting');
    showReconnectingIndicator();
  })
  .on('system', { event: 'connected' }, () => {
    setConnectionState('connected');
    hideConnectionIndicators();
  })
  .subscribe();

// Cleanup on component unmount
useEffect(() => {
  return () => {
    battleChannel.unsubscribe();
  };
}, []);
```

### Technical Challenges & Optimizations

1. **Connection Handling**
   - Supabase real-time can have hiccups with reconnection logic
   - Implementing robust error handling for when players lose connection mid-battle
   - Providing clear UI feedback during connection state changes
   - Ability to resume battles from last known state after reconnection

2. **Scaling Limits**
   - Supabase has connection limits (up to 200 concurrent real-time connections on paid plans)
   - Implementing connection pooling for high-traffic periods
   - Potential sharding strategy for battle data as player base grows
   - Monitoring connection usage and implementing graceful degradation

3. **Card Balance**
   - The rock-paper-scissors system needs further balance testing
   - Higher rarity cards may create balance issues
   - Analytics-driven balance adjustments
   - Monitoring card win rates and ownership transfers

### Conflict Resolution Strategies

#### The Core Problem

In real-time battles, network latency creates timing conflicts. When two players make actions "simultaneously," the server might receive them in different orders, or one player might see outdated game state. This is especially critical in our card staking system where valuable cards can change ownership.

#### 1. Card Selection Race Conditions

```typescript
// BAD: Both players select cards at same time
// Player A selects card, UI shows "waiting for opponent"
// Player B selects card, but sees Player A as "not ready"
// Result: Confusing state where both think they're waiting

// GOOD: Optimistic updates with rollback
const selectCard = async (cardId: string) => {
  // Optimistic update - show immediately
  setSelectedCard(cardId);
  setStatus('ready');
  
  try {
    const { error } = await supabase
      .from('battle_cards')
      .insert({ battle_id, player_id, card_id: cardId });
    
    if (error) {
      // Rollback on conflict
      setSelectedCard(null);
      setStatus('selecting');
      showError('Card already selected by opponent');
    }
  } catch (err) {
    // Network error rollback
    setSelectedCard(null);
    setStatus('selecting');
  }
};
```

#### 2. Battle State Synchronization

```typescript
// BAD: Trust client state
// Player A sees "I won!" 
// Player B sees "I won!"
// Both clients calculated different results

// GOOD: Server-authoritative with optimistic prediction
const handleBattleResult = (localResult: BattleResult) => {
  // Show optimistic result immediately
  setLocalResult(localResult);
  setShowingResult(true);
  
  // But wait for server confirmation
  const channel = supabase.channel(`battle-${battleId}`)
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'battle_instances' },
      (payload) => {
        const serverResult = payload.new.result;
        if (serverResult !== localResult) {
          // Server overrides client prediction
          setLocalResult(serverResult);
          showNotification('Battle result updated by server');
        }
      }
    ).subscribe();
};
```

#### 3. Card Ownership Transfer Conflicts

This is critical since cards have real value:

```typescript
// DANGEROUS: Race condition in card transfer
// What if both players think they won?
// What if network fails mid-transfer?
// What if the same card gets transferred twice?

// SAFER: Atomic transaction with conflict detection
const transferCard = async (winnerId: string, loserId: string, cardId: string) => {
  const { data, error } = await supabase.rpc('transfer_card_atomic', {
    battle_id: battleId,
    winner_id: winnerId,
    loser_id: loserId,
    card_id: cardId
  });
  
  if (error?.code === 'CONFLICT') {
    // Handle duplicate transfer attempt
    await syncBattleState();
    return;
  }
};
```

#### 4. Connection Drop During Critical Moments

```typescript
// Player disconnects right as they're about to lose
// System needs to handle this gracefully

const handleDisconnection = () => {
  // Set battle to "paused" state
  // Give player 30 seconds to reconnect
  // If no reconnection, award victory to connected player
  // Still process card transfer
  
  setTimeout(() => {
    if (!playerReconnected) {
      completeBattleByDefault(connectedPlayerId);
    }
  }, 30000);
};
```

#### 5. Battle State Machine

```typescript
type BattleState = 'waiting' | 'selecting' | 'ready' | 'battling' | 'completed';

const validateStateTransition = (from: BattleState, to: BattleState) => {
  const validTransitions = {
    'waiting': ['selecting'],
    'selecting': ['ready', 'waiting'],
    'ready': ['battling', 'selecting'],
    'battling': ['completed'],
    'completed': []
  };
  
  return validTransitions[from]?.includes(to) || false;
};
```

#### 6. Atomic Card Transfer Database Function

```sql
-- PostgreSQL function for atomic card transfer
CREATE OR REPLACE FUNCTION transfer_card_atomic(
  battle_id UUID,
  winner_id UUID,
  loser_id UUID,
  card_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Check if battle is actually completed and winner is correct
  IF NOT EXISTS (
    SELECT 1 FROM battle_instances 
    WHERE id = battle_id AND winner_id = winner_id AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Invalid battle state for transfer';
  END IF;
  
  -- Atomic transfer with ownership history
  UPDATE player_cards SET owner_id = winner_id WHERE id = card_id;
  INSERT INTO card_ownership_history (...) VALUES (...);
  
  -- Mark transfer as completed
  UPDATE battle_instances SET transfer_completed = true WHERE id = battle_id;
END;
$$ LANGUAGE plpgsql;
```

#### 7. Client-Side Reconciliation

```typescript
// Periodically sync with server state
const reconcileBattleState = async () => {
  const { data: serverState } = await supabase
    .from('battle_instances')
    .select('*')
    .eq('id', battleId)
    .single();
    
  if (serverState.status !== localBattleState.status) {
    // Server state differs from local - server wins
    setLocalBattleState(serverState);
    showNotification('Battle state synchronized with server');
  }
};
```

#### Key Implementation Principles

For our high-stakes battle system with card ownership transfers, we follow these critical principles:

1. **Server-authoritative battle results** - Never trust client calculations
2. **Atomic database transactions** - Card transfers must be bulletproof
3. **Optimistic UI updates** - Show immediate feedback, but allow server corrections
4. **Graceful rollback** - When conflicts happen, reset gracefully
5. **Connection state management** - Handle disconnections fairly

## Conclusion

The real-time battle arena system transforms the ABT Booster Game into a high-stakes competitive experience with a unique "challenge and claim" mechanic. Players can create battle challenges by staking cards face-down, which other players can accept. This real-time approach requires both players to be online simultaneously, creating an intense and immediate PvP competition.

The card staking mechanic where winners claim the loser's card plus receive a bonus card creates a compelling risk-reward dynamic. This system successfully leverages Supabase's database capabilities to handle battle state management, card transfers, and notifications automatically without requiring real-time player interaction during the battle itself.

The integration with the existing unlimited card pack mechanics provides players with a complete progression loop: opening packs to collect cards, strategically staking them in battles, and growing their collection through victories. Future development will focus on expanding the challenge system with filters and tournaments, implementing card special abilities, and creating a thriving battle community driven by the high-stakes card economy.

---

*Last Updated: July 25, 2025*  
*Code Cleanup Completed: Battle V1 system removed, V2 system consolidated*
