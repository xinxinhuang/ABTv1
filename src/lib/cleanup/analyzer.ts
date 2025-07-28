import * as path from 'path';

import { FileAnalysis, CleanupConfig, AnalysisResults } from './types';
import { FileUsageScanner } from './fileScanner';

/**
 * Main analyzer class that orchestrates the codebase analysis
 */
export class CodebaseAnalyzer {
  private scanner: FileUsageScanner;
  private config: CleanupConfig;

  constructor(config: CleanupConfig) {
    this.scanner = new FileUsageScanner();
    this.config = config;
  }

  /**
   * Perform comprehensive codebase analysis
   */
  async analyzeCodebase(): Promise<AnalysisResults> {
    console.log('Starting codebase analysis...');
    
    // Step 1: Scan all files in target directories
    const allFiles: string[] = [];
    for (const targetDir of this.config.targetDirectories) {
      console.log(`Scanning directory: ${targetDir}`);
      const files = await this.scanner.scanDirectory(targetDir);
      allFiles.push(...files);
    }
    
    console.log(`Found ${allFiles.length} files to analyze`);
    
    // Step 2: Filter files based on exclusion patterns
    const filteredFiles = this.filterFiles(allFiles);
    console.log(`Analyzing ${filteredFiles.length} files after filtering`);
    
    // Step 3: Analyze each file
    const fileAnalyses: FileAnalysis[] = [];
    for (const filePath of filteredFiles) {
      try {
        const analysis = await this.scanner.analyzeFile(filePath);
        fileAnalyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze ${filePath}:`, error);
      }
    }
    
    // Step 4: Build usage map
    console.log('Building usage map...');
    await this.scanner.buildUsageMap(fileAnalyses);
    
    // Step 5: Generate analysis results
    const results = this.generateResults(fileAnalyses);
    
    console.log('Analysis complete!');
    return results;
  }

  /**
   * Filter files based on exclusion patterns and preserve files
   */
  private filterFiles(files: string[]): string[] {
    return files.filter(file => {
      // Check preserve files
      if (this.config.preserveFiles.some(preserve => file.includes(preserve))) {
        return false;
      }
      
      // Check exclusion patterns
      if (this.config.excludePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(file);
      })) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Generate comprehensive analysis results
   */
  private generateResults(fileAnalyses: FileAnalysis[]): AnalysisResults {
    const unusedFiles = fileAnalyses.filter(file => !file.isUsed && file.canRemove);
    
    return {
      totalFilesAnalyzed: fileAnalyses.length,
      unusedFiles,
      duplicateTypes: [], // Will be populated by type analysis
      unusedImports: [], // Will be populated by import analysis
      recommendations: this.generateRecommendations(fileAnalyses),
      riskAssessment: this.generateRiskAssessment(fileAnalyses),
    };
  }

  /**
   * Generate cleanup recommendations
   */
  private generateRecommendations(fileAnalyses: FileAnalysis[]) {
    const recommendations = [];
    
    // Recommend removing unused files
    const unusedFiles = fileAnalyses.filter(file => !file.isUsed && file.canRemove);
    if (unusedFiles.length > 0) {
      recommendations.push({
        type: 'remove-file' as const,
        priority: 'medium' as const,
        description: `Remove ${unusedFiles.length} unused files`,
        affectedFiles: unusedFiles.map(f => f.path),
        estimatedImpact: `Reduce codebase by ${unusedFiles.reduce((sum, f) => sum + f.size, 0)} bytes`,
      });
    }
    
    return recommendations;
  }

  /**
   * Generate risk assessment
   */
  private generateRiskAssessment(fileAnalyses: FileAnalysis[]) {
    const highRisk = fileAnalyses.filter(f => f.removalRisk === 'high').map(f => f.path);
    const mediumRisk = fileAnalyses.filter(f => f.removalRisk === 'medium').map(f => f.path);
    const lowRisk = fileAnalyses.filter(f => f.removalRisk === 'low').map(f => f.path);
    
    return {
      highRiskFiles: highRisk,
      mediumRiskFiles: mediumRisk,
      lowRiskFiles: lowRisk,
      potentialBreakingChanges: highRisk,
      recommendedTestingAreas: [
        'Battle system functionality',
        'Navigation and routing',
        'Component rendering',
        'Import resolution',
      ],
    };
  }

  /**
   * Get dependency map from scanner
   */
  getDependencyMap() {
    return this.scanner.getDependencyMap();
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.scanner.clearCache();
  }
}

/**
 * Create default configuration for booster game analysis
 */
export function createDefaultConfig(): CleanupConfig {
  return {
    targetDirectories: [
      path.resolve(process.cwd(), 'booster-game/src'),
    ],
    testBeforeRemoval: true,
    createBackup: true,
    dryRun: true,
    excludePatterns: [
      '*/node_modules/*',
      '*/.next/*',
      '*/.git/*',
      '*/dist/*',
      '*/build/*',
    ],
    preserveFiles: [
      'layout.tsx',
      'page.tsx',
      'globals.css',
      'favicon.ico',
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
}