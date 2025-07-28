 * Type definitions for the code cleanup analysis system
 */

export interface FileAnalysis {
  path: string;
  type: 'component' | 'hook' | 'utility' | 'type' | 'page' | 'test';
  isUsed: boolean;
  usedBy: string[];
  dependencies: string[];
  canRemove: boolean;
  removalRisk: 'low' | 'medium' | 'high';
  size: number; // file size in bytes
  lastModified: Date;
}

export interface CleanupConfig {
  // Files to analyze
  targetDirectories: string[];
  
  // Safety checks
  testBeforeRemoval: boolean;
  createBackup: boolean;
  dryRun: boolean;
  
  // Exclusions
  excludePatterns: string[];
  preserveFiles: string[];
  
  // Type consolidation rules
  typeConsolidationRules: {
    preferV2Types: boolean;
    consolidateInterfaces: boolean;
    removeDeprecatedTypes: boolean;
  };
  
  // Import optimization settings
  importOptimization: {
    removeUnused: boolean;
    organizeImports: boolean;
    optimizePaths: boolean;
  };
}

export interface UsagePattern {
  pattern: string;
  type: 'import' | 'require' | 'dynamic-import' | 'file-reference';
  description: string;
}

export interface DependencyMap {
  [filePath: string]: {
    imports: string[];
    exports: string[];
    usedBy: string[];
    dependencies: string[];
  };
}

export interface AnalysisResults {
  totalFilesAnalyzed: number;
  unusedFiles: FileAnalysis[];
  duplicateTypes: TypeDuplication[];
  unusedImports: ImportAnalysis[];
  recommendations: CleanupRecommendation[];
  riskAssessment: RiskAssessment;
}

export interface TypeDuplication {
  duplicateTypes: string[];
  consolidatedType: string;
  targetLocation: string;
  affectedFiles: string[];
  migrationStrategy: 'merge' | 'replace' | 'extend';
}

export interface ImportAnalysis {
  file: string;
  unusedImports: string[];
  duplicateImports: string[];
  organizationNeeded: boolean;
  optimizedImports: string[];
}

export interface CleanupRecommendation {
  type: 'remove-file' | 'consolidate-types' | 'optimize-imports' | 'update-references';
  priority: 'high' | 'medium' | 'low';
  description: string;
  affectedFiles: string[];
  estimatedImpact: string;
}

export interface RiskAssessment {
  highRiskFiles: string[];
  mediumRiskFiles: string[];
  lowRiskFiles: string[];
  potentialBreakingChanges: string[];
  recommendedTestingAreas: string[];
}