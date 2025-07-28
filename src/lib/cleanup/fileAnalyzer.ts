import * as fs from 'fs';
import * as path from 'path';

import { DependencyTracker } from './dependencyTracker';
import { FileAnalysis, CleanupConfig } from './types';

/**
 * Analyzes files to determine their usage and removal safety
 */
export class FileAnalyzer {
  private dependencyTracker: DependencyTracker;

  constructor() {
    this.dependencyTracker = new DependencyTracker();
  }

  /**
   * Analyzes files in specified directories
   */
  async analyzeFiles(config: CleanupConfig): Promise<FileAnalysis[]> {
    const analyses: FileAnalysis[] = [];
    
    // Build dependency graph first
    await this.dependencyTracker.buildDependencyGraph(config.targetDirectories, config.excludePatterns);

    for (const targetDir of config.targetDirectories) {
      const dirAnalyses = await this.analyzeDirectory(targetDir, config);
      analyses.push(...dirAnalyses);
    }

    return analyses;
  }

  /**
   * Analyzes all files in a directory
   */
  private async analyzeDirectory(dirPath: string, config: CleanupConfig): Promise<FileAnalysis[]> {
    const analyses: FileAnalysis[] = [];

    try {
      if (!fs.existsSync(dirPath)) {
        console.warn(`Directory does not exist: ${dirPath}`);
        return analyses;
      }

      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (this.shouldExclude(fullPath, config.excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          const subAnalyses = await this.analyzeDirectory(fullPath, config);
          analyses.push(...subAnalyses);
        } else if (this.isAnalyzableFile(entry.name)) {
          const analysis = await this.analyzeFile(fullPath);
          analyses.push(analysis);
        }
      }
    } catch (error) {
      console.warn(`Failed to analyze directory ${dirPath}:`, error);
    }

    return analyses;
  }

  /**
   * Analyzes a single file
   */
  private async analyzeFile(filePath: string): Promise<FileAnalysis> {
    const stats = await fs.promises.stat(filePath);
    const dependents = this.dependencyTracker.getDependents(filePath);
    const dependencies = this.dependencyTracker.getDependencies(filePath);
    const removalCheck = this.dependencyTracker.canRemoveFile(filePath);

    return {
      path: filePath,
      type: this.determineFileType(filePath),
      isUsed: dependents.length > 0,
      usedBy: dependents,
      dependencies,
      canRemove: removalCheck.canRemove,
      removalRisk: removalCheck.risk,
      size: stats.size,
      lastModified: stats.mtime
    };
  }  /**
  
 * Determines the type of file based on its path and content
   */
  private determineFileType(filePath: string): FileAnalysis['type'] {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);

    if (fileName.includes('.test.') || fileName.includes('.spec.')) {
      return 'test';
    }

    if (dirName.includes('/api/') || dirName.includes('\\api\\')) {
      return 'api';
    }

    if (dirName.includes('/pages/') || dirName.includes('\\pages\\') || 
        dirName.includes('/app/') || dirName.includes('\\app\\')) {
      return 'page';
    }

    if (dirName.includes('/hooks/') || dirName.includes('\\hooks\\') || 
        fileName.startsWith('use')) {
      return 'hook';
    }

    if (dirName.includes('/components/') || dirName.includes('\\components\\')) {
      return 'component';
    }

    if (dirName.includes('/types/') || dirName.includes('\\types\\') || 
        fileName.includes('types') || fileName.endsWith('.d.ts')) {
      return 'type';
    }

    return 'utility';
  }

  /**
   * Checks if file should be excluded from analysis
   */
  private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });
  }

  /**
   * Checks if file type should be analyzed
   */
  private isAnalyzableFile(fileName: string): boolean {
    const analyzableExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    return analyzableExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Gets files that can be safely removed
   */
  getRemovableFiles(analyses: FileAnalysis[]): FileAnalysis[] {
    return analyses.filter(analysis => 
      analysis.canRemove && 
      analysis.removalRisk === 'low' &&
      !analysis.isUsed
    );
  }

  /**
   * Gets files with high removal risk
   */
  getHighRiskFiles(analyses: FileAnalysis[]): FileAnalysis[] {
    return analyses.filter(analysis => analysis.removalRisk === 'high');
  }
}