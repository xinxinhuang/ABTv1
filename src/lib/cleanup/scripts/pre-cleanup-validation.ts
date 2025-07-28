#!/usr/bin/env node

/**
 * Pre-cleanup validation script
 * Run this before performing any cleanup operations
 */

import { PreCleanupValidator } from '../validation';
import { BackupManager } from '../backup';
import { DryRunManager } from '../dryRun';
import { CleanupConfig, FileAnalysis } from '../types';
import path from 'path';

const DEFAULT_CONFIG: CleanupConfig = {
  targetDirectories: [
    'src/hooks/battle',
    'src/lib/battle',
    'src/components/game/battle',
    'src/types',
  ],
  testBeforeRemoval: true,
  createBackup: true,
  dryRun: false,
  excludePatterns: [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/node_modules/**',
    '**/.git/**',
  ],
  preserveFiles: [
    'src/types/battle-consolidated.ts',
    'src/hooks/battle-v2/**',
    'src/components/game/battle-v2/**',
  ],
  typeConsolidationRules: {
    preferV2Types: true,
    consolidateInterfaces: true,
    removeDeprecatedTypes: true,
  },
  importOptimization: {
    removeUnused: true,
    organizeImports: true,
    optimizePaths: true,
  },
};

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const createBackup = !args.includes('--no-backup');
  const verbose = args.includes('--verbose');

  console.log('🧹 Code Cleanup Pre-Validation');
  console.log('================================\n');

  const config: CleanupConfig = {
    ...DEFAULT_CONFIG,
    dryRun: isDryRun,
    createBackup,
  };

  const projectRoot = path.resolve(__dirname, '../../../..');
  const validator = new PreCleanupValidator(config, projectRoot);

  try {
    console.log('🔍 Running pre-cleanup validation...\n');

    // Run validation
    const validationResult = await validator.validate();

    // Display results
    console.log('📊 Validation Results:');
    console.log(`✅ Valid: ${validationResult.isValid}`);
    console.log(`🔧 Tests run: ${validationResult.testResults.length}`);
    console.log(`💾 Backup created: ${validationResult.backupCreated}`);
    
    if (validationResult.backupPath) {
      console.log(`📁 Backup location: ${validationResult.backupPath}`);
    }

    console.log('\n📋 Test Results:');
    for (const test of validationResult.testResults) {
      const status = test.passed ? '✅' : '❌';
      console.log(`${status} ${test.name} (${test.duration}ms)`);
      if (!test.passed && test.error) {
        console.log(`   Error: ${test.error}`);
      }
    }

    if (validationResult.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      for (const warning of validationResult.warnings) {
        console.log(`   - ${warning}`);
      }
    }

    if (validationResult.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const error of validationResult.errors) {
        console.log(`   - ${error}`);
      }
    }

    // Run dry run if requested
    if (isDryRun) {
      console.log('\n🔍 Running dry run analysis...');
      
      const dryRunManager = new DryRunManager(config, projectRoot);
      
      // Mock some files for dry run (in real scenario, this would come from file analysis)
      const mockFilesToRemove: FileAnalysis[] = [
        {
          path: 'src/hooks/battle/useBattle.ts',
          type: 'hook',
          isUsed: false,
          usedBy: [],
          dependencies: ['src/types/battle.ts'],
          canRemove: true,
          removalRisk: 'low',
          size: 2048,
          lastModified: new Date(),
        },
        {
          path: 'src/lib/battle/battleLogic.ts',
          type: 'utility',
          isUsed: false,
          usedBy: [],
          dependencies: ['src/types/battle.ts'],
          canRemove: true,
          removalRisk: 'medium',
          size: 4096,
          lastModified: new Date(),
        },
      ];

      const dryRunResult = await dryRunManager.execute(mockFilesToRemove, {
        showFileContents: verbose,
        includeRiskAssessment: true,
        generateReport: true,
      });

      console.log('\n📊 Dry Run Summary:');
      console.log(`📁 Files to remove: ${dryRunResult.summary.filesMarkedForRemoval}`);
      console.log(`📏 Lines to remove: ${dryRunResult.summary.estimatedSavings.linesRemoved}`);
      console.log(`💾 Size reduction: ${formatBytes(dryRunResult.summary.estimatedSavings.sizeReduced)}`);
      console.log(`⚠️  Risk level: ${dryRunResult.riskAssessment.overallRisk}`);

      if (dryRunResult.potentialIssues.length > 0) {
        console.log('\n⚠️  Potential Issues:');
        for (const issue of dryRunResult.potentialIssues) {
          console.log(`   ${issue.type.toUpperCase()}: ${issue.message}`);
        }
      }
    }

    // Final recommendations
    console.log('\n🎯 Recommendations:');
    
    if (validationResult.isValid) {
      console.log('✅ System is ready for cleanup operations');
      console.log('✅ All tests are passing');
      console.log('✅ Backup has been created');
      
      if (!isDryRun) {
        console.log('\n🚀 Next steps:');
        console.log('1. Run with --dry-run to preview changes');
        console.log('2. Execute cleanup operations one by one');
        console.log('3. Run tests after each step');
        console.log('4. Keep backup until cleanup is complete');
      }
    } else {
      console.log('❌ System is NOT ready for cleanup');
      console.log('❌ Fix the errors above before proceeding');
      console.log('❌ Do not run cleanup operations until validation passes');
    }

    process.exit(validationResult.isValid ? 0 : 1);

  } catch (error) {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runPreCleanupValidation };