# Type Definition Analysis Report

## Executive Summary

The analysis of battle type definitions found **18 total types** across `battle.ts` and `battle-v2.ts` files, with **3 duplicate type definitions** that require consolidation. All duplicates are marked as high severity due to conflicting definitions between the two files.

## Key Findings

### Duplicate Types (High Priority)

1. **BattleInstance**
   - **Files**: `battle.ts` and `battle-v2.ts`
   - **Issue**: Different property sets between versions
   - **V1 Properties**: `id`, `created_at`, `challenger_id`, `opponent_id`, `status`, `winner_id`, `completed_at`, `turn`, `transfer_completed`, `explanation`, `updated_at`
   - **V2 Properties**: `id`, `created_at`, `challenger_id`, `opponent_id`, `status`, `winner_id`, `completed_at`, `updated_at`
   - **Recommendation**: Consolidate to V2 definition, migrate V1 usage

2. **BattleState**
   - **Files**: `battle.ts` and `battle-v2.ts`
   - **Issue**: Completely different structures
   - **V1**: Legacy game state with player health, decks, hands (marked deprecated)
   - **V2**: Modern React state with battle instance, cards, phase, loading states
   - **Recommendation**: Remove deprecated V1 definition, use V2 exclusively

3. **BattleStatus**
   - **Files**: `battle.ts` and `battle-v2.ts`
   - **Issue**: Different status value sets
   - **V1 Values**: `'awaiting_opponent' | 'in_progress' | 'completed' | 'selecting' | 'cards_revealed' | 'active' | 'pending' | 'cancelled' | 'declined'`
   - **V2 Values**: `'pending' | 'active' | 'cards_revealed' | 'in_progress' | 'completed'`
   - **Recommendation**: Consolidate to V2 definition, cleaner and more focused

### Deprecated Types (Can Be Removed)

1. **BattleLobby** (battle.ts)
   - Marked as deprecated with comment: "Use BattleInstance instead"
   - Safe to remove after confirming no active usage

2. **BattleState** (battle.ts)
   - Marked as deprecated with comment: "No longer used, replaced by direct queries"
   - Safe to remove after confirming no active usage

### V2-Only Types (Modern Implementation)

The following types exist only in `battle-v2.ts` and represent the current implementation:

- **HumanoidCard**: Extends Card with humanoid-specific constraints
- **BattlePhase**: Modern phase management (`'loading' | 'card_selection' | 'cards_revealed' | 'battle_in_progress' | 'battle_completed' | 'error'`)
- **BattleAction**: User actions in V2 system
- **BattleRealtimeEvent**: Real-time event structure
- **CardSelectionState**: Card selection UI state
- **BattleParticipant**: Participant information
- **BattleResult**: Battle outcome details
- **BattleError**: Structured error handling
- **BattleErrorCode**: Error code enumeration

### V1-Only Types (Legacy Implementation)

The following types exist only in `battle.ts`:

- **BattleCard**: UI card representation (may still be useful)
- **BattleSelection**: Database table mapping (may still be needed)

## Consolidation Strategy

### Phase 1: Remove Deprecated Types
1. Remove deprecated `BattleLobby` interface from `battle.ts`
2. Remove deprecated `BattleState` interface from `battle.ts`
3. Update any remaining imports

### Phase 2: Consolidate Duplicate Types
1. **BattleStatus**: 
   - Use V2 definition as primary
   - Update all imports to reference `battle-v2.ts`
   - Map any legacy status values to V2 equivalents

2. **BattleInstance**:
   - Use V2 definition as primary
   - Migrate any code using V1-specific properties (`turn`, `transfer_completed`, `explanation`)
   - Update all imports to reference `battle-v2.ts`

3. **BattleState**:
   - Remove V1 definition (already deprecated)
   - Ensure all code uses V2 definition

### Phase 3: Evaluate Remaining V1 Types
1. **BattleCard**: Determine if still needed or if can be replaced by `HumanoidCard`
2. **BattleSelection**: Verify if still needed for database operations

## Implementation Priority

### High Priority (Immediate Action Required)
- Resolve `BattleStatus` duplication - most likely to cause import conflicts
- Remove deprecated `BattleState` from V1 - already marked for removal
- Consolidate `BattleInstance` definitions

### Medium Priority (Next Sprint)
- Remove deprecated `BattleLobby` interface
- Evaluate and potentially remove `BattleCard` and `BattleSelection`

### Low Priority (Future Cleanup)
- Consider moving all battle types to a single consolidated file
- Add comprehensive JSDoc documentation to all types

## Risk Assessment

### Low Risk
- Removing deprecated types (already marked for removal)
- Consolidating `BattleStatus` (straightforward value mapping)

### Medium Risk
- Consolidating `BattleInstance` (requires property migration)
- Removing `BattleCard` and `BattleSelection` (need usage analysis)

### High Risk
- None identified - all changes are well-documented and have clear migration paths

## Estimated Impact

- **Files to modify**: ~10-15 files (based on import usage)
- **Lines of code reduced**: ~50-75 lines
- **Type safety improvement**: High (eliminates conflicting definitions)
- **Developer experience**: Significantly improved (single source of truth)

## Next Steps

1. Run usage analysis to identify all files importing duplicate types
2. Create migration scripts for updating imports
3. Implement consolidation in dependency order
4. Update tests to use consolidated types
5. Verify no runtime errors after consolidation