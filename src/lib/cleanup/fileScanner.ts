import * as fs from 'fs';
import * as path from 'path';

import { FileAnalysis, UsagePattern, DependencyMap } from './types';

/**
 * File usage scanner for identifying file dependencies and usage patterns
 */
export class FileUsageScanner {
  private usagePatterns: UsagePattern[] = [
    // ES6 imports
    { pattern: /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g, type: 'import', description: 'ES6 import statement' },
    { pattern: /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, type: 'dynamic-import', description: 'Dynamic import' },
    
    // CommonJS requires
    { pattern: /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, type: 'require', description: 'CommonJS require' },
    
    // File references in strings (for routes, etc.)
    { pattern: /['"`]([^'"`]*\/[^'"`]*\.(?:tsx?|jsx?|css|scss|json))['"`]/g, type: 'file-reference', description: 'File path reference' },
    
    // Next.js specific patterns
    { pattern: /href\s*=\s*['"`]([^'"`]+)['"`]/g, type: 'file-reference', description: 'Next.js href reference' },
    { pattern: /router\.push\s*\(\s*['"`]([^'"`]+)['"`]/g, type: 'file-reference', description: 'Router push reference' },
    
    // Component references
    { pattern: /<([A-Z][a-zA-Z0-9]*)/g, type: 'file-reference', description: 'React component usage' },
  ];

  private dependencyMap: DependencyMap = {};
  private fileAnalysisCache: Map<string, FileAnalysis> = new Map();

  /**
   * Recursively scan directory for all relevant files
   */
  async scanDirectory(dirPath: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other common ignore patterns
          if (!this.shouldSkipDirectory(entry.name)) {
            const subFiles = await this.scanDirectory(fullPath, extensions);
            files.push(...subFiles);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Error scanning directory ${dirPath}:`, error);
    }
    
    return files;
  }

  /**
   * Analyze a single file for imports and exports
   */
  async analyzeFile(filePath: string): Promise<FileAnalysis> {
    if (this.fileAnalysisCache.has(filePath)) {
      return this.fileAnalysisCache.get(filePath)!;
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const stats = await fs.promises.stat(filePath);
      
      const dependencies = this.extractDependencies(content, filePath);
      const exports = this.extractExports(content);
      
      const analysis: FileAnalysis = {
        path: filePath,
        type: this.determineFileType(filePath, content),
        isUsed: false, // Will be determined later
        usedBy: [],
        dependencies,
        canRemove: false, // Will be determined later
        removalRisk: 'medium', // Default, will be calculated
        size: stats.size,
        lastModified: stats.mtime,
      };

      // Store in dependency map
      this.dependencyMap[filePath] = {
        imports: dependencies,
        exports,
        usedBy: [],
        dependencies,
      };

      this.fileAnalysisCache.set(filePath, analysis);
      return analysis;
    } catch (error) {
      console.warn(`Error analyzing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Extract all dependencies (imports) from file content
   */
  private extractDependencies(content: string, filePath: string): string[] {
    const dependencies: Set<string> = new Set();
    
    for (const pattern of this.usagePatterns) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        const dependency = match[1];
        if (dependency) {
          // Resolve relative paths to absolute paths
          const resolvedPath = this.resolveDependencyPath(dependency, filePath);
          if (resolvedPath) {
            dependencies.add(resolvedPath);
          }
        }
      }
    }
    
    return Array.from(dependencies);
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
   * Resolve dependency path relative to the importing file
   */
  private resolveDependencyPath(dependency: string, fromFile: string): string | null {
    // Skip external packages
    if (!dependency.startsWith('.') && !dependency.startsWith('/')) {
      return null;
    }
    
    const fromDir = path.dirname(fromFile);
    let resolvedPath = path.resolve(fromDir, dependency);
    
    // Try different extensions if file doesn't exist
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    
    if (!fs.existsSync(resolvedPath)) {
      // Try with extensions
      for (const ext of extensions) {
        const withExt = resolvedPath + ext;
        if (fs.existsSync(withExt)) {
          resolvedPath = withExt;
          break;
        }
      }
      
      // Try index files
      if (!fs.existsSync(resolvedPath)) {
        for (const ext of extensions) {
          const indexPath = path.join(resolvedPath, `index${ext}`);
          if (fs.existsSync(indexPath)) {
            resolvedPath = indexPath;
            break;
          }
        }
      }
    }
    
    return fs.existsSync(resolvedPath) ? resolvedPath : null;
  }

  /**
   * Determine file type based on path and content
   */
  private determineFileType(filePath: string, content: string): FileAnalysis['type'] {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    
    // Test files
    if (fileName.includes('.test.') || fileName.includes('.spec.') || dirName.includes('__tests__')) {
      return 'test';
    }
    
    // Pages (Next.js app directory)
    if (dirName.includes('/app/') && (fileName === 'page.tsx' || fileName === 'layout.tsx')) {
      return 'page';
    }
    
    // Hooks
    if (fileName.startsWith('use') && fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      return 'hook';
    }
    
    // Components
    if (content.includes('export default') && (content.includes('React') || content.includes('jsx') || content.includes('tsx'))) {
      return 'component';
    }
    
    // Types
    if (dirName.includes('/types/') || fileName.includes('.types.') || content.includes('interface ') || content.includes('type ')) {
      return 'type';
    }
    
    return 'utility';
  }

  /**
   * Build usage map by analyzing all files and their dependencies
   */
  async buildUsageMap(files: FileAnalysis[]): Promise<void> {
    // First pass: analyze all files
    for (const file of files) {
      if (!this.dependencyMap[file.path]) {
        await this.analyzeFile(file.path);
      }
    }
    
    // Second pass: build reverse dependencies (usedBy)
    for (const [filePath, deps] of Object.entries(this.dependencyMap)) {
      for (const dependency of deps.dependencies) {
        if (this.dependencyMap[dependency]) {
          this.dependencyMap[dependency].usedBy.push(filePath);
        }
      }
    }
    
    // Third pass: update file analysis with usage information
    for (const file of files) {
      const deps = this.dependencyMap[file.path];
      if (deps) {
        file.usedBy = deps.usedBy;
        file.isUsed = deps.usedBy.length > 0;
        file.canRemove = this.canSafelyRemove(file);
        file.removalRisk = this.assessRemovalRisk(file);
      }
    }
  }

  /**
   * Check if a file can be safely removed
   */
  private canSafelyRemove(file: FileAnalysis): boolean {
    // Never remove if used by other files
    if (file.usedBy.length > 0) {
      return false;
    }
    
    // Never remove entry points
    if (file.type === 'page' || file.path.includes('layout.tsx') || file.path.includes('page.tsx')) {
      return false;
    }
    
    // Be cautious with configuration files
    if (file.path.includes('config') || file.path.includes('.config.')) {
      return false;
    }
    
    return true;
  }

  /**
   * Assess the risk of removing a file
   */
  private assessRemovalRisk(file: FileAnalysis): 'low' | 'medium' | 'high' {
    // High risk for pages and layouts
    if (file.type === 'page' || file.path.includes('layout.tsx')) {
      return 'high';
    }
    
    // High risk if used by many files
    if (file.usedBy.length > 5) {
      return 'high';
    }
    
    // Medium risk if used by some files
    if (file.usedBy.length > 0) {
      return 'medium';
    }
    
    // Low risk for unused files
    return 'low';
  }

  /**
   * Check if directory should be skipped during scanning
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      '.next',
      'dist',
      'build',
      '.vercel',
      '.swc',
      '__pycache__',
    ];
    
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * Get dependency map
   */
  getDependencyMap(): DependencyMap {
    return this.dependencyMap;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.fileAnalysisCache.clear();
    this.dependencyMap = {};
  }
}