# Migration Guide: Post-Cleanup Code Organization

## Overview

This guide helps developers understand the new code organization after the comprehensive cleanup and provides best practices to prevent similar technical debt in the future. The cleanup consolidated the battle system, optimized imports, and established clear architectural patterns.

## Battle System Migration

### What Changed

The application previously had two battle systems running in parallel:
- **Battle System V1** (Legacy): `src/hooks/battle/`, `src/lib/battle/`, routes at `/game/arena/battle/[battleId]`
- **Battle System V2** (Current): `src/hooks/battle-v2/`, `src/lib/battle-v2/`, routes at `/game/arena/battle-v2/[battleId]`

**After cleanup**: Only Battle System V2 remains as the single source of truth.

### Migration Steps for Developers

#### 1. Update Import Statements

**Before (V1 - No longer available):**
```typescript
// ❌ These imports will fail
import { useBattle } from '@/hooks/useBattle';
import { battleLogic } from '@/lib/battle/battleLogic';
import { BattleStatus } from '@/types/battle';
```

**After (V2 - Current system):**
```typescript
// ✅ Use these imports instead
import { useBattleV2 } from '@/hooks/battle-v2/useBattleV2';
import { resolveBattle } from '@/lib/battle-v2/battleResolution';
import { BattleStatus } from '@/types/battle-consolidated';
```

#### 2. Update Route References

**Before:**
```typescript
// ❌ Old route - no longer functional
router.push(`/game/arena/battle/${battleId}`);
```

**After:**
```typescript
// ✅ New route - fully functional
router.push(`/game/arena/battle-v2/${battleId}`);
```

#### 3. Update Type Imports

**Before (Multiple sources):**
```typescript
// ❌ Fragmented type imports
import { BattleStatus } from '@/types/battle';
import { BattleInstance } from '@/types/battle-v2';
import { BattleCard } from '@/types/battle';
```

**After (Consolidated):**
```typescript
// ✅ Single source of truth
import { 
  BattleStatus, 
  BattleInstance, 
  HumanoidCard 
} from '@/types/battle-consolidated';
```

## Type System Organization

### New Type Hierarchy

The cleanup established a clear type hierarchy with backward compatibility:

```
src/types/battle-consolidated.ts (Primary)
├── Core Types (V2 - Active System)
│   ├── BattleStatus
│   ├── BattleInstance  
│   ├── HumanoidCard
│   ├── BattleState
│   └── BattleResult
├── Legacy Types (V1 - Deprecated but Compatible)
│   ├── LegacyBattleStatus
│   ├── LegacyBattleInstance
│   └── LegacyBattleCard
└── Type Aliases (Backward Compatibility)
    ├── BattleStatusLegacy
    └── BattleCard
```

### Best Practices for Type Usage

#### 1. Prefer V2 Types for New Code

**✅ Recommended:**
```typescript
import { BattleInstance, HumanoidCard, BattleStatus } from '@/types/battle-consolidated';

function createBattle(challenger: string, opponent: string): BattleInstance {
  return {
    id: generateId(),
    challenger_id: challenger,
    opponent_id: opponent,
    status: 'pending' as BattleStatus,
    created_at: new Date().toISOString()
  };
}
```

#### 2. Gradual Migration for Existing Code

**⚠️ Acceptable during transition:**
```typescript
// Use legacy types temporarily, but plan migration
import { LegacyBattleInstance } from '@/types/battle-consolidated';

// TODO: Migrate to BattleInstance when refactoring this component
function legacyBattleHandler(battle: LegacyBattleInstance) {
  // existing logic
}
```

#### 3. Avoid Direct battle.ts and battle-v2.ts Imports

**❌ Avoid:**
```typescript
// Don't import directly from these files
import { BattleStatus } from '@/types/battle';
import { BattleInstance } from '@/types/battle-v2';
```

**✅ Use consolidated types:**
```typescript
// Always use the consolidated file
import { BattleStatus, BattleInstance } from '@/types/battle-consolidated';
```

## Import Organization Standards

### Standard Import Order

All files should follow this 4-tier import organization:

```typescript
// 1. Type-only imports (first)
import type { NextPage } from 'next';
import type { BattleInstance } from '@/types/battle-consolidated';

// 2. External library imports
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

// 3. Internal imports (using @/ alias)
import { useBattleV2 } from '@/hooks/battle-v2/useBattleV2';
import { Button } from '@/components/ui/button';
import { BattleCard } from '@/components/game/battle-v2/BattleCard';

// 4. Relative imports (./filename)
import { localUtility } from './utils';
import styles from './BattlePage.module.css';
```

### Import Path Guidelines

#### 1. Use Absolute Paths for Internal Imports

**✅ Recommended:**
```typescript
import { useBattleV2 } from '@/hooks/battle-v2/useBattleV2';
import { BattleCard } from '@/components/game/battle-v2/BattleCard';
```

