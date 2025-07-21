import * as fs from 'fs';
import * as path from 'path';
import { DependencyGraph, FileAnalysis } from './types';
import { UsageScanner } from './usageScanner';

/**
 * Tracks file dependencies to identify unused files safely
 */
export class DependencyTracker {
  private scanner: UsageScanner;
  private dependencyGraph: DependencyGraph = {};

  constructor() {
    this.scanner = new UsageScanner();
  }

  /**
   * Builds dependency graph for given directories
   */
  async buildDependencyGraph(directories: string[], excludePatterns: string[] = []): Promise<DependencyGraph> {
    this.dependencyGraph = {};

    for (const dir of directories) {
      await this.analyzeDependenciesInDirectory(dir, excludePatterns);
    }

    return this.dependencyGraph;
  }

  /**
   * Analyzes dependencies in a directory
   */
  private async analyzeDependenciesInDirectory(dirPath: string, excludePatterns: string[]): Promise<void> {
    try {
      const allReferences = await this.scanner.scanDirectory(dirPath, excludePatterns);
      
      for (const [filePath, references] of allReferences) {
        const dependencies = this.resolveDependencies(filePath, references);
        
        this.dependencyGraph[filePath] = {
          dependencies,
          dependents: [],
          isEntryPoint: false,
          isLeaf: dependencies.length === 0
        };
      }

      // Build reverse dependencies (dependents)
      this.buildReverseDependencies();
      
      // Identify entry points
      this.identifyEntryPoints();
      
    } catch (error) {
      console.warn(`Failed to analyze dependencies in ${dirPath}:`, error);
    }
  }

  /**
   * Resolves import references to actual file paths
   */
  private resolveDependencies(filePath: string, references: string[]): string[] {
    const dependencies: string[] = [];
    const fileDir = path.dirname(filePath);

    for (const ref of references) {
      try {
        let resolvedPath: string;

        if (ref.startsWith('./') || ref.startsWith('../')) {
          // Relative import
          resolvedPath = path.resolve(fileDir, ref);
        } else if (ref.startsWith('/')) {
          // Absolute import from root
          resolvedPath = path.resolve(process.cwd(), ref.substring(1));
        } else {
          // Module import or alias - skip for now
          continue;
        }

        // Try different extensions
        const possiblePaths = [
          resolvedPath,
          resolvedPath + '.ts',
          resolvedPath + '.tsx',
          resolvedPath + '.js',
          resolvedPath + '.jsx',
          path.join(resolvedPath, 'index.ts'),
          path.join(resolvedPath, 'index.tsx')
        ];

        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            dependencies.push(possiblePath);
            break;
          }
        }
      } catch (error) {
        // Skip unresolvable references
        continue;
      }
    }

    return dependencies;
  }  /**

   * Builds reverse dependencies (which files depend on each file)
   */
  private buildReverseDependencies(): void {
    for (const [filePath, info] of Object.entries(this.dependencyGraph)) {
      for (const dependency of info.dependencies) {
        if (this.dependencyGraph[dependency]) {
          this.dependencyGraph[dependency].dependents.push(filePath);
        }
      }
    }
  }

  /**
   * Identifies entry points (files that are not dependencies of others)
   */
  private identifyEntryPoints(): void {
    const allDependencies = new Set<string>();
    
    for (const info of Object.values(this.dependencyGraph)) {
      info.dependencies.forEach(dep => allDependencies.add(dep));
    }

    for (const [filePath, info] of Object.entries(this.dependencyGraph)) {
      info.isEntryPoint = !allDependencies.has(filePath);
    }
  }

  /**
   * Identifies unused files that can be safely removed
   */
  getUnusedFiles(): string[] {
    const unusedFiles: string[] = [];

    for (const [filePath, info] of Object.entries(this.dependencyGraph)) {
      if (info.dependents.length === 0 && !info.isEntryPoint) {
        unusedFiles.push(filePath);
      }
    }

    return unusedFiles;
  }

  /**
   * Gets all files that depend on a specific file
   */
  getDependents(filePath: string): string[] {
    return this.dependencyGraph[filePath]?.dependents || [];
  }

  /**
   * Gets all files that a specific file depends on
   */
  getDependencies(filePath: string): string[] {
    return this.dependencyGraph[filePath]?.dependencies || [];
  }

  /**
   * Checks if a file can be safely removed
   */
  canRemoveFile(filePath: string): { canRemove: boolean; reason: string; risk: 'low' | 'medium' | 'high' } {
    const info = this.dependencyGraph[filePath];
    
    if (!info) {
      return { canRemove: false, reason: 'File not found in dependency graph', risk: 'high' };
    }

    if (info.dependents.length > 0) {
      return { 
        canRemove: false, 
        reason: `File is used by ${info.dependents.length} other files`, 
        risk: 'high' 
      };
    }

    if (info.isEntryPoint) {
      return { 
        canRemove: false, 
        reason: 'File appears to be an entry point', 
        risk: 'medium' 
      };
    }

    return { canRemove: true, reason: 'File has no dependents and is not an entry point', risk: 'low' };
  }
}