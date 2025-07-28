#!/usr/bin/env node

/**
 * Post-cleanup verification script
 * Run this after performing cleanup operations to ensure everything still works
 */

import { PostCleanupVerifier } from '../postCleanupVerification';
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
  const generateReport = !args.includes('--no-report');
  const verbose = args.includes('--verbose');
  const skipBuild = args.includes('--skip-build');

  console.log('🔍 Code Cleanup Post-Verification');
  console.log('==================================\n');

  const config: CleanupConfig = {
    ...DEFAULT_CONFIG,
  };

  const projectRoot = path.resolve(__dirname, '../../../..');
  const verifier = new PostCleanupVerifier(config, projectRoot);

  try {
    // Run verification
    const verificationResult = await verifier.verify();

    // Display summary
    console.log('\n📊 Verification Summary:');
    console.log('========================');
    console.log(`Overall Status: ${verificationResult.isValid ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Build: ${verificationResult.buildResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Tests: ${verificationResult.testResult.success ? '✅ PASSED' : '❌ FAILED'} (${verificationResult.testResult.passedTests}/${verificationResult.testResult.totalTests})`);
    console.log(`TypeScript: ${verificationResult.typeCheckResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Battle System: ${verificationResult.functionalityResult.battleSystemWorking ? '✅ WORKING' : '❌ BROKEN'}`);

    // Performance metrics
    console.log('\n⚡ Performance Metrics:');
    console.log('======================');
    console.log(`Build Time: ${verificationResult.performanceMetrics.buildTime}ms`);
    console.log(`Test Time: ${verificationResult.performanceMetrics.testTime}ms`);
    console.log(`TypeScript Check: ${verificationResult.performanceMetrics.typeCheckTime}ms`);
    console.log(`Bundle Size: ${formatBytes(verificationResult.performanceMetrics.bundleSize)}`);
    console.log(`Memory Usage: ${formatBytes(verificationResult.performanceMetrics.memoryUsage)}`);

    // Detailed results if verbose
    if (verbose) {
      console.log('\n📋 Detailed Results:');
      console.log('====================');

      // Build details
      if (verificationResult.buildResult.errors.length > 0) {
        console.log('\n❌ Build Errors:');
        verificationResult.buildResult.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }

      if (verificationResult.buildResult.warnings.length > 0) {
        console.log('\n⚠️  Build Warnings:');
        verificationResult.buildResult.warnings.forEach(warning => {
          console.log(`   - ${warning}`);
        });
      }

      // Test details
      if (verificationResult.testResult.failedTestDetails.length > 0) {
        console.log('\n❌ Failed Tests:');
        verificationResult.testResult.failedTestDetails.forEach(test => {
          console.log(`   - ${test.name} (${test.file})`);
          console.log(`     ${test.error}`);
        });
      }

      // TypeScript details
      if (verificationResult.typeCheckResult.errors.length > 0) {
        console.log('\n❌ TypeScript Errors:');
        verificationResult.typeCheckResult.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }

      // Functionality details
      if (verificationResult.functionalityResult.errors.length > 0) {
        console.log('\n❌ Functionality Errors:');
        verificationResult.functionalityResult.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }
    }

    // Overall errors and warnings
    if (verificationResult.errors.length > 0) {
      console.log('\n❌ Overall Errors:');
      verificationResult.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }

    if (verificationResult.warnings.length > 0) {
      console.log('\n⚠️  Overall Warnings:');
      verificationResult.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }

    // Generate report
    if (generateReport) {
      console.log('\n📄 Generating verification report...');
      await verifier.generateReport(verificationResult);
    }

    // Final recommendations
    console.log('\n🎯 Recommendations:');
    console.log('==================');

    if (verificationResult.isValid) {
      console.log('✅ All verification checks passed!');
      console.log('✅ Cleanup operation was successful');
      console.log('✅ Application is functioning correctly');
      
      console.log('\n🚀 Next Steps:');
      console.log('- Deploy to staging environment for further testing');
      console.log('- Run integration tests');
      console.log('- Monitor application performance');
      console.log('- Update documentation if needed');
      
      if (verificationResult.warnings.length > 0) {
        console.log('\n⚠️  Note: There are warnings that should be addressed');
      }
    } else {
      console.log('❌ Verification failed!');
      console.log('❌ Cleanup operation may have introduced issues');
      console.log('❌ Review errors above and fix before proceeding');
      
      console.log('\n🔧 Immediate Actions Required:');
      console.log('- Fix all errors listed above');
      console.log('- Re-run verification after fixes');
      console.log('- Consider rolling back changes if issues persist');
      console.log('- Check backup files if restoration is needed');
    }

    // Exit with appropriate code
    process.exit(verificationResult.isValid ? 0 : 1);

  } catch (error) {
    console.error('💥 Verification failed with error:', error);
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

export { main as runPostCleanupVerification };