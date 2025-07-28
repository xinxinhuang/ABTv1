# Codebase Maintenance Guidelines

## Overview

This document provides guidelines for maintaining the clean codebase established after the comprehensive code cleanup. Following these practices will prevent technical debt accumulation and maintain code quality.

## Daily Development Practices

### 1. Import Management

#### Before Committing Code
Always check for and remove unused imports:

```bash
# Check for unused imports with ESLint
npm run lint

# Fix automatically fixable issues
npm run lint -- --fix
```

#### Import Organization Standard
Follow the 4-tier import structure in every file:

```typescript
// 1. Type-only imports (first)
import type { NextPage } from 'next';
import type { BattleInstance } from '@/types/battle-consolidated';

// 2. External library imports
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// 3. Internal imports (using @/ alias)
import { useBattleV2 } from '@/hooks/battle-v2/useBattleV2';
import { Button } from '@/components/ui/button';

// 4. Relative imports (./filename)
import { localUtility } from './utils';
import styles from './Component.module.css';
```

#### Path Preferences
- **✅ Use**: Absolute paths with `@/` alias for internal imports
- **❌ Avoid**: Deep relative paths like `../../../hooks/`

### 2. Type System Usage

#### Primary Type Source
Always import battle-related types from the consolidated file:

```typescript
// ✅ Correct
import { BattleInstance, BattleStatus, HumanoidCard } from '@/types/battle-consolidated';

// ❌ Avoid
import { BattleStatus } from '@/types/battle';
import { BattleInstance } from '@/types/battle-v2';
```

#### New Type Definitions
When adding new battle-related types:
1. Add them to `src/types/battle-consolidated.ts`
2. Follow existing naming conventions
3. Add JSDoc documentation
4. Update related interfaces if needed

### 3. Component Development

#### Battle System Components
All new battle components should:
- Use the battle-v2 system exclusively
- Import types from `battle-consolidated.ts`
- Follow the established component structure
- Include proper TypeScript annotations

```typescript
import type { BattleInstance, HumanoidCard } from '@/types/battle-consolidated';

interface BattleComponentProps {
  battle: BattleInstance;
  card: HumanoidCard;
  onAction: (action: string) => void;
}

export function BattleComponent({ battle, card, onAction }: BattleComponentProps) {
  // Component implementation
}
```

## Weekly Maintenance Tasks

### 1. Import Cleanup Review

Run a comprehensive import analysis:

```bash
# Check for unused imports across the codebase
npm run lint -- --ext .ts,.tsx src/

# Look for potential import optimizations
grep -r "from '@/" src/ | grep -E "(\.\.\/){3,}" || echo "No deep relative imports found"
```

### 2. Type Usage Audit

Check for any direct imports from deprecated type files:

```bash
# Should return no results
grep -r "from '@/types/battle'" src/ --exclude-dir=node_modules
grep -r "from '@/types/battle-v2'" src/ --exclude-dir=node_modules
```

### 3. Dead Code Detection

Look for potentially unused files:

```bash
# Find files that might not be imported anywhere
find src/ -name "*.ts" -o -name "*.tsx" | while read file; do
  basename=$(basename "$file" .ts)
  basename=$(basename "$basename" .tsx)
  if ! grep -r "from.*$basename" src/ --exclude="$file" > /dev/null; then
    echo "Potentially unused: $file"
  fi
done
```

## Monthly Maintenance Tasks

### 1. Dependency Analysis

Review and update dependencies:

```bash
# Check for outdated packages
npm outdated

# Update dependencies (carefully)
npm update

# Check for security vulnerabilities
npm audit
```

### 2. Bundle Size Analysis

Monitor bundle size to ensure cleanup benefits are maintained:

```bash
# Build and analyze bundle
npm run build
npm run analyze # if you have bundle analyzer configured
```

### 3. Code Quality Metrics

Track code quality improvements:

```bash
# Count total lines of code
find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l

# Count number of files
find src/ -name "*.ts" -o -name "*.tsx" | wc -l

# Check TypeScript compilation
npx tsc --noEmit
```

## Quarterly Maintenance Tasks

### 1. Architecture Review

Conduct a comprehensive architecture review:

- Review component organization
- Check for new duplicate code patterns
- Assess type system organization
- Evaluate hook structure

