import * as fs from 'fs';
import * as path from 'path';

interface ImportGroup {
  external: string[];
  internal: string[];
  relative: string[];
  typeOnly: string[];
}

interface OrganizedImport {
  original: string;
  organized: string;
  group: 'external' | 'internal' | 'relative' | 'typeOnly';
}

export class ImportOrganizer {
  private readonly extensions = ['.ts', '.tsx', '.js', '.jsx'];
  
  /**
   * Organize imports in all TypeScript/React files
   */
  async organizeDirectory(dirPath: string): Promise<void> {
    const files = this.getAllFiles(dirPath);
    let organizedCount = 0;
    
    console.log('🔄 Organizing imports...');
    
    for (const file of files) {
      if (this.isAnalyzableFile(file)) {
        const wasOrganized = await this.organizeFile(file);
        if (wasOrganized) {
          organizedCount++;
          console.log(`✅ Organized: ${file.replace(dirPath, 'src')}`);
        }
      }
    }
    
    console.log(`\n🎉 Import organization complete! Organized ${organizedCount} files.`);
  }
  
  /**
   * Organize imports in a single file
   */
  async organizeFile(filePath: string): Promise<boolean> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const { importLines, otherLines, importStartIndex, importEndIndex } = this.separateImports(lines);
    
    if (importLines.length === 0) {
      return false;
    }
    
    const organizedImports = this.organizeImports(importLines);
    const originalImportsStr = importLines.join('\n');
    const organizedImportsStr = organizedImports.join('\n');
    
    // Check if organization changed anything
    if (originalImportsStr === organizedImportsStr) {
      return false;
    }
    
    // Reconstruct the file with organized imports
    const newLines = [
      ...otherLines.slice(0, importStartIndex),
      ...organizedImports,
      ...otherLines.slice(importEndIndex)
    ];
    
    const newContent = newLines.join('\n');
    fs.writeFileSync(filePath, newContent);
    
    return true;
  }
  
  /**
   * Separate import lines from other code
   */
  private separateImports(lines: string[]): {
    importLines: string[];
    otherLines: string[];
    importStartIndex: number;
    importEndIndex: number;
  } {
    const importLines: string[] = [];
    const otherLines: string[] = [...lines];
    let importStartIndex = -1;
    let importEndIndex = -1;
    let inImportBlock = false;
    let currentImport = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments at the top
      if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line === '') {
        continue;
      }
      
      // Start of import statement
      if (line.startsWith('import ') || line.startsWith('export ') && line.includes(' from ')) {
        if (importStartIndex === -1) {
          importStartIndex = i;
        }
        
        inImportBlock = true;
        currentImport = lines[i];
        
        // Single line import
        if (line.includes(';') || (!line.includes('{') || line.includes('}'))) {
          importLines.push(currentImport);
          importEndIndex = i + 1;
          currentImport = '';
        }
      }
      // Continuation of multi-line import
      else if (inImportBlock && currentImport) {
        currentImport += '\n' + lines[i];
        
        // End of multi-line import
        if (line.includes(';') || line.includes('}')) {
          importLines.push(currentImport);
          importEndIndex = i + 1;
          currentImport = '';
        }
      }
      // End of import block
      else if (inImportBlock && !currentImport) {
        break;
      }
    }
    
    // Remove import lines from otherLines
    if (importStartIndex !== -1 && importEndIndex !== -1) {
      for (let i = importStartIndex; i < importEndIndex; i++) {
        otherLines[i] = '';
      }
    }
    
    return {
      importLines,
      otherLines,
      importStartIndex: importStartIndex === -1 ? 0 : importStartIndex,
      importEndIndex: importEndIndex === -1 ? 0 : importEndIndex
    };
  }
  
  /**
   * Organize imports according to standard conventions
   */
  private organizeImports(importLines: string[]): string[] {
    const groups: ImportGroup = {
      external: [],
      internal: [],
      relative: [],
      typeOnly: []
    };
    
    // Categorize imports
    for (const importLine of importLines) {
      const category = this.categorizeImport(importLine);
      groups[category].push(importLine);
    }
    
    // Sort each group
    groups.external.sort();
    groups.internal.sort();
    groups.relative.sort();
    groups.typeOnly.sort();
    
    // Combine groups with proper spacing
    const organized: string[] = [];
    
    // Type-only imports first
    if (groups.typeOnly.length > 0) {
      organized.push(...groups.typeOnly);
      organized.push('');
    }
    
    // External imports
    if (groups.external.length > 0) {
      organized.push(...groups.external);
      organized.push('');
    }
    
    // Internal imports
    if (groups.internal.length > 0) {
      organized.push(...groups.internal);
      organized.push('');
    }
    
    // Relative imports
    if (groups.relative.length > 0) {
      organized.push(...groups.relative);
    }
    
    // Remove trailing empty line
    while (organized.length > 0 && organized[organized.length - 1] === '') {
      organized.pop();
    }
    
    return organized;
  }
  
  /**
   * Categorize an import statement
   */
  private categorizeImport(importLine: string): keyof ImportGroup {
    const cleanLine = importLine.replace(/\s+/g, ' ').trim();
    
    // Type-only imports
    if (cleanLine.includes('import type')) {
      return 'typeOnly';
    }
    
    // Extract module name
    const fromMatch = cleanLine.match(/from\s+['"`]([^'"`]+)['"`]/);
    if (!fromMatch) {
      return 'external';
    }
    
    const moduleName = fromMatch[1];
    
    // Relative imports (start with . or ..)
    if (moduleName.startsWith('.')) {
      return 'relative';
    }
    
    // Internal imports (start with @/)
    if (moduleName.startsWith('@/')) {
      return 'internal';
    }
    
    // External imports (everything else)
    return 'external';
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