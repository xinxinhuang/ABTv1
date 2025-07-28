import * as fs from 'fs';
import * as path from 'path';

import { FileUsageScanner } from './fileScanner';

/**
 * Specialized analyzer for battle system v1 usage
 */
export class BattleV1Analyzer {
  private scanner: FileUsageScanner;
  
  // Battle v1 files and directories to analyze
  private battleV1Targets = [
    'src/hooks/battle/',
    'src/hooks/useBattle.ts',
    'src/lib/battle/battleLogic.ts',
    'src/lib/battle/',
    'src/components/game/battle/', // if exists
    'src/app/battle/', // old battle routes
  ];

  constructor() {
    this.scanner = new FileUsageScanner();
  }

  /**
   * Analyze battle system v1 usage across the codebase
   */
  async analyzeBattleV1Usage(): Promise<BattleV1AnalysisResult> {
    console.log('Analyzing Battle System v1 usage...\n');
    
    const result: BattleV1AnalysisResult = {
      battleV1Files: [],
      usageReferences: [],
      routeReferences: [],
      componentReferences: [],
      hookReferences: [],
      canSafelyRemove: [],
      requiresManualReview: [],
      summary: {
        totalV1Files: 0,
        totalReferences: 0,
        safeToRemove: 0,
        needsReview: 0,
      },
    };

    // Step 1: Find all battle v1 files
    result.battleV1Files = await this.findBattleV1Files();
    console.log(`Found ${result.battleV1Files.length} battle v1 files`);

    // Step 2: Search for references to these files
    result.usageReferences = await this.findUsageReferences(result.battleV1Files);
    console.log(`Found ${result.usageReferences.length} usage references`);

    // Step 3: Analyze specific types of references
    result.routeReferences = await this.findRouteReferences();
    result.componentReferences = await this.findComponentReferences();
    result.hookReferences = await this.findHookReferences();

    // Step 4: Determine what can be safely removed
    result.canSafelyRemove = this.determineSafeRemoval(result);
    result.requiresManualReview = this.determineManualReview(result);

    // Step 5: Generate summary
    result.summary = {
      totalV1Files: result.battleV1Files.length,
      totalReferences: result.usageReferences.length,
      safeToRemove: result.canSafelyRemove.length,
      needsReview: result.requiresManualReview.length,
    };

    return result;
  }

  /**
   * Find all battle v1 related files
   */
  private async findBattleV1Files(): Promise<BattleV1File[]> {
    const files: BattleV1File[] = [];
    const baseDir = path.resolve(process.cwd(), 'booster-game');

    for (const target of this.battleV1Targets) {
      const fullPath = path.join(baseDir, target);
      
      try {
        const stats = await fs.promises.stat(fullPath);
        
        if (stats.isDirectory()) {
          // Scan directory for files
          const dirFiles = await this.scanner.scanDirectory(fullPath);
          for (const file of dirFiles) {
            const fileInfo = await this.createBattleV1FileInfo(file);
            if (fileInfo) files.push(fileInfo);
          }
        } else if (stats.isFile()) {
          // Single file
          const fileInfo = await this.createBattleV1FileInfo(fullPath);
          if (fileInfo) files.push(fileInfo);
        }
      } catch (error) {
        // File/directory doesn't exist, which is fine
        console.log(`Battle v1 target not found: ${target}`);
      }
    }

    return files;
  }

  /**
   * Create battle v1 file information
   */
  private async createBattleV1FileInfo(filePath: string): Promise<BattleV1File | null> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const stats = await fs.promises.stat(filePath);
      const relativePath = path.relative(path.resolve(process.cwd(), 'booster-game'), filePath);

      return {
        path: filePath,
        relativePath,
        size: stats.size,
        lastModified: stats.mtime,
        exports: this.extractExports(content),
        isBattleV1: this.isBattleV1File(filePath, content),
      };
    } catch (error) {
      console.warn(`Error analyzing battle v1 file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if file is actually a battle v1 file
   */
  private isBattleV1File(filePath: string, content: string): boolean {
    // Check path patterns
    if (filePath.includes('/battle/') && !filePath.includes('/battle-v2/')) {
      return true;
    }
    
    if (filePath.includes('useBattle.ts') && !filePath.includes('useBattle-v2')) {
      return true;
    }

    // Check content patterns for battle v1 specific code
    const battleV1Patterns = [
      'battleLogic',
      'useBattle',
      'BattleState',
      'BattleAction',
      '/battle/', // route references
    ];

    return battleV1Patterns.some(pattern => content.includes(pattern));
  }

  /**
   * Extract exports from file content
   */
  private extractExports(content: string): string[] {
    const exports: Set<string> = new Set();
    
    // Named exports
    const namedExportPattern = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;
    while ((match = namedExportPattern.exec(content)) !== null) {
      exports.add(match[1]);
    }
    
    // Export statements
    const exportStatementPattern = /export\s*\{\s*([^}]+)\s*\}/g;
    while ((match = exportStatementPattern.exec(content)) !== null) {
      const exportList = match[1].split(',').map(e => e.trim().split(/\s+as\s+/)[0].trim());
      exportList.forEach(exp => exports.add(exp));
    }
    
    // Default exports
    if (content.includes('export default')) {
      exports.add('default');
    }
    
    return Array.from(exports);
  }

  /**
   * Find usage references to battle v1 files
   */
  private async findUsageReferences(battleV1Files: BattleV1File[]): Promise<UsageReference[]> {
    const references: UsageReference[] = [];
    const srcDir = path.resolve(process.cwd(), 'booster-game/src');
    
    // Get all source files to search
    const allFiles = await this.scanner.scanDirectory(srcDir);
    
    for (const file of allFiles) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const relativePath = path.relative(path.resolve(process.cwd(), 'booster-game'), file);
        
        // Search for references to battle v1 files
        for (const battleFile of battleV1Files) {
          const refs = this.findReferencesInFile(content, battleFile, file);
          references.push(...refs);
        }
      } catch (error) {
        console.warn(`Error searching file ${file}:`, error);
      }
    }
    
    return references;
  }

  /**
   * Find references to a battle v1 file within another file
   */
  private findReferencesInFile(content: string, battleFile: BattleV1File, searchingInFile: string): UsageReference[] {
    const references: UsageReference[] = [];
    const lines = content.split('\n');
    
    // Search for import statements
    const importPatterns = [
      new RegExp(`from\\s+['"\`]([^'"\`]*${path.basename(battleFile.path, path.extname(battleFile.path))}[^'"\`]*)['"\`]`, 'g'),
      new RegExp(`import\\s*\\(\\s*['"\`]([^'"\`]*${path.basename(battleFile.path, path.extname(battleFile.path))}[^'"\`]*)['"\`]`, 'g'),
    ];
    
    // Search for usage of exports
    for (const exportName of battleFile.exports) {
      if (exportName === 'default') continue;
      
      const usagePattern = new RegExp(`\\b${exportName}\\b`, 'g');
      let match;
      let lineNumber = 0;
      
      for (const line of lines) {
        lineNumber++;
        if (usagePattern.test(line)) {
          references.push({
            file: searchingInFile,
            line: lineNumber,
            content: line.trim(),
            type: 'usage',
            referencedFile: battleFile.path,
            referencedExport: exportName,
          });
        }
      }
    }
    
    // Search for import statements
    for (const pattern of importPatterns) {
      let match;
      let lineNumber = 0;
      
      for (const line of lines) {
        lineNumber++;
        pattern.lastIndex = 0; // Reset regex
        if ((match = pattern.exec(line)) !== null) {
          references.push({
            file: searchingInFile,
            line: lineNumber,
            content: line.trim(),
            type: 'import',
            referencedFile: battleFile.path,
            referencedExport: 'import',
          });
        }
      }
    }
    
    return references;
  }

  /**
   * Find route references to old battle system
   */
  private async findRouteReferences(): Promise<RouteReference[]> {
    const references: RouteReference[] = [];
    const srcDir = path.resolve(process.cwd(), 'booster-game/src');
    const allFiles = await this.scanner.scanDirectory(srcDir);
    
    const routePatterns = [
      /['"`]\/battle\/[^'"`]*['"`]/g,
      /['"`]\/game\/arena\/battle\/[^'"`]*['"`]/g,
      /router\.push\s*\(\s*['"`]([^'"`]*\/battle\/[^'"`]*)['"`]/g,
      /href\s*=\s*['"`]([^'"`]*\/battle\/[^'"`]*)['"`]/g,
    ];
    
    for (const file of allFiles) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const lines = content.split('\n');
        
        for (const pattern of routePatterns) {
          let lineNumber = 0;
          for (const line of lines) {
            lineNumber++;
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(line)) !== null) {
              references.push({
                file,
                line: lineNumber,
                content: line.trim(),
                route: match[1] || match[0],
                type: 'route-reference',
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Error searching routes in ${file}:`, error);
      }
    }
    
    return references;
  }

  /**
   * Find component references
   */
  private async findComponentReferences(): Promise<ComponentReference[]> {
    const references: ComponentReference[] = [];
    const srcDir = path.resolve(process.cwd(), 'booster-game/src');
    const allFiles = await this.scanner.scanDirectory(srcDir);
    
    // Battle v1 component patterns
    const componentPatterns = [
      /<Battle[^V2][^>]*>/g,
      /<BattleComponent[^>]*>/g,
      /<BattleView[^>]*>/g,
    ];
    
    for (const file of allFiles) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const lines = content.split('\n');
        
        for (const pattern of componentPatterns) {
          let lineNumber = 0;
          for (const line of lines) {
            lineNumber++;
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(line)) !== null) {
              references.push({
                file,
                line: lineNumber,
                content: line.trim(),
                component: match[0],
                type: 'component-usage',
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Error searching components in ${file}:`, error);
      }
    }
    
    return references;
  }

  /**
   * Find hook references
   */
  private async findHookReferences(): Promise<HookReference[]> {
    const references: HookReference[] = [];
    const srcDir = path.resolve(process.cwd(), 'booster-game/src');
    const allFiles = await this.scanner.scanDirectory(srcDir);
    
    const hookPatterns = [
      /useBattle(?!V2|_v2)\b/g,
      /useBattleState\b/g,
      /useBattleActions\b/g,
    ];
    
    for (const file of allFiles) {
      try {
        const content = await fs.promises.readFile(file, 'utf-8');
        const lines = content.split('\n');
        
        for (const pattern of hookPatterns) {
          let lineNumber = 0;
          for (const line of lines) {
            lineNumber++;
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(line)) !== null) {
              references.push({
                file,
                line: lineNumber,
                content: line.trim(),
                hook: match[0],
                type: 'hook-usage',
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Error searching hooks in ${file}:`, error);
      }
    }
    
    return references;
  }

  /**
   * Determine which files can be safely removed
   */
  private determineSafeRemoval(result: BattleV1AnalysisResult): string[] {
    const safeToRemove: string[] = [];
    
    for (const file of result.battleV1Files) {
      // Check if file has any references
      const hasReferences = result.usageReferences.some(ref => 
        ref.referencedFile === file.path
      );
      
      // Check if it's a test file (safer to remove)
      const isTestFile = file.path.includes('.test.') || file.path.includes('.spec.');
      
      if (!hasReferences || isTestFile) {
        safeToRemove.push(file.path);
      }
    }
    
    return safeToRemove;
  }

  /**
   * Determine which files require manual review
   */
  private determineManualReview(result: BattleV1AnalysisResult): string[] {
    const needsReview: string[] = [];
    
    for (const file of result.battleV1Files) {
      const hasReferences = result.usageReferences.some(ref => 
        ref.referencedFile === file.path
      );
      
      if (hasReferences) {
        needsReview.push(file.path);
      }
    }
    
    return needsReview;
  }
}

// Type definitions for battle v1 analysis
export interface BattleV1File {
  path: string;
  relativePath: string;
  size: number;
  lastModified: Date;
  exports: string[];
  isBattleV1: boolean;
}

export interface UsageReference {
  file: string;
  line: number;
  content: string;
  type: 'import' | 'usage';
  referencedFile: string;
  referencedExport: string;
}

export interface RouteReference {
  file: string;
  line: number;
  content: string;
  route: string;
  type: 'route-reference';
}

export interface ComponentReference {
  file: string;
  line: number;
  content: string;
  component: string;
  type: 'component-usage';
}

export interface HookReference {
  file: string;
  line: number;
  content: string;
  hook: string;
  type: 'hook-usage';
}

export interface BattleV1AnalysisResult {
  battleV1Files: BattleV1File[];
  usageReferences: UsageReference[];
  routeReferences: RouteReference[];
  componentReferences: ComponentReference[];
  hookReferences: HookReference[];
  canSafelyRemove: string[];
  requiresManualReview: string[];
  summary: {
    totalV1Files: number;
    totalReferences: number;
    safeToRemove: number;
    needsReview: number;
  };
}