# Battle System V1 Usage Analysis Report

## Executive Summary

The analysis identified **13 battle v1 related files** with **136 usage references** and **6 route references**. Most battle v1 components are still actively used, particularly through a test page and internal cross-references.

## Key Findings

### Battle V1 Files Found

1. **Hook Files (Active)**:
   - `src/hooks/battle/index.ts` - Main export file
   - `src/hooks/battle/useBattleData.ts` - Battle data management
   - `src/hooks/battle/useBattleResolution.ts` - Battle resolution logic
   - `src/hooks/battle/useBattleSubscriptions.ts` - Real-time subscriptions
   - `src/hooks/battle/useCardFetching.ts` - Card fetching utilities
   - `src/hooks/battle/useCountdown.ts` - Countdown timer functionality
   - `src/hooks/useBattle.ts` - Main battle hook

2. **Logic Files (Active)**:
   - `src/lib/battle/battleLogic.ts` - Core battle logic functions

3. **Page Files (Potentially Unused)**:
   - `src/app/battle/page.tsx` - Battle page component
   - `src/app/battle/[lobbyId]/page.tsx` - Dynamic battle lobby page

4. **Test Files (Safe to Remove)**:
   - `src/hooks/battle/__tests__/useBattleData.test.ts`
   - `src/hooks/battle/__tests__/useCountdown.test.ts`

### Usage Analysis

#### Active Usage
- **Test Page Usage**: `src/app/test/hooks/page.tsx` imports and uses `useCountdown` from battle v1
- **Cross-References**: Battle v1 hooks reference each other through the index file
- **Battle Logic**: `useBattle.ts` imports and uses `determineBattleWinner` from `battleLogic.ts`

#### Route References
- **Legacy Routes**: Found 6 route references to `/battle/` paths
- **Redirect Logic**: `src/app/battle/[lobbyId]/page.tsx` redirects to `/game/arena/battle/`
- **Navigation**: `BattleHistory.tsx` component has navigation to `/battle/` routes

### Risk Assessment

#### High Risk (Cannot Remove)
- All hook files in `src/hooks/battle/` - actively used by test page
- `src/hooks/useBattle.ts` - contains battle logic still referenced
- `src/lib/battle/battleLogic.ts` - core functions used by useBattle.ts

#### Medium Risk (Requires Review)
- `src/app/battle/` pages - may be legacy routes but have redirect logic

#### Low Risk (Safe to Remove)
- Test files in `__tests__/` directories
- Files with no external references

## Recommendations

### Immediate Actions
1. **Keep Battle V1 System**: The battle v1 system is still actively used, particularly by test pages
2. **Remove Test Files**: The test files can be safely removed as they have no external dependencies
3. **Review Route Pages**: The `/battle/` route pages appear to be redirects and may be candidates for removal

### Future Cleanup Strategy
1. **Migration Path**: Before removing battle v1, migrate the test page to use battle-v2 hooks
2. **Route Consolidation**: Update any remaining `/battle/` route references to use `/game/arena/battle-v2/`
3. **Gradual Removal**: Once all external references are migrated, remove battle v1 files in dependency order

### Files Safe for Immediate Removal
```
src/hooks/battle/__tests__/useBattleData.test.ts
src/hooks/battle/__tests__/useCountdown.test.ts
```

### Files Requiring Migration Before Removal
```
src/hooks/battle/ (entire directory)
src/hooks/useBattle.ts
src/lib/battle/battleLogic.ts
```

## Conclusion

The battle v1 system cannot be safely removed at this time due to active usage. A migration strategy should be implemented to move remaining dependencies to battle-v2 before attempting cleanup.