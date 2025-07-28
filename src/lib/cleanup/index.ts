/**
 * Code Cleanup Analysis System
 * 
 * This module provides utilities for analyzing codebases to identify unused files,
 * duplicate types, and optimization opportunities.
 */

export { CodeCleanupAnalyzer } from './analyzer';
export { DependencyTracker } from './dependencyTracker';
export { UsageScanner } from './usageScanner';

export {
  DEFAULT_CLEANUP_CONFIG,
  USAGE_PATTERNS,
  ANALYZABLE_EXTENSIONS,
  BATTLE_V1_DIRECTORIES,
  POTENTIALLY_UNUSED_FILES,
  TYPE_FILES_TO_ANALYZE,
  createCleanupConfig,
  validateConfig
} from './config';

export type {
  FileAnalysis,
  CleanupConfig,
  UsagePattern,
  DependencyMap,
  AnalysisResults,
  TypeDuplication,
  ImportAnalysis,
  CleanupRecommendation,
  RiskAssessment
} from './types';

/**
 * Quick start function for basic analysis
 */
export async function analyzeCodebase(config?: Partial<CleanupConfig>) {
  const { CodeCleanupAnalyzer, createCleanupConfig } = await import('./analyzer');
  
  const fullConfig = config ? createCleanupConfig(config) : undefined;
  const analyzer = new CodeCleanupAnalyzer(fullConfig);
  
  return analyzer.analyze();
}

/**
 * Generate a quick report for the current codebase
 */
export async function generateQuickReport(config?: Partial<CleanupConfig>): Promise<string> {
  const { CodeCleanupAnalyzer, createCleanupConfig } = await import('./analyzer');
  
  const fullConfig = config ? createCleanupConfig(config) : undefined;
  const analyzer = new CodeCleanupAnalyzer(fullConfig);
  
  const results = await analyzer.analyze();
  return analyzer.generateSummaryReport(results);
}