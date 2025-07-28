/**
 * Battle system functionality tests for pre-cleanup validation
 * These tests verify that the current battle-v2 system works correctly
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({ battleId: 'test-battle-id' }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
  })),
}));

describe('Battle System Pre-Cleanup Validation', () => {
  const projectRoot = path.resolve(__dirname, '../../../..');

  describe('Battle-v2 File Structure', () => {
    it('should have battle-v2 hooks directory', () => {
      const hooksPath = path.join(projectRoot, 'src/hooks/battle-v2');
      expect(fs.existsSync(hooksPath)).toBe(true);
    });

    it('should have required battle-v2 hook files', () => {
      const hooksPath = path.join(projectRoot, 'src/hooks/battle-v2');
      const requiredHooks = [
        'index.ts',
        'useBattleState.ts',
        'useBattleActions.ts',
        'useBattleRealtime.ts',
        'useHumanoidCards.ts',
        'useCountdownTimer.ts',
      ];

      requiredHooks.forEach(hook => {
        const hookPath = path.join(hooksPath, hook);
        expect(fs.existsSync(hookPath)).toBe(true);
      });
    });

    it('should have battle-v2 components directory', () => {
      const componentsPath = path.join(projectRoot, 'src/components/game/battle-v2');
      expect(fs.existsSync(componentsPath)).toBe(true);
    });

    it('should have required battle-v2 component files', () => {
      const componentsPath = path.join(projectRoot, 'src/components/game/battle-v2');
      const requiredComponents = [
        'index.ts',
        'HumanoidCardGrid.tsx',
        'BattleDebugPanel.tsx',
      ];

      requiredComponents.forEach(component => {
        const componentPath = path.join(componentsPath, component);
        expect(fs.existsSync(componentPath)).toBe(true);
      });
    });

    it('should have battle-v2 page route', () => {
      const pagePath = path.join(projectRoot, 'src/app/game/arena/battle-v2/[battleId]/page.tsx');
      expect(fs.existsSync(pagePath)).toBe(true);
    });
  });

  describe('Battle-v2 Hook Imports', () => {
    it('should be able to import battle-v2 hooks index', async () => {
      const hooksIndexPath = path.join(projectRoot, 'src/hooks/battle-v2/index.ts');
      const content = fs.readFileSync(hooksIndexPath, 'utf-8');
      
      // Check that it exports the main hooks
      expect(content).toContain('useBattleState');
      expect(content).toContain('useBattleActions');
      expect(content).toContain('useBattleRealtime');
    });

    it('should have valid TypeScript syntax in hook files', () => {
      const hooksPath = path.join(projectRoot, 'src/hooks/battle-v2');
      const hookFiles = fs.readdirSync(hooksPath).filter(file => file.endsWith('.ts'));
      
      hookFiles.forEach(file => {
        const filePath = path.join(hooksPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Basic syntax checks - check for malformed imports
        expect(content).not.toContain('import from ');
        expect(content).not.toContain('import  from');
        
        // Should have proper imports/exports
        if (file !== 'types.ts') {
          expect(content).toMatch(/(import|export)/);
        }
      });
    });
  });

  describe('Battle-v2 Component Imports', () => {
    it('should be able to import battle-v2 components index', () => {
      const componentsIndexPath = path.join(projectRoot, 'src/components/game/battle-v2/index.ts');
      const content = fs.readFileSync(componentsIndexPath, 'utf-8');
      
      // Check that it exports the main components
      expect(content).toContain('HumanoidCardGrid');
    });

    it('should have valid React component syntax', () => {
      const componentsPath = path.join(projectRoot, 'src/components/game/battle-v2');
      const componentFiles = fs.readdirSync(componentsPath, { recursive: true })
        .filter((file: any) => typeof file === 'string' && file.endsWith('.tsx'));
      
      componentFiles.forEach(file => {
        const filePath = path.join(componentsPath, file as string);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Should have React imports
        expect(content).toMatch(/(import.*react|import.*React)/i);
        
        // Should export a component
        expect(content).toMatch(/(export default|export const|export function)/);
      });
    });
  });

  describe('Type Definitions', () => {
    it('should have battle-v2 types', () => {
      const typesPath = path.join(projectRoot, 'src/hooks/battle-v2/types.ts');
      expect(fs.existsSync(typesPath)).toBe(true);
    });

    it('should have consolidated battle types', () => {
      const consolidatedTypesPath = path.join(projectRoot, 'src/types/battle-consolidated.ts');
      expect(fs.existsSync(consolidatedTypesPath)).toBe(true);
    });

    it('should have valid TypeScript type definitions', () => {
      const typesPath = path.join(projectRoot, 'src/hooks/battle-v2/types.ts');
      const content = fs.readFileSync(typesPath, 'utf-8');
      
      // Should have interface or type definitions
      expect(content).toMatch(/(interface|type|enum)/);
      
      // Should have proper exports
      expect(content).toMatch(/export/);
    });
  });

  describe('Battle System Integration', () => {
    it('should have proper routing structure', () => {
      const battleV2RoutePath = path.join(projectRoot, 'src/app/game/arena/battle-v2');
      expect(fs.existsSync(battleV2RoutePath)).toBe(true);
      
      const battleIdRoutePath = path.join(battleV2RoutePath, '[battleId]');
      expect(fs.existsSync(battleIdRoutePath)).toBe(true);
      
      const pageFile = path.join(battleIdRoutePath, 'page.tsx');
      expect(fs.existsSync(pageFile)).toBe(true);
    });

    it('should not have legacy battle v1 routes active', () => {
      const battleV1RoutePath = path.join(projectRoot, 'src/app/game/arena/battle/[battleId]/page.tsx');
      
      if (fs.existsSync(battleV1RoutePath)) {
        const content = fs.readFileSync(battleV1RoutePath, 'utf-8');
        // If the file exists, it should be empty or contain only comments/redirects
        const nonCommentLines = content
          .split('\n')
          .filter(line => line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*'))
          .filter(line => !line.trim().startsWith('*') && !line.trim().startsWith('*/'));
        
        expect(nonCommentLines.length).toBeLessThanOrEqual(5); // Allow for minimal redirect code
      }
    });
  });

  describe('Package Dependencies', () => {
    it('should have required dependencies in package.json', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      const requiredDeps = [
        '@supabase/supabase-js',
        'zustand',
        'react',
        'next',
      ];

      requiredDeps.forEach(dep => {
        const hasInDeps = packageJson.dependencies?.[dep];
        const hasInDevDeps = packageJson.devDependencies?.[dep];
        expect(hasInDeps || hasInDevDeps).toBeTruthy();
      });
    });

    it('should have test dependencies', () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      const testDeps = [
        'jest',
        '@testing-library/react',
        '@testing-library/jest-dom',
      ];

      testDeps.forEach(dep => {
        expect(packageJson.devDependencies?.[dep]).toBeTruthy();
      });
    });
  });
});