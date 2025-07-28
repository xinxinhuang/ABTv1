/**
 * Dry-run utilities for code cleanup operations
 * Allows previewing changes without actually applying them
 */

import fs from 'fs';
import path from 'path';
import { FileAnalysis, CleanupConfig } from './types';

export interface DryRunOptions {
  showFileContents?: boolean;
  includeRiskAssessment?: boolean;
  generateReport?: boolean;
  outputPath?: string;
}

export interface DryRunResult {
  summary: DryRunSummary;
  filesToRemove: DryRunFileAction[];
  filesToModify: DryRunFileAction[];
  typesToConsolidate: DryRunTypeAction[];
  importsToOptimize: DryRunImportAction[];
  potentialIssues: DryRunIssue[];
  riskAssessment: DryRunRiskAssessment;
}

export interface DryRunSummary {
  totalFilesAnalyzed: number;
  filesMarkedForRemoval: number;
  filesMarkedForModification: number;
  estimatedSavings: {
    filesRemoved: number;
    linesRemoved: number;
    sizeReduced: number; // in bytes
    importsOptimized: number;
  };
  executionTime: number; // in milliseconds
}

export interface DryRunFileAction {
  path: string;
  action: 'remove' | 'modify';
  reason: string;
  risk: 'low' | 'medium' | 'high';
  size: number;
  lineCount: number;
  dependencies: string[];
  usedBy: string[];
  preview?: string; // First few lines of file content
}

export interface DryRunTypeAction {
  duplicateTypes: string[];
  consolidatedType: string;
  targetLocation: string;
  affectedFiles: string[];
  migrationStrategy: 'merge' | 'replace' | 'extend';
  estimatedChanges: number;
}

export interface DryRunImportAction {
  file: string;
  unusedImports: string[];
  duplicateImports: string[];
  optimizationOpportunities: string[];
  estimatedLinesSaved: number;
}

export interface DryRunIssue {
  type: 'warning' | 'error' | 'info';
  message: string;
  affectedFiles: string[];
  severity: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export interface DryRunRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  highRiskOperations: string[];
  recommendedOrder: string[];
  safeguards: string[];
}

export class DryRunManager {
  private projectRoot: string;
  private config: CleanupConfig;

  constructor(config: CleanupConfig, projectRoot: string = process.cwd()) {
    this.config = config;
    this.projectRoot = projectRoot;
  }

  /**
   * Execute dry run analysis
   */
  async execute(
    filesToRemove: FileAnalysis[],
    options: DryRunOptions = {}
  ): Promise<DryRunResult> {
    const startTime = Date.now();

    const result: DryRunResult = {
      summary: {
        totalFilesAnalyzed: 0,
        filesMarkedForRemoval: 0,
        filesMarkedForModification: 0,
        estimatedSavings: {
          filesRemoved: 0,
          linesRemoved: 0,
          sizeReduced: 0,
          importsOptimized: 0,
        },
        executionTime: 0,
      },
      filesToRemove: [],
      filesToModify: [],
      typesToConsolidate: [],
      importsToOptimize: [],
      potentialIssues: [],
      riskAssessment: {
        overallRisk: 'low',
        highRiskOperations: [],
        recommendedOrder: [],
        safeguards: [],
      },
    };

    try {
      // Analyze files for removal
      result.filesToRemove = await this.analyzeFilesForRemoval(filesToRemove, options);
      
      // Analyze files for modification
      result.filesToModify = await this.analyzeFilesForModification(options);
      
      // Analyze type consolidation opportunities
      result.typesToConsolidate = await this.analyzeTypeConsolidation(options);
      
      // Analyze import optimization opportunities
      result.importsToOptimize = await this.analyzeImportOptimization(options);
      
      // Identify potential issues
      result.potentialIssues = await this.identifyPotentialIssues(result);
      
      // Assess overall risk
      result.riskAssessment = this.assessRisk(result);
      
      // Calculate summary
      result.summary = this.calculateSummary(result, startTime);

      // Generate report if requested
      if (options.generateReport) {
        await this.generateReport(result, options.outputPath);
      }

    } catch (error) {
      result.potentialIssues.push({
        type: 'error',
        message: `Dry run failed: ${error instanceof Error ? error.message : String(error)}`,
        affectedFiles: [],
        severity: 'high',
      });
    }

    return result;
  }