### 2. Performance Analysis

Analyze application performance:

- Build time analysis
- Bundle size trends
- Runtime performance metrics
- Database query optimization

### 3. Technical Debt Assessment

Identify and prioritize technical debt:

- Code complexity analysis
- Outdated patterns identification
- Refactoring opportunities
- Documentation updates needed

## Automated Tools Setup

### 1. ESLint Configuration

Ensure these rules are active in your ESLint config:

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

### 2. Pre-commit Hooks

Set up Husky for automated checks:

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

### 3. GitHub Actions

Create automated checks for pull requests:

```yaml
name: Code Quality
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build
```

## Warning Signs to Watch For

### 1. Import Anti-patterns

Watch for these problematic patterns:

```typescript
// ❌ Deep relative imports returning
import { useBattleV2 } from '../../../hooks/battle-v2/useBattleV2';

// ❌ Direct battle type imports
import { BattleStatus } from '@/types/battle';

// ❌ Multiple imports from same module
import { BattleInstance } from '@/types/battle-consolidated';
import { BattleStatus } from '@/types/battle-consolidated';
import { HumanoidCard } from '@/types/battle-consolidated';
```

### 2. Code Duplication

Monitor for:
- Similar component logic across files
- Duplicate type definitions
- Repeated utility functions
- Copy-pasted code blocks

### 3. Architecture Drift

Watch for:
- New battle system variations (avoid creating battle-v3)
- Components bypassing established patterns
- Direct database queries in components
- Inconsistent error handling

## Emergency Procedures

### 1. Build Failures After Changes

If builds fail after maintenance:

```bash
# 1. Check TypeScript errors
npx tsc --noEmit

# 2. Check for import issues
npm run lint

# 3. Clear build cache
rm -rf .next
npm run build

# 4. If still failing, check recent changes
git diff HEAD~1 --name-only
```

### 2. Import Resolution Issues

If imports suddenly break:

```bash
# 1. Check tsconfig.json paths
cat tsconfig.json | grep -A 10 "paths"

# 2. Verify file exists
ls -la src/types/battle-consolidated.ts

# 3. Check for circular dependencies
npm run build 2>&1 | grep -i circular
```

### 3. Type Errors After Updates

If type errors appear:

```bash
# 1. Clear TypeScript cache
rm -rf node_modules/.cache
rm -rf .next

# 2. Reinstall dependencies
npm ci

# 3. Check for type conflicts
npx tsc --noEmit --listFiles | grep battle
```

## Success Metrics

Track these metrics to ensure maintenance effectiveness:

### Code Quality Metrics
- **Lines of Code**: Should remain stable or decrease
- **File Count**: Should not grow unnecessarily
- **Import Statements**: Should follow 4-tier organization
- **Unused Imports**: Should remain at zero

### Performance Metrics
- **Build Time**: Should remain fast or improve
- **Bundle Size**: Should not grow significantly
- **TypeScript Compilation**: Should complete without errors
- **Test Suite**: Should run quickly and pass consistently

### Developer Experience Metrics
- **Time to Add Features**: Should remain efficient
- **Code Review Time**: Should be reasonable
- **Onboarding Time**: New developers should understand structure quickly
- **Bug Rate**: Should remain low

## Resources

### Documentation
- **Migration Guide**: `docs/migration-guide.md`
- **Cleanup Report**: `docs/cleanup-report.md`
- **Battle System Docs**: `docs/battle-system-update.md`

### Tools
- **ESLint**: For import and code quality checking
- **TypeScript**: For type checking
- **Prettier**: For code formatting
- **Husky**: For pre-commit hooks

### Commands Reference
```bash
# Daily checks
npm run lint
npm run type-check
npm run build

# Weekly analysis
npm outdated
npm audit
find src/ -name "*.ts*" | xargs wc -l

# Monthly review
npm run build -- --analyze
npx tsc --noEmit --listFiles
```

## Conclusion

Maintaining a clean codebase requires consistent effort and adherence to established patterns. By following these guidelines and using the provided tools, the development team can preserve the benefits achieved through the comprehensive cleanup and prevent technical debt from accumulating again.

Remember: **Prevention is easier than cleanup**. Following these practices daily will maintain the high code quality standards established by the cleanup process.