import * as fs from 'fs';
import * as path from 'path';

import { UsagePattern } from './types';

/**
 * Scans files for usage patterns to identify file references
 */
export class UsageScanner {
  private readonly USAGE_PATTERNS: UsagePattern[] = [
    { pattern: /import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/, type: 'import', confidence: 1.0 },
    { pattern: /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/, type: 'dynamic_import', confidence: 1.0 },
    { pattern: /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/, type: 'require', confidence: 1.0 },
    { pattern: /href\s*=\s*['"`]([^'"`]+)['"`]/, type: 'route_reference', confidence: 0.8 },
    { pattern: /router\.push\s*\(\s*['"`]([^'"`]+)['"`]/, type: 'route_reference', confidence: 0.9 }
  ];

  /**
   * Scans a file for usage patterns
   */
  async scanFile(filePath: string): Promise<string[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const references: string[] = [];

      for (const pattern of this.USAGE_PATTERNS) {
        const matches = content.matchAll(new RegExp(pattern.pattern, 'g'));
        for (const match of matches) {
          if (match[1]) {
            references.push(match[1]);
          }
        }
      }

      return [...new Set(references)]; // Remove duplicates
    } catch (error) {
      console.warn(`Failed to scan file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Recursively scans directory for file references
   */
  async scanDirectory(dirPath: string, excludePatterns: string[] = []): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>();

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (this.shouldExclude(fullPath, excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          const subResults = await this.scanDirectory(fullPath, excludePatterns);
          for (const [file, refs] of subResults) {
            results.set(file, refs);
          }
        } else if (this.isScannableFile(entry.name)) {
          const references = await this.scanFile(fullPath);
          results.set(fullPath, references);
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error);
    }

    return results;
  }  /**
   
* Checks if file should be excluded from scanning
   */
  private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });
  }

  /**
   * Checks if file type should be scanned
   */
  private isScannableFile(fileName: string): boolean {
    const scannableExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    return scannableExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Finds all files that reference a specific file
   */
  async findReferencesToFile(targetFile: string, searchDir: string, excludePatterns: string[] = []): Promise<string[]> {
    const allReferences = await this.scanDirectory(searchDir, excludePatterns);
    const referencingFiles: string[] = [];

    for (const [file, references] of allReferences) {
      for (const ref of references) {
        if (this.isReferenceToFile(ref, targetFile)) {
          referencingFiles.push(file);
          break;
        }
      }
    }

    return referencingFiles;
  }

  /**
   * Checks if a reference string points to the target file
   */
  private isReferenceToFile(reference: string, targetFile: string): boolean {
    // Handle relative imports
    if (reference.startsWith('./') || reference.startsWith('../')) {
      return reference.includes(path.basename(targetFile, path.extname(targetFile)));
    }

    // Handle absolute imports
    return reference.includes(targetFile) || reference.endsWith(path.basename(targetFile, path.extname(targetFile)));
  }
}