#!/usr/bin/env node

/**
 * Test script for the cleanup analyzer
 * Run with: npx ts-node src/lib/cleanup/test-analyzer.ts
 */

import { CodeCleanupAnalyzer } from './analyzer';
import { DEFAULT_CLEANUP_CONFIG } from './config';

async function testAnalyzer() {
  console.log('Testing Code Cleanup Analyzer...\n');
  
  try {
    const analyzer = new CodeCleanupAnalyzer(DEFAULT_CLEANUP_CONFIG);
    
    // Test battle v1 usage check
    console.log('Checking Battle V1 usage...');
    const battleUsage = await analyzer.checkBattleV1Usage();
    console.log(`Battle V1 has usage: ${battleUsage.hasUsage}`);
    if (battleUsage.hasUsage) {
      console.log('Usage found in files:');
      battleUsage.usageFiles.forEach(file => console.log(`  - ${file}`));
    }
    console.log('');
    
    // Test battle v1 file analysis
    console.log('Analyzing Battle V1 files...');
    const battleAnalysis = await analyzer.analyzeBattleV1Files();
    console.log(`Found ${battleAnalysis.length} Battle V1 files`);
    
    battleAnalysis.forEach(file => {
      console.log(`  - ${file.path}`);
      console.log(`    Type: ${file.type}, Used: ${file.isUsed}, Can Remove: ${file.canRemove}, Risk: ${file.removalRisk}`);
      if (file.usedBy.length > 0) {
        console.log(`    Used by: ${file.usedBy.join(', ')}`);
      }
    });
    console.log('');
    
    // Run full analysis
    console.log('Running full analysis...');
    const results = await analyzer.analyze();
    
    // Generate report
    const report = analyzer.generateSummaryReport(results);
    console.log(report);
    
  } catch (error) {
    console.error('Error during analysis:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testAnalyzer();
}

export { testAnalyzer };