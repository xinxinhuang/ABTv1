/**
 * Backup system for code cleanup operations
 * Creates backups before file removal and provides restore capabilities
 */

import fs from 'fs';
import path from 'path';
import { CleanupConfig } from './types';

export interface BackupManifest {
  timestamp: string;
  config: CleanupConfig;
  directories: string[];
  files: BackupFileInfo[];
  totalSize: number;
}

export interface BackupFileInfo {
  originalPath: string;
  backupPath: string;
  size: number;
  lastModified: string;
  checksum?: string;
}

export interface RestoreOptions {
  files?: string[]; // Specific files to restore, if not provided restores all
  dryRun?: boolean;
  overwriteExisting?: boolean;
}

export interface RestoreResult {
  success: boolean;
  restoredFiles: string[];
  errors: string[];
  warnings: string[];
}

export class BackupManager {
  private projectRoot: string;
  private backupRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.backupRoot = path.join(projectRoot, '.cleanup-backups');
  }

  /**
   * Create a backup of specified directories and files
   */
  async createBackup(config: CleanupConfig): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.backupRoot, `backup-${timestamp}`);
    
    // Create backup directory
    await fs.promises.mkdir(backupDir, { recursive: true });

    const manifest: BackupManifest = {
      timestamp: new Date().toISOString(),
      config,
      directories: config.targetDirectories,
      files: [],
      totalSize: 0,
    };

    // Backup target directories
    for (const targetDir of config.targetDirectories) {
      const sourcePath = path.join(this.projectRoot, targetDir);
      const backupPath = path.join(backupDir, targetDir);
      
      if (fs.existsSync(sourcePath)) {
        const backedUpFiles = await this.copyDirectoryWithManifest(
          sourcePath, 
          backupPath, 
          targetDir
        );
        manifest.files.push(...backedUpFiles);
        manifest.totalSize += backedUpFiles.reduce((sum, file) => sum + file.size, 0);
      }
    }

    // Save manifest
    await fs.promises.writeFile(
      path.join(backupDir, 'backup-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Create restore script
    await this.createRestoreScript(backupDir, manifest);

    console.log(`✅ Backup created: ${backupDir}`);
    console.log(`📁 Files backed up: ${manifest.files.length}`);
    console.log(`💾 Total size: ${this.formatBytes(manifest.totalSize)}`);

    return backupDir;
  }

  /**
   * Copy directory recursively and track files in manifest
   */
  private async copyDirectoryWithManifest(
    source: string, 
    destination: string, 
    relativePath: string
  ): Promise<BackupFileInfo[]> {
    const backedUpFiles: BackupFileInfo[] = [];
    
    await fs.promises.mkdir(destination, { recursive: true });
    
    const entries = await fs.promises.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.copyDirectoryWithManifest(
          sourcePath, 
          destPath, 
          relativeFilePath
        );
        backedUpFiles.push(...subFiles);
      } else {
        await fs.promises.copyFile(sourcePath, destPath);
        
        const stats = await fs.promises.stat(sourcePath);
        backedUpFiles.push({
          originalPath: relativeFilePath,
          backupPath: destPath,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
        });
      }
    }

    return backedUpFiles;
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupManifest[]> {
    if (!fs.existsSync(this.backupRoot)) {
      return [];
    }

    const backups: BackupManifest[] = [];
    const backupDirs = await fs.promises.readdir(this.backupRoot);
    
    for (const dir of backupDirs) {
      if (dir.startsWith('backup-')) {
        const manifestPath = path.join(this.backupRoot, dir, 'backup-manifest.json');
        
        if (fs.existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(
              await fs.promises.readFile(manifestPath, 'utf-8')
            );
            backups.push(manifest);
          } catch (error) {
            console.warn(`Failed to read backup manifest: ${manifestPath}`);
          }
        }
      }
    }

    return backups.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Restore files from a backup
   */
  async restoreFromBackup(
    backupPath: string, 
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const result: RestoreResult = {
      success: true,
      restoredFiles: [],
      errors: [],
      warnings: [],
    };

    try {
      // Read backup manifest
      const manifestPath = path.join(backupPath, 'backup-manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('Backup manifest not found');
      }

      const manifest: BackupManifest = JSON.parse(
        await fs.promises.readFile(manifestPath, 'utf-8')
      );

      // Determine which files to restore
      const filesToRestore = options.files 
        ? manifest.files.filter(file => options.files!.includes(file.originalPath))
        : manifest.files;

      // Restore files
      for (const fileInfo of filesToRestore) {
        try {
          const targetPath = path.join(this.projectRoot, fileInfo.originalPath);
          
          // Check if target file exists
          if (fs.existsSync(targetPath) && !options.overwriteExisting) {
            result.warnings.push(
              `File exists, skipping: ${fileInfo.originalPath} (use overwriteExisting option)`
            );
            continue;
          }

          if (options.dryRun) {
            result.restoredFiles.push(fileInfo.originalPath);
            continue;
          }

          // Create target directory if needed
          const targetDir = path.dirname(targetPath);
          await fs.promises.mkdir(targetDir, { recursive: true });

          // Copy file from backup
          await fs.promises.copyFile(fileInfo.backupPath, targetPath);
          result.restoredFiles.push(fileInfo.originalPath);

        } catch (error) {
          result.errors.push(
            `Failed to restore ${fileInfo.originalPath}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          result.success = false;
        }
      }

    } catch (error) {
      result.errors.push(
        `Restore operation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      result.success = false;
    }

    return result;
  }

  /**
   * Create a restore script for easy recovery
   */
  private async createRestoreScript(backupDir: string, manifest: BackupManifest): Promise<void> {
    const scriptContent = `#!/bin/bash
# Restore script for backup created on ${manifest.timestamp}
# This script will restore all backed up files to their original locations

BACKUP_DIR="${backupDir}"
PROJECT_ROOT="${this.projectRoot}"

echo "🔄 Restoring files from backup..."
echo "📁 Backup: $BACKUP_DIR"
echo "🎯 Target: $PROJECT_ROOT"
echo ""

# Restore each directory
${manifest.directories.map(dir => `
echo "Restoring ${dir}..."
if [ -d "$BACKUP_DIR/${dir}" ]; then
  cp -r "$BACKUP_DIR/${dir}" "$PROJECT_ROOT/"
  echo "✅ Restored ${dir}"
else
  echo "⚠️  Directory not found in backup: ${dir}"
fi`).join('')}

echo ""
echo "✅ Restore complete!"
echo "📊 Total files restored: ${manifest.files.length}"
`;

    const scriptPath = path.join(backupDir, 'restore.sh');
    await fs.promises.writeFile(scriptPath, scriptContent);
    
    // Make script executable (Unix systems)
    try {
      await fs.promises.chmod(scriptPath, 0o755);
    } catch (error) {
      // Ignore chmod errors on Windows
    }
  }

  /**
   * Clean up old backups (keep only the most recent N backups)
   */
  async cleanupOldBackups(keepCount: number = 5): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length <= keepCount) {
      return;
    }

    const backupsToDelete = backups.slice(keepCount);
    
    for (const backup of backupsToDelete) {
      const backupDir = path.join(
        this.backupRoot, 
        `backup-${backup.timestamp.replace(/[:.]/g, '-')}`
      );
      
      if (fs.existsSync(backupDir)) {
        await this.removeDirectory(backupDir);
        console.log(`🗑️  Removed old backup: ${backup.timestamp}`);
      }
    }
  }

  /**
   * Remove directory recursively
   */
  private async removeDirectory(dirPath: string): Promise<void> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await this.removeDirectory(fullPath);
      } else {
        await fs.promises.unlink(fullPath);
      }
    }
    
    await fs.promises.rmdir(dirPath);
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}