**❌ Avoid deep relative paths:**
```typescript
import { useBattleV2 } from '../../../hooks/battle-v2/useBattleV2';
import { BattleCard } from '../../components/game/battle-v2/BattleCard';
```

#### 2. Consolidate Multiple Imports from Same Module

**✅ Recommended:**
```typescript
import { 
  BattleInstance, 
  BattleStatus, 
  HumanoidCard,
  BattleResult 
} from '@/types/battle-consolidated';
```

**❌ Avoid multiple import statements:**
```typescript
import { BattleInstance } from '@/types/battle-consolidated';
import { BattleStatus } from '@/types/battle-consolidated';
import { HumanoidCard } from '@/types/battle-consolidated';
import { BattleResult } from '@/types/battle-consolidated';
```

#### 3. Remove Unused Imports Regularly

Use ESLint or IDE features to identify and remove unused imports:

```typescript
// ❌ Unused import - should be removed
import { useState } from 'react'; // Not used in component

// ✅ Only import what you use
import { useEffect } from 'react'; // Actually used
```

## Component Architecture Guidelines

### Battle Component Structure

The new battle system follows a clear component hierarchy:

```
src/components/game/battle-v2/
├── BattlePage.tsx (Main battle page)
├── BattleCard.tsx (Card display component)
├── BattleStatus.tsx (Status indicator)
├── CardSelection.tsx (Card selection UI)
└── BattleResult.tsx (Result display)
```

### Hook Organization

Battle-related hooks are organized in a dedicated directory:

```
src/hooks/battle-v2/
├── useBattleV2.ts (Main battle hook)
├── useBattleRealtime.ts (Real-time updates)
├── useCardSelection.ts (Card selection logic)
└── useBattleResult.ts (Result handling)
```

### Best Practices for New Components

#### 1. Follow Naming Conventions

**✅ Recommended naming:**
```typescript
// Components: PascalCase with descriptive names
BattleCardSelection.tsx
BattleStatusIndicator.tsx
HumanoidCardDisplay.tsx

// Hooks: camelCase starting with 'use'
useBattleV2.ts
useCardSelection.ts
useRealtime.ts

// Utilities: camelCase with descriptive names
battleResolution.ts
cardComparison.ts
realtimeHelpers.ts
```

#### 2. Use Proper Type Annotations

**✅ Recommended:**
```typescript
import type { BattleInstance, HumanoidCard } from '@/types/battle-consolidated';

interface BattleCardProps {
  card: HumanoidCard;
  battle: BattleInstance;
  onSelect: (cardId: string) => void;
}

export function BattleCard({ card, battle, onSelect }: BattleCardProps) {
  // Component implementation
}
```

#### 3. Implement Proper Error Boundaries

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function BattlePage() {
  return (
    <ErrorBoundary fallback={<BattleErrorFallback />}>
      <BattleContent />
    </ErrorBoundary>
  );
}
```

## Preventing Technical Debt

### 1. Regular Code Reviews

**Checklist for code reviews:**
- [ ] Are imports organized according to the 4-tier standard?
- [ ] Are unused imports removed?
- [ ] Are types imported from `battle-consolidated.ts`?
- [ ] Are absolute paths used for internal imports?
- [ ] Are components properly typed?
- [ ] Is the battle-v2 system being used (not v1)?

### 2. Automated Tools Setup

#### ESLint Configuration

Add these rules to prevent common issues:

```json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "import/no-unused-modules": "error",
    "import/order": [
      "error",
      {
        "groups": [
          "type",
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "pathGroups": [
          {
            "pattern": "@/**",
            "group": "internal"
          }
        ],
        "pathGroupsExcludedImportTypes": ["type"]
      }
    ]
  }
}
```

#### Pre-commit Hooks

Set up pre-commit hooks to run cleanup automatically:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### 3. Documentation Standards

#### Component Documentation

```typescript
/**
 * BattleCard component displays a humanoid card in the battle interface
 * 
 * @param card - The humanoid card to display
 * @param battle - Current battle instance
 * @param onSelect - Callback when card is selected
 * 
 * @example
 * ```tsx
 * <BattleCard 
 *   card={humanoidCard} 
 *   battle={battleInstance}
 *   onSelect={handleCardSelect}
 * />
 * ```
 */
export function BattleCard({ card, battle, onSelect }: BattleCardProps) {
  // Implementation
}
```

#### Type Documentation

```typescript
/**
 * Represents a battle instance in the V2 system
 * 
 * @interface BattleInstance
 * @property {string} id - Unique battle identifier
 * @property {BattleStatus} status - Current battle status
 * @property {string} challenger_id - ID of the challenging player
 * @property {string} opponent_id - ID of the opponent player
 */
export interface BattleInstance {
  id: string;
  status: BattleStatus;
  challenger_id: string;
  opponent_id: string;
  // ... other properties
}
```

### 4. Regular Maintenance Schedule

#### Weekly Tasks
- [ ] Review and remove unused imports
- [ ] Check for new duplicate code
- [ ] Update type imports to use consolidated types

#### Monthly Tasks
- [ ] Run comprehensive import optimization
- [ ] Review component organization
- [ ] Update documentation
- [ ] Check for unused files

#### Quarterly Tasks
- [ ] Full codebase analysis
- [ ] Technical debt assessment
- [ ] Architecture review
- [ ] Performance optimization

## Common Migration Scenarios

### Scenario 1: Updating Existing Battle Component

**Before:**
```typescript
import { useBattle } from '@/hooks/useBattle';
import { BattleStatus } from '@/types/battle';

export function OldBattleComponent() {
  const { battle, selectCard } = useBattle();
  // ... component logic
}
```

**After:**
```typescript
import { useBattleV2 } from '@/hooks/battle-v2/useBattleV2';
import { BattleStatus } from '@/types/battle-consolidated';

export function UpdatedBattleComponent() {
  const { battle, selectCard } = useBattleV2();
  // ... updated component logic
}
```

### Scenario 2: Creating New Battle Feature

**✅ Recommended approach:**
```typescript
import type { BattleInstance, HumanoidCard } from '@/types/battle-consolidated';
import { useBattleV2 } from '@/hooks/battle-v2/useBattleV2';
import { BattleCard } from '@/components/game/battle-v2/BattleCard';

export function NewBattleFeature() {
  const { battle, cards } = useBattleV2();
  
  return (
    <div>
      {cards.map(card => (
        <BattleCard 
          key={card.id} 
          card={card} 
          battle={battle}
          onSelect={handleSelect}
        />
      ))}
    </div>
  );
}
```

### Scenario 3: Handling Legacy Code

**Gradual migration approach:**
```typescript
// Step 1: Update imports to consolidated types
import { 
  BattleInstance, 
  LegacyBattleInstance // Use legacy type temporarily
} from '@/types/battle-consolidated';

// Step 2: Create adapter function if needed
function adaptLegacyBattle(legacy: LegacyBattleInstance): BattleInstance {
  return {
    id: legacy.id,
    status: legacy.status as BattleStatus,
    challenger_id: legacy.challenger_id,
    opponent_id: legacy.opponent_id || '',
    created_at: legacy.created_at
  };
}

// Step 3: Gradually update component logic
export function TransitioningComponent() {
  // Use adapter during transition period
  const adaptedBattle = adaptLegacyBattle(legacyBattle);
  // ... rest of component
}
```

## Troubleshooting Common Issues

### Issue 1: Import Errors After Cleanup

**Error:** `Module not found: Can't resolve '@/hooks/useBattle'`

**Solution:**
```typescript
// ❌ Old import
import { useBattle } from '@/hooks/useBattle';

// ✅ New import
import { useBattleV2 } from '@/hooks/battle-v2/useBattleV2';
```

### Issue 2: Type Errors with Battle Types

**Error:** `Type 'LegacyBattleStatus' is not assignable to type 'BattleStatus'`

**Solution:**
```typescript
// ✅ Use type assertion or conversion
const status: BattleStatus = legacyStatus as BattleStatus;

// ✅ Or use proper type from consolidated file
import { BattleStatus } from '@/types/battle-consolidated';
```

### Issue 3: Route Not Found Errors

**Error:** `404 - Page not found` for battle routes

**Solution:**
```typescript
// ❌ Old route
router.push(`/game/arena/battle/${battleId}`);

// ✅ New route
router.push(`/game/arena/battle-v2/${battleId}`);
```

## Resources and References

### Key Files to Reference
- **Type Definitions**: `src/types/battle-consolidated.ts`
- **Battle Hooks**: `src/hooks/battle-v2/`
- **Battle Components**: `src/components/game/battle-v2/`
- **Battle Logic**: `src/lib/battle-v2/`

### Documentation
- **Cleanup Report**: `docs/cleanup-report.md`
- **Import Optimization Report**: `src/lib/cleanup/importOptimizationReport.md`
- **Project README**: `README.md`

### Tools and Commands
```bash
# Check for unused imports
npm run lint

# Run type checking
npx tsc --noEmit

# Build project to verify everything works
npm run build

# Run tests
npm run test
```

## Conclusion

This migration guide provides the foundation for working with the cleaned-up codebase. By following these guidelines, developers can:

- Maintain the clean architecture established by the cleanup
- Prevent accumulation of technical debt
- Write consistent, maintainable code
- Leverage the consolidated type system effectively

Remember: The goal is to maintain a single, well-organized battle system with clear patterns and consistent code organization. When in doubt, refer to the existing battle-v2 implementations as examples of the preferred patterns.