  /**
   * Analyze files marked for removal
   */
  private async analyzeFilesForRemoval(
    filesToRemove: FileAnalysis[],
    options: DryRunOptions
  ): Promise<DryRunFileAction[]> {
    const actions: DryRunFileAction[] = [];

    for (const file of filesToRemove) {
      try {
        const filePath = path.join(this.projectRoot, file.path);
        
        if (!fs.existsSync(filePath)) {
          continue;
        }

        const stats = await fs.promises.stat(filePath);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lineCount = content.split('\n').length;

        const action: DryRunFileAction = {
          path: file.path,
          action: 'remove',
          reason: this.getRemovalReason(file),
          risk: file.removalRisk,
          size: stats.size,
          lineCount,
          dependencies: file.dependencies,
          usedBy: file.usedBy,
        };

        if (options.showFileContents) {
          action.preview = content.split('\n').slice(0, 10).join('\n');
        }

        actions.push(action);

      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return actions;
  }

  /**
   * Analyze files that would be modified
   */
  private async analyzeFilesForModification(options: DryRunOptions): Promise<DryRunFileAction[]> {
    const actions: DryRunFileAction[] = [];

    // This would analyze files that have import optimizations, type updates, etc.
    // For now, we'll return an empty array as this is handled by other analyzers
    
    return actions;
  }

  /**
   * Analyze type consolidation opportunities
   */
  private async analyzeTypeConsolidation(options: DryRunOptions): Promise<DryRunTypeAction[]> {
    const actions: DryRunTypeAction[] = [];

    try {
      // Check for battle type consolidation
      const battleTypesPath = path.join(this.projectRoot, 'src/types/battle.ts');
      const battleV2TypesPath = path.join(this.projectRoot, 'src/types/battle-v2.ts');
      const consolidatedTypesPath = path.join(this.projectRoot, 'src/types/battle-consolidated.ts');

      if (fs.existsSync(battleTypesPath) && fs.existsSync(battleV2TypesPath)) {
        actions.push({
          duplicateTypes: ['battle.ts', 'battle-v2.ts'],
          consolidatedType: 'battle-consolidated.ts',
          targetLocation: 'src/types/battle-consolidated.ts',
          affectedFiles: await this.findFilesUsingTypes(['battle.ts', 'battle-v2.ts']),
          migrationStrategy: 'merge',
          estimatedChanges: 10, // Estimated number of files that need import updates
        });
      }

    } catch (error) {
      // Handle error silently for dry run
    }

    return actions;
  }

  /**
   * Analyze import optimization opportunities
   */
  private async analyzeImportOptimization(options: DryRunOptions): Promise<DryRunImportAction[]> {
    const actions: DryRunImportAction[] = [];

    try {
      // Scan TypeScript files for import optimization opportunities
      const tsFiles = await this.findTypeScriptFiles();

      for (const file of tsFiles.slice(0, 20)) { // Limit for dry run performance
        const content = await fs.promises.readFile(file, 'utf-8');
        const imports = this.extractImports(content);
        
        if (imports.unused.length > 0 || imports.duplicates.length > 0) {
          actions.push({
            file: path.relative(this.projectRoot, file),
            unusedImports: imports.unused,
            duplicateImports: imports.duplicates,
            optimizationOpportunities: imports.optimizations,
            estimatedLinesSaved: imports.unused.length + imports.duplicates.length,
          });
        }
      }

    } catch (error) {
      // Handle error silently for dry run
    }

    return actions;
  }

  /**
   * Identify potential issues with the cleanup plan
   */
  private async identifyPotentialIssues(result: DryRunResult): Promise<DryRunIssue[]> {
    const issues: DryRunIssue[] = [];

    // Check for high-risk file removals
    const highRiskRemovals = result.filesToRemove.filter(action => action.risk === 'high');
    if (highRiskRemovals.length > 0) {
      issues.push({
        type: 'warning',
        message: `${highRiskRemovals.length} high-risk files marked for removal`,
        affectedFiles: highRiskRemovals.map(action => action.path),
        severity: 'high',
        recommendation: 'Review these files carefully and consider keeping them or reducing their risk level',
      });
    }

    // Check for files with many dependencies
    const filesWithManyDeps = result.filesToRemove.filter(action => action.dependencies.length > 5);
    if (filesWithManyDeps.length > 0) {
      issues.push({
        type: 'warning',
        message: `${filesWithManyDeps.length} files have many dependencies`,
        affectedFiles: filesWithManyDeps.map(action => action.path),
        severity: 'medium',
        recommendation: 'Verify that all dependencies are properly handled after removal',
      });
    }

    // Check for large files being removed
    const largeFiles = result.filesToRemove.filter(action => action.size > 10000); // > 10KB
    if (largeFiles.length > 0) {
      issues.push({
        type: 'info',
        message: `${largeFiles.length} large files will be removed`,
        affectedFiles: largeFiles.map(action => action.path),
        severity: 'low',
        recommendation: 'Consider if these files contain important logic that should be preserved',
      });
    }

    return issues;
  }

  /**
   * Assess overall risk of the cleanup operation
   */
  private assessRisk(result: DryRunResult): DryRunRiskAssessment {
    const highRiskCount = result.filesToRemove.filter(action => action.risk === 'high').length;
    const mediumRiskCount = result.filesToRemove.filter(action => action.risk === 'medium').length;
    
    let overallRisk: 'low' | 'medium' | 'high' = 'low';
    
    if (highRiskCount > 0) {
      overallRisk = 'high';
    } else if (mediumRiskCount > 3) {
      overallRisk = 'medium';
    }

    const highRiskOperations = result.filesToRemove
      .filter(action => action.risk === 'high')
      .map(action => `Remove ${action.path}`);

    const recommendedOrder = [
      'Create backup',
      'Run tests to establish baseline',
      'Remove low-risk files first',
      'Consolidate types',
      'Optimize imports',
      'Remove medium-risk files',
      'Handle high-risk files last',
      'Run tests after each step',
    ];

    const safeguards = [
      'Create comprehensive backup before starting',
      'Run full test suite before and after each step',
      'Use dry-run mode to preview all changes',
      'Keep rollback plan ready',
      'Monitor build process after each change',
    ];

    return {
      overallRisk,
      highRiskOperations,
      recommendedOrder,
      safeguards,
    };
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(result: DryRunResult, startTime: number): DryRunSummary {
    const filesRemoved = result.filesToRemove.length;
    const linesRemoved = result.filesToRemove.reduce((sum, action) => sum + action.lineCount, 0);
    const sizeReduced = result.filesToRemove.reduce((sum, action) => sum + action.size, 0);
    const importsOptimized = result.importsToOptimize.reduce(
      (sum, action) => sum + action.estimatedLinesSaved, 0
    );

    return {
      totalFilesAnalyzed: filesRemoved + result.filesToModify.length,
      filesMarkedForRemoval: filesRemoved,
      filesMarkedForModification: result.filesToModify.length,
      estimatedSavings: {
        filesRemoved,
        linesRemoved,
        sizeReduced,
        importsOptimized,
      },
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Generate detailed report
   */
  private async generateReport(result: DryRunResult, outputPath?: string): Promise<void> {
    const reportPath = outputPath || path.join(this.projectRoot, 'cleanup-dry-run-report.md');
    
    const report = this.formatReport(result);
    await fs.promises.writeFile(reportPath, report);
    
    console.log(`📊 Dry run report generated: ${reportPath}`);
  }

  /**
   * Format dry run result as markdown report
   */
  private formatReport(result: DryRunResult): string {
    const { summary, filesToRemove, potentialIssues, riskAssessment } = result;
    
    return `# Code Cleanup Dry Run Report

Generated on: ${new Date().toISOString()}

## Summary

- **Total files analyzed**: ${summary.totalFilesAnalyzed}
- **Files marked for removal**: ${summary.filesMarkedForRemoval}
- **Estimated lines removed**: ${summary.estimatedSavings.linesRemoved}
- **Estimated size reduction**: ${this.formatBytes(summary.estimatedSavings.sizeReduced)}
- **Execution time**: ${summary.executionTime}ms

## Risk Assessment

**Overall Risk**: ${riskAssessment.overallRisk.toUpperCase()}

### High Risk Operations
${riskAssessment.highRiskOperations.map(op => `- ${op}`).join('\n')}

### Recommended Order
${riskAssessment.recommendedOrder.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Files to Remove

${filesToRemove.map(file => `
### ${file.path}
- **Risk**: ${file.risk}
- **Size**: ${this.formatBytes(file.size)}
- **Lines**: ${file.lineCount}
- **Reason**: ${file.reason}
- **Dependencies**: ${file.dependencies.length}
- **Used by**: ${file.usedBy.length}
`).join('\n')}

## Potential Issues

${potentialIssues.map(issue => `
### ${issue.type.toUpperCase()}: ${issue.message}
- **Severity**: ${issue.severity}
- **Affected files**: ${issue.affectedFiles.length}
${issue.recommendation ? `- **Recommendation**: ${issue.recommendation}` : ''}
`).join('\n')}

## Safeguards

${riskAssessment.safeguards.map(safeguard => `- ${safeguard}`).join('\n')}
`;
  }

  // Helper methods
  private getRemovalReason(file: FileAnalysis): string {
    if (!file.isUsed) return 'File is not used anywhere in the codebase';
    if (file.type === 'test' && file.dependencies.length === 0) return 'Test file with no dependencies';
    return 'Marked for removal based on analysis';
  }

  private async findFilesUsingTypes(typeFiles: string[]): Promise<string[]> {
    // This would scan for files importing these types
    // Simplified implementation for dry run
    return [];
  }

  private async findTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = async (dir: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    };

    await scanDir(path.join(this.projectRoot, 'src'));
    return files;
  }

  private extractImports(content: string): {
    unused: string[];
    duplicates: string[];
    optimizations: string[];
  } {
    // Simplified import analysis for dry run
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
    
    return {
      unused: [], // Would require more complex analysis
      duplicates: [], // Would require more complex analysis
      optimizations: importLines.length > 10 ? ['Consider organizing imports'] : [],
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}