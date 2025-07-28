#!/usr/bin/env node

import * as path from 'path';

import { CodebaseAnalyzer, createDefaultConfig } from './analyzer';

/**
 * Test script for the file usage scanner
 */
async function testFileScanner() {
  console.log('Testing File Usage Scanner...\n');
  
  try {
    // Create analyzer with default config
    const config = createDefaultConfig();
    const analyzer = new CodebaseAnalyzer(config);
    
    // Run analysis
    const results = await analyzer.analyzeCodebase();
    
    // Display results
    console.log('=== ANALYSIS RESULTS ===');
    console.log(`Total files analyzed: ${results.totalFilesAnalyzed}`);
    console.log(`Unused files found: ${results.unusedFiles.length}`);
    
    if (results.unusedFiles.length > 0) {
      console.log('\n=== UNUSED FILES ===');
      results.unusedFiles.forEach(file => {
        console.log(`- ${path.relative(process.cwd(), file.path)} (${file.type}, ${file.size} bytes)`);
      });
    }
    
    console.log('\n=== RISK ASSESSMENT ===');
    console.log(`High risk files: ${results.riskAssessment.highRiskFiles.length}`);
    console.log(`Medium risk files: ${results.riskAssessment.mediumRiskFiles.length}`);
    console.log(`Low risk files: ${results.riskAssessment.lowRiskFiles.length}`);
    
    if (results.recommendations.length > 0) {
      console.log('\n=== RECOMMENDATIONS ===');
      results.recommendations.forEach(rec => {
        console.log(`- ${rec.description} (${rec.priority} priority)`);
        console.log(`  Impact: ${rec.estimatedImpact}`);
      });
    }
    
    // Get dependency map for debugging
    const depMap = analyzer.getDependencyMap();
    const totalDependencies = Object.keys(depMap).length;
    console.log(`\nDependency map contains ${totalDependencies} files`);
    
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testFileScanner();
}

export { testFileScanner };