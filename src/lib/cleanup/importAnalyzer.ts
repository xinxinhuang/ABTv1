import * as fs from 'fs';
import * as path from 'path';

interface ImportStatement {
  line: number;
  fullStatement: string;
  module: string;
  imports: string[];
  isDefault: boolean;
  isNamespace: boolean;
  isTypeOnly: boolean;
}

interface UnusedImport {
  file: string;
  line: number;
  importName: string;
  module: string;
  fullStatement: string;
}

interface ImportAnalysisResult {
  file: string;
  totalImports: number;
  unusedImports: UnusedImport[];
  duplicateImports: string[];
  canOptimize: boolean;
}

export class ImportAnalyzer {
  private readonly extensions = ['.ts', '.tsx', '.js', '.jsx'];
  
  /**
   * Analyze all TypeScript/React files for unused imports
   */
  async analyzeDirectory(dirPath: string): Promise<ImportAnalysisResult[]> {
    const files = this.getAllFiles(dirPath);
    const results: ImportAnalysisResult[] = [];
    
    for (const file of files) {
      if (this.isAnalyzableFile(file)) {
        const result = await this.analyzeFile(file);
        if (result.unusedImports.length > 0 || result.duplicateImports.length > 0) {
          results.push(result);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Analyze a single file for unused imports
   */
  async analyzeFile(filePath: string): Promise<ImportAnalysisResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const imports = this.extractImports(lines);
    const unusedImports = this.findUnusedImports(content, imports);
    const duplicateImports = this.findDuplicateImports(imports);
    
    return {
      file: filePath,
      totalImports: imports.length,
      unusedImports,
      duplicateImports,
      canOptimize: unusedImports.length > 0 || duplicateImports.length > 0
    };
  }
  
  /**
   * Extract all import statements from file lines
   */
  private extractImports(lines: string[]): ImportStatement[] {
    const imports: ImportStatement[] = [];
    let currentImport = '';
    let startLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments and empty lines
      if (line.startsWith('//') || line.startsWith('/*') || !line) {
        continue;
      }
      
      // Start of import statement
      if (line.startsWith('import ') && !currentImport) {
        currentImport = line;
        startLine = i;
        
        // Single line import
        if (line.includes(';') || line.includes(' from ')) {
          imports.push(this.parseImportStatement(currentImport, startLine));
          currentImport = '';
          startLine = -1;
        }
      }
      // Continuation of multi-line import
      else if (currentImport && !line.startsWith('import ')) {
        currentImport += ' ' + line;
        
        // End of multi-line import
        if (line.includes(';') || line.includes(' from ')) {
          imports.push(this.parseImportStatement(currentImport, startLine));
          currentImport = '';
          startLine = -1;
        }
      }
    }
    
    return imports;
  }
  
  /**
   * Parse a single import statement
   */
  private parseImportStatement(statement: string, line: number): ImportStatement {
    const cleanStatement = statement.replace(/\s+/g, ' ').trim();
    
    // Extract module name
    const fromMatch = cleanStatement.match(/from\s+['"`]([^'"`]+)['"`]/);
    const module = fromMatch ? fromMatch[1] : '';
    
    // Check if it's type-only import
    const isTypeOnly = cleanStatement.includes('import type');
    
    // Extract imports
    let imports: string[] = [];
    let isDefault = false;
    let isNamespace = false;
    
    if (cleanStatement.includes('* as ')) {
      // Namespace import: import * as name from 'module'
      const namespaceMatch = cleanStatement.match(/import\s+\*\s+as\s+(\w+)/);
      if (namespaceMatch) {
        imports = [namespaceMatch[1]];
        isNamespace = true;
      }
    } else if (cleanStatement.includes('{')) {
      // Named imports: import { a, b } from 'module'
      const namedMatch = cleanStatement.match(/\{([^}]+)\}/);
      if (namedMatch) {
        imports = namedMatch[1]
          .split(',')
          .map(imp => imp.trim().split(' as ')[0].trim())
          .filter(imp => imp);
      }
      
      // Check for default import too: import default, { named } from 'module'
      const defaultMatch = cleanStatement.match(/import\s+(\w+)\s*,/);
      if (defaultMatch) {
        imports.unshift(defaultMatch[1]);
        isDefault = true;
      }
    } else {
      // Default import: import name from 'module'
      const defaultMatch = cleanStatement.match(/import\s+(\w+)\s+from/);
      if (defaultMatch) {
        imports = [defaultMatch[1]];
        isDefault = true;
      }
    }
    
    return {
      line,
      fullStatement: statement,
      module,
      imports,
      isDefault,
      isNamespace,
      isTypeOnly
    };
  }
  
  /**
   * Find unused imports in file content
   */
  private findUnusedImports(content: string, imports: ImportStatement[]): UnusedImport[] {
    const unusedImports: UnusedImport[] = [];
    
    for (const importStmt of imports) {
      for (const importName of importStmt.imports) {
        if (!this.isImportUsed(content, importName, importStmt)) {
          unusedImports.push({
            file: '',
            line: importStmt.line,
            importName,
            module: importStmt.module,
            fullStatement: importStmt.fullStatement
          });
        }
      }
    }
    
    return unusedImports;
  }
  
  /**
   * Check if an import is used in the file content
   */
  private isImportUsed(content: string, importName: string, importStmt: ImportStatement): boolean {
    // Remove the import statements from content to avoid false positives
    const contentWithoutImports = content.replace(/^import\s+.*$/gm, '');
    
    // Special cases for side-effect imports (no named imports)
    if (importStmt.imports.length === 0) {
      return true; // Keep side-effect imports
    }
    
    // Check for various usage patterns
    const usagePatterns = [
      new RegExp(`\\b${importName}\\b`, 'g'), // Direct usage
      new RegExp(`<${importName}\\b`, 'g'), // JSX component
      new RegExp(`${importName}\\.`, 'g'), // Property access
      new RegExp(`${importName}\\(`, 'g'), // Function call
      new RegExp(`typeof\\s+${importName}\\b`, 'g'), // typeof usage
      new RegExp(`\\b${importName}\\s*:`, 'g'), // Type annotation
      new RegExp(`extends\\s+${importName}\\b`, 'g'), // Interface extension
      new RegExp(`implements\\s+${importName}\\b`, 'g'), // Interface implementation
    ];
    
    return usagePatterns.some(pattern => pattern.test(contentWithoutImports));
  }
  
  /**
   * Find duplicate imports from the same module
   */
  private findDuplicateImports(imports: ImportStatement[]): string[] {
    const moduleMap = new Map<string, ImportStatement[]>();
    const duplicates: string[] = [];
    
    for (const importStmt of imports) {
      if (!moduleMap.has(importStmt.module)) {
        moduleMap.set(importStmt.module, []);
      }
      moduleMap.get(importStmt.module)!.push(importStmt);
    }
    
    for (const [module, statements] of moduleMap) {
      if (statements.length > 1) {
        duplicates.push(module);
      }
    }
    
    return duplicates;
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
  
  /**
   * Remove unused imports from a file
   */
  async removeUnusedImports(filePath: string): Promise<void> {
    const analysis = await this.analyzeFile(filePath);
    
    if (analysis.unusedImports.length === 0) {
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Process each unused import
    for (const unusedImport of analysis.unusedImports) {
      const lineIndex = unusedImport.line;
      const originalLine = lines[lineIndex];
      
      // Remove the specific import from the line
      const updatedLine = this.removeImportFromLine(originalLine, unusedImport.importName);
      
      if (updatedLine.trim() === '' || updatedLine.match(/^import\s*\{\s*\}\s*from/)) {
        // Remove entire line if empty or has empty braces
        lines[lineIndex] = '';
      } else {
        lines[lineIndex] = updatedLine;
      }
    }
    
    // Remove empty lines that were import statements
    const cleanedContent = lines.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, cleanedContent);
  }
  
  /**
   * Remove a specific import from an import line
   */
  private removeImportFromLine(line: string, importToRemove: string): string {
    // Handle different import patterns
    if (line.includes('{')) {
      // Named imports
      const braceMatch = line.match(/\{([^}]+)\}/);
      if (braceMatch) {
        const imports = braceMatch[1]
          .split(',')
          .map(imp => imp.trim())
          .filter(imp => !imp.startsWith(importToRemove) && imp !== importToRemove);
        
        if (imports.length === 0) {
          return '';
        }
        
        return line.replace(/\{[^}]+\}/, `{ ${imports.join(', ')} }`);
      }
    } else if (line.includes('* as ')) {
      // Namespace import
      if (line.includes(`* as ${importToRemove}`)) {
        return '';
      }
    } else {
      // Default import
      if (line.includes(`import ${importToRemove}`)) {
        return '';
      }
    }
    
    return line;
  }
}