import * as fs from 'fs';
import * as path from 'path';

interface ImportOptimization {
  file: string;
  optimizations: {
    type: 'consolidate' | 'absolutePath' | 'removeAlias';
    original: string;
    optimized: string;
    description: string;
  }[];
}

export class ImportPathOptimizer {
  private readonly extensions = ['.ts', '.tsx', '.js', '.jsx'];
  private readonly srcPath: string;
  
  constructor(srcPath: string) {
    this.srcPath = srcPath;
  }
  
  /**
   * Optimize import paths in all TypeScript/React files
   */
  async optimizeDirectory(dirPath: string): Promise<void> {
    const files = this.getAllFiles(dirPath);
    let optimizedCount = 0;
    const allOptimizations: ImportOptimization[] = [];
    
    console.log('⚡ Optimizing import paths...');
    
    for (const file of files) {
      if (this.isAnalyzableFile(file)) {
        const optimizations = await this.optimizeFile(file);
        if (optimizations.optimizations.length > 0) {
          allOptimizations.push(optimizations);
          optimizedCount++;
          console.log(`✅ Optimized: ${file.replace(dirPath, 'src')} (${optimizations.optimizations.length} changes)`);
        }
      }
    }
    
    // Print summary
    console.log(`\n📊 Optimization Summary:`);
    let totalConsolidations = 0;
    let totalAbsolutePaths = 0;
    let totalAliasRemovals = 0;
    
    for (const opt of allOptimizations) {
      for (const change of opt.optimizations) {
        switch (change.type) {
          case 'consolidate':
            totalConsolidations++;
            break;
          case 'absolutePath':
            totalAbsolutePaths++;
            break;
          case 'removeAlias':
            totalAliasRemovals++;
            break;
        }
      }
    }
    
    console.log(`- Files optimized: ${optimizedCount}`);
    console.log(`- Import consolidations: ${totalConsolidations}`);
    console.log(`- Relative to absolute conversions: ${totalAbsolutePaths}`);
    console.log(`- Alias removals: ${totalAliasRemovals}`);
    
    console.log(`\n🎉 Import path optimization complete!`);
  }
  
  /**
   * Optimize import paths in a single file
   */
  async optimizeFile(filePath: string): Promise<ImportOptimization> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const optimizations: ImportOptimization['optimizations'] = [];
    let newContent = content;
    
    // 1. Consolidate multiple imports from same module
    const consolidatedContent = this.consolidateImports(newContent, optimizations);
    newContent = consolidatedContent;
    
    // 2. Convert relative imports to absolute where appropriate
    const absolutePathContent = this.convertToAbsolutePaths(newContent, filePath, optimizations);
    newContent = absolutePathContent;
    
    // 3. Remove redundant import aliases
    const aliasOptimizedContent = this.removeRedundantAliases(newContent, optimizations);
    newContent = aliasOptimizedContent;
    
