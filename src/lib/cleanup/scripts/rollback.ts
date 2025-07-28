#!/usr/bin/env node

/**
 * Rollback script for code cleanup operations
 * Provides manual and automatic rollback capabilities
 */

import { RollbackManager, RollbackTrigger } from '../rollback';
import { CleanupConfig } from '../types';
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
  const command = args[0] || 'check';
  
  const isDryRun = args.includes('--dry-run');
  const backupPath = args.find(arg => arg.startsWith('--backup='))?.split('=')[1];
  const preserveChanges = args.find(arg => arg.startsWith('--preserve='))?.split('=')[1]?.split(',') || [];
  const autoRollback = args.includes('--auto');
  const skipTests = args.includes('--skip-tests');

  console.log('🔄 Code Cleanup Rollback System');
  console.log('===============================\n');

  const config: CleanupConfig = DEFAULT_CONFIG;
  const projectRoot = path.resolve(__dirname, '../../../..');
  const rollbackManager = new RollbackManager(config, projectRoot);

  try {
    switch (command) {
      case 'check':
        await handleCheck(rollbackManager);
        break;
      
      case 'plan':
        await handlePlan(rollbackManager, backupPath);
        break;
      
      case 'execute':
        await handleExecute(rollbackManager, {
          backupPath,
          preserveChanges,
          autoRollback,
          testAfterRollback: !skipTests,
          dryRun: isDryRun,
        });
        break;
      
      case 'auto-setup':
        await handleAutoSetup(rollbackManager);
        break;
      
      default:
        showUsage();
        process.exit(1);
    }

  } catch (error) {
    console.error('💥 Rollback operation failed:', error);
    process.exit(1);
  }
}

async function handleCheck(rollbackManager: RollbackManager) {
  console.log('🔍 Checking if rollback is needed...\n');

  const trigger = await rollbackManager.checkRollbackNeeded();

  if (trigger) {
    console.log('⚠️  Rollback is recommended!');
    console.log(`📋 Trigger: ${trigger.type}`);
    console.log(`📝 Reason: ${trigger.reason}`);

    if (trigger.failedTests && trigger.failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      trigger.failedTests.forEach(test => console.log(`   - ${test}`));
    }

    if (trigger.buildErrors && trigger.buildErrors.length > 0) {
      console.log('\n❌ Build Errors:');
      trigger.buildErrors.forEach(error => console.log(`   - ${error}`));
    }

    if (trigger.verificationErrors && trigger.verificationErrors.length > 0) {
      console.log('\n❌ Verification Errors:');
      trigger.verificationErrors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n🚀 Next Steps:');
    console.log('1. Run "rollback plan" to see what would be restored');
    console.log('2. Run "rollback execute" to perform the rollback');
    console.log('3. Or run "rollback execute --auto" for automatic rollback');

    process.exit(1); // Exit with error code to indicate rollback is needed
  } else {
    console.log('✅ System is healthy - no rollback needed');
    console.log('✅ All verification checks passed');
    console.log('✅ Build is working');
    console.log('✅ Tests are passing');
    console.log('✅ Battle system is functional');

    process.exit(0);
  }
}

async function handlePlan(rollbackManager: RollbackManager, backupPath?: string) {
  console.log('📋 Creating rollback plan...\n');

  const plan = await rollbackManager.createRollbackPlan(backupPath);

  console.log('📊 Rollback Plan:');
  console.log('================');
  console.log(`📁 Backup to use: ${plan.backupToUse}`);
  console.log(`📄 Files to restore: ${plan.filesToRestore.length}`);
  console.log(`⏱️  Estimated time: ${plan.estimatedTime}ms`);

  if (plan.filesToRestore.length > 0) {
    console.log('\n📄 Files to be restored:');
    plan.filesToRestore.slice(0, 20).forEach(file => {
      console.log(`   - ${file}`);
    });
    
    if (plan.filesToRestore.length > 20) {
      console.log(`   ... and ${plan.filesToRestore.length - 20} more files`);
    }
  }

  if (plan.risks.length > 0) {
    console.log('\n⚠️  Risks:');
    plan.risks.forEach(risk => console.log(`   - ${risk}`));
  }

  if (plan.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    plan.recommendations.forEach(rec => console.log(`   - ${rec}`));
  }

  console.log('\n🚀 To execute this plan:');
  console.log(`   rollback execute --backup="${plan.backupToUse}"`);
}

async function handleExecute(rollbackManager: RollbackManager, options: any) {
  console.log('🔄 Executing rollback...\n');

  // First check if rollback is needed
  const trigger = await rollbackManager.checkRollbackNeeded();
  
  if (!trigger && !options.autoRollback) {
    console.log('ℹ️  System appears healthy. Use --auto to force rollback anyway.');
    return;
  }

  const rollbackTrigger: RollbackTrigger = trigger || {
    type: 'manual',
    reason: 'Manual rollback requested',
  };

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No actual changes will be made\n');
  }

  const result = await rollbackManager.rollback(rollbackTrigger, options);

  console.log('\n📊 Rollback Results:');
  console.log('===================');
  console.log(`✅ Success: ${result.success ? 'YES' : 'NO'}`);
  console.log(`⏱️  Duration: ${result.rollbackTime}ms`);
  console.log(`📄 Files restored: ${result.rolledBackFiles.length}`);
  console.log(`💾 Files preserved: ${result.preservedFiles.length}`);

  if (result.rolledBackFiles.length > 0) {
    console.log('\n📄 Restored files:');
    result.rolledBackFiles.slice(0, 10).forEach(file => {
      console.log(`   ✅ ${file}`);
    });
    
    if (result.rolledBackFiles.length > 10) {
      console.log(`   ... and ${result.rolledBackFiles.length - 10} more files`);
    }
  }

  if (result.preservedFiles.length > 0) {
    console.log('\n💾 Preserved files:');
    result.preservedFiles.forEach(file => {
      console.log(`   💾 ${file}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }

  if (result.verificationResult) {
    console.log('\n🧪 Post-Rollback Verification:');
    console.log(`   Build: ${result.verificationResult.buildResult.success ? '✅' : '❌'}`);
    console.log(`   Tests: ${result.verificationResult.testResult.success ? '✅' : '❌'}`);
    console.log(`   TypeScript: ${result.verificationResult.typeCheckResult.success ? '✅' : '❌'}`);
    console.log(`   Battle System: ${result.verificationResult.functionalityResult.battleSystemWorking ? '✅' : '❌'}`);
  }

  // Generate report
  await rollbackManager.generateRollbackReport(result, rollbackTrigger);

  console.log('\n🎯 Final Status:');
  if (result.success) {
    console.log('✅ Rollback completed successfully!');
    console.log('✅ System has been restored to previous state');
    console.log('📊 Rollback report has been generated');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Review the rollback report');
    console.log('2. Investigate the root cause of the issue');
    console.log('3. Fix the cleanup process');
    console.log('4. Test the fix before attempting cleanup again');
  } else {
    console.log('❌ Rollback failed!');
    console.log('❌ Manual intervention may be required');
    console.log('📊 Check the rollback report for details');
    
    console.log('\n🔧 Immediate Actions:');
    console.log('1. Check file system permissions');
    console.log('2. Verify backup integrity');
    console.log('3. Consider manual file restoration');
    console.log('4. Contact system administrator if needed');
  }

  process.exit(result.success ? 0 : 1);
}

async function handleAutoSetup(rollbackManager: RollbackManager) {
  console.log('🔧 Setting up automatic rollback system...\n');

  await rollbackManager.setupAutoRollback();

  console.log('✅ Auto-rollback system configured successfully!');
  console.log('\n📋 Configured triggers:');
  console.log('   - Test failures after cleanup');
  console.log('   - Build failures after cleanup');
  console.log('   - Verification failures after cleanup');

  console.log('\n💡 Usage:');
  console.log('   The system will automatically detect issues and suggest rollback');
  console.log('   Run "rollback check" regularly to monitor system health');
  console.log('   Use "rollback execute --auto" for automatic rollback when issues are detected');
}

function showUsage() {
  console.log(`
Usage: rollback <command> [options]

Commands:
  check                 Check if rollback is needed
  plan [--backup=path]  Create rollback plan without executing
  execute [options]     Execute rollback operation
  auto-setup           Setup automatic rollback triggers

Options:
  --dry-run            Preview changes without applying them
  --backup=path        Use specific backup for rollback
  --preserve=files     Comma-separated list of files to preserve
  --auto               Force rollback even if system appears healthy
  --skip-tests         Skip post-rollback verification tests

Examples:
  rollback check                                    # Check if rollback is needed
  rollback plan                                     # Show what would be restored
  rollback execute --dry-run                        # Preview rollback changes
  rollback execute --backup=/path/to/backup         # Use specific backup
  rollback execute --preserve=src/new-feature.ts    # Preserve specific files
  rollback execute --auto --skip-tests              # Force rollback, skip tests
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runRollback };