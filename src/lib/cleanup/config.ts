import { CleanupConfig, UsagePattern } from './types';

/**
 * Default configuration for code cleanup analysis
 */
export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  targetDirectories: [
    'src/hooks/battle',
    'src/lib/battle',
    'src/components/game/battle',
    'src/types',
    'src/hooks',
    'src/lib',
    'src/components'
  ],
  
  testBeforeRemoval: true,
  createBackup: true,
  dryRun: true,
  
  excludePatterns: [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**'
  ],
  
  preserveFiles: [
    'src/types/database.ts',
    'src/lib/utils.ts',
    'src/app/layout.tsx',
    'src/app/page.tsx'
  ],
  
  typeConsolidationRules: {
    preferV2Types: true,
    consolidateInterfaces: true,
    removeDeprecatedTypes: true
  },
  
  importOptimization: {
    removeUnused: true,
    organizeImports: true,
    optimizePaths: true
  }
};

/**
 * Patterns to identify file usage in the codebase
 */
export const USAGE_PATTERNS: UsagePattern[] = [
  {
    pattern: /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
    type: 'import',
    description: 'ES6 import statements'
  },
  {
    pattern: /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    type: 'dynamic-import',
    description: 'Dynamic import() statements'
  },
  {
    pattern: /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    type: 'require',
    description: 'CommonJS require statements'
  },
  {
    pattern: /['"`]([^'"`]*\.(ts|tsx|js|jsx|json))['"`]/g,
    type: 'file-reference',
    description: 'File path references in strings'
  }
];

/**
 * File extensions to analyze
 */
export const ANALYZABLE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json'
];

/**
 * Directories that typically contain unused code in this project
 */
export const BATTLE_V1_DIRECTORIES = [
  'src/hooks/battle',
  'src/lib/battle',
  'src/components/game/battle'
];

/**
 * Files that are likely to be unused based on the requirements
 */
export const POTENTIALLY_UNUSED_FILES = [
  'src/hooks/useBattle.ts',
  'src/lib/battle/battleLogic.ts',
  'src/types/battle.ts'
];

/**
 * Type files that may have duplications
 */
export const TYPE_FILES_TO_ANALYZE = [
  'src/types/battle.ts',
  'src/types/battle-v2.ts'
];

/**
 * Create a custom cleanup configuration
 */
export function createCleanupConfig(overrides: Partial<CleanupConfig>): CleanupConfig {
  return {
    ...DEFAULT_CLEANUP_CONFIG,
    ...overrides,
    typeConsolidationRules: {
      ...DEFAULT_CLEANUP_CONFIG.typeConsolidationRules,
      ...overrides.typeConsolidationRules
    },
    importOptimization: {
      ...DEFAULT_CLEANUP_CONFIG.importOptimization,
      ...overrides.importOptimization
    }
  };
}

/**
 * Validate cleanup configuration
 */
export function validateConfig(config: CleanupConfig): string[] {
  const errors: string[] = [];
  
  if (!config.targetDirectories || config.targetDirectories.length === 0) {
    errors.push('targetDirectories cannot be empty');
  }
  
  if (config.excludePatterns.some(pattern => !pattern || pattern.trim() === '')) {
    errors.push('excludePatterns cannot contain empty strings');
  }
  
  if (config.preserveFiles.some(file => !file || file.trim() === '')) {
    errors.push('preserveFiles cannot contain empty strings');
  }
  
  return errors;
}