    // Write optimized content if changes were made
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
    }
    
    return {
      file: filePath,
      optimizations
    };
  }
  
  /**
   * Consolidate multiple imports from the same module
   */
  private consolidateImports(content: string, optimizations: ImportOptimization['optimizations']): string {
    const lines = content.split('\n');
    const importMap = new Map<string, {
      lines: number[];
      imports: string[];
      hasDefault: boolean;
      defaultName?: string;
      isTypeOnly: boolean[];
    }>();
    
    // Find all import statements and group by module
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('import ') && line.includes(' from ')) {
        const fromMatch = line.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (fromMatch) {
          const module = fromMatch[1];
          
          if (!importMap.has(module)) {
            importMap.set(module, {
              lines: [],
              imports: [],
              hasDefault: false,
              isTypeOnly: []
            });
          }
          
          const moduleData = importMap.get(module)!;
          moduleData.lines.push(i);
          
          // Parse import statement
          const isTypeOnly = line.includes('import type');
          
          if (line.includes('{')) {
            // Named imports
            const namedMatch = line.match(/\{([^}]+)\}/);
            if (namedMatch) {
              const namedImports = namedMatch[1]
                .split(',')
                .map(imp => imp.trim())
                .filter(imp => imp);
              
              moduleData.imports.push(...namedImports);
              moduleData.isTypeOnly.push(...namedImports.map(() => isTypeOnly));
            }
            
            // Check for default import too
            const defaultMatch = line.match(/import\s+(\w+)\s*,/);
            if (defaultMatch) {
              moduleData.hasDefault = true;
              moduleData.defaultName = defaultMatch[1];
            }
          } else if (line.includes('* as ')) {
            // Namespace import - don't consolidate these with other imports
            continue;
          } else {
            // Default import
            const defaultMatch = line.match(/import\s+(\w+)\s+from/);
            if (defaultMatch) {
              moduleData.hasDefault = true;
              moduleData.defaultName = defaultMatch[1];
            }
          }
        }
      }
    }
    
    // Consolidate imports that have multiple lines
    const newLines = [...lines];
    
    for (const [module, data] of importMap) {
      if (data.lines.length > 1) {
        // Remove all but the first import line
        for (let i = 1; i < data.lines.length; i++) {
          newLines[data.lines[i]] = '';
        }
        
        // Create consolidated import
        let consolidatedImport = 'import ';
        
        if (data.hasDefault && data.defaultName) {
          consolidatedImport += data.defaultName;
          if (data.imports.length > 0) {
            consolidatedImport += ', ';
          }
        }
        
        if (data.imports.length > 0) {
          // Separate type and regular imports
          const typeImports = data.imports.filter((_, i) => data.isTypeOnly[i]);
          const regularImports = data.imports.filter((_, i) => !data.isTypeOnly[i]);
          
          if (typeImports.length > 0 && regularImports.length > 0) {
            consolidatedImport += `{ ${regularImports.join(', ')}, type ${typeImports.join(', type ')} }`;
          } else if (typeImports.length > 0) {
            consolidatedImport += `type { ${typeImports.join(', ')} }`;
          } else {
            consolidatedImport += `{ ${regularImports.join(', ')} }`;
          }
        }
        
        consolidatedImport += ` from '${module}';`;
        
        // Replace the first import line with consolidated import
        newLines[data.lines[0]] = consolidatedImport;
        
        optimizations.push({
          type: 'consolidate',
          original: data.lines.map(i => lines[i]).join('\n'),
          optimized: consolidatedImport,
          description: `Consolidated ${data.lines.length} imports from '${module}'`
        });
      }
    }
    
    return newLines.join('\n');
  }
  
  /**
   * Convert relative imports to absolute paths where appropriate
   */
  private convertToAbsolutePaths(content: string, filePath: string, optimizations: ImportOptimization['optimizations']): string {
    const lines = content.split('\n');
    const newLines = [...lines];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes(' from ') && line.includes('./')) {
        const fromMatch = line.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (fromMatch) {
          const relativePath = fromMatch[1];
          
          // Only convert if it's a deep relative path (more than one level up)
          if (relativePath.startsWith('../') && relativePath.split('../').length > 2) {
            const absolutePath = this.convertRelativeToAbsolute(relativePath, filePath);
            
            if (absolutePath) {
              const newLine = line.replace(relativePath, absolutePath);
              newLines[i] = newLine;
              
              optimizations.push({
                type: 'absolutePath',
                original: line,
                optimized: newLine,
                description: `Converted relative path '${relativePath}' to absolute path '${absolutePath}'`
              });
            }
          }
        }
      }
    }
    
    return newLines.join('\n');
  }
  
  /**
   * Convert relative path to absolute path using @/ alias
   */
  private convertRelativeToAbsolute(relativePath: string, filePath: string): string | null {
    try {
      const fileDir = path.dirname(filePath);
      const resolvedPath = path.resolve(fileDir, relativePath);
      const srcPath = path.resolve(this.srcPath);
      
      if (resolvedPath.startsWith(srcPath)) {
        const relativeTSrc = path.relative(srcPath, resolvedPath);
        return '@/' + relativeTSrc.replace(/\\/g, '/');
      }
    } catch (error) {
      // Ignore errors and return null
    }
    
    return null;
  }
  
  /**
   * Remove redundant import aliases
   */
  private removeRedundantAliases(content: string, optimizations: ImportOptimization['optimizations']): string {
    const lines = content.split('\n');
    const newLines = [...lines];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for imports with aliases that match the original name
      const aliasMatch = line.match(/import\s+\{([^}]+)\}\s+from/);
      if (aliasMatch) {
        const imports = aliasMatch[1];
        const redundantAliases: string[] = [];
        
        // Find redundant aliases like "Button as Button"
        const aliasPattern = /(\w+)\s+as\s+(\w+)/g;
        let match;
        
        while ((match = aliasPattern.exec(imports)) !== null) {
          const [fullMatch, original, alias] = match;
          if (original === alias) {
            redundantAliases.push(fullMatch);
          }
        }
        
        if (redundantAliases.length > 0) {
          let newImports = imports;
          
          for (const redundantAlias of redundantAliases) {
            const original = redundantAlias.split(' as ')[0];
            newImports = newImports.replace(redundantAlias, original);
          }
          
          const newLine = line.replace(imports, newImports);
          newLines[i] = newLine;
          
          optimizations.push({
            type: 'removeAlias',
            original: line,
            optimized: newLine,
            description: `Removed redundant aliases: ${redundantAliases.join(', ')}`
          });
        }
      }
    }
    
    return newLines.join('\n');
  }
  
  /**
   * Get all files recursively from directory
   */
  private getAllFiles(dirPath: string): string[] {
    const files: string[] = [];
    
    const traverse = (currentPath: string) => {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other common directories
          if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
            traverse(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    };
    
    traverse(dirPath);
    return files;
  }
  
  /**
   * Check if file should be analyzed
   */
  private isAnalyzableFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    return this.extensions.includes(ext);
  }
}