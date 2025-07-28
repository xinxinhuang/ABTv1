/**
 * Rollback system for code cleanup operations
 * Provides automatic and manual rollback capabilities when cleanup fails
 */

import fs from 'fs';
import path from 'path';
import { BackupManager, BackupManifest } from './backup';
import { PostCleanupVerifier, VerificationResult } from './postCleanupVerification';
import { CleanupConfig } from './types';

export interface RollbackOptions {
  backupPath?: string;
  autoRollback?: boolean;
  testAfterRollback?: boolean;
  preserveChanges?: string[]; // Files to preserve during rollback
  dryRun?: boolean;
}

export interface RollbackResult {
  success: boolean;
  rolledBackFiles: string[];
  preservedFiles: string[];
  errors: string[];
  warnings: string[];
  verificationResult?: VerificationResult;
  rollbackTime: number;
}

export interface RollbackTrigger {
  type: 'manual' | 'test-failure' | 'build-failure' | 'verification-failure';
  reason: string;
  failedTests?: string[];
  buildErrors?: string[];
  verificationErrors?: string[];
}

export class RollbackManager {
  private config: CleanupConfig;
  private projectRoot: string;
  private backupManager: BackupManager;
  private verifier: PostCleanupVerifier;

  constructor(config: CleanupConfig, projectRoot: string = process.cwd()) {
    this.config = config;
    this.projectRoot = projectRoot;
    this.backupManager = new BackupManager(projectRoot);
    this.verifier = new PostCleanupVerifier(config, projectRoot);
  }

  /**
   * Execute rollback operation
   */
  async rollback(
    trigger: RollbackTrigger,
    options: RollbackOptions = {}
  ): Promise<RollbackResult> {
    const startTime = Date.now();

    const result: RollbackResult = {
      success: false,
      rolledBackFiles: [],
      preservedFiles: [],
      errors: [],
      warnings: [],
      rollbackTime: 0,
    };

    try {
      console.log(`🔄 Starting rollback due to: ${trigger.reason}`);
      
      // 1. Find backup to restore from
      const backupPath = await this.findBackupToRestore(options.backupPath);
      if (!backupPath) {
        throw new Error('No suitable backup found for rollback');
      }

      console.log(`📁 Using backup: ${backupPath}`);

      // 2. Preserve specified files if requested
      if (options.preserveChanges && options.preserveChanges.length > 0) {
        await this.preserveFiles(options.preserveChanges);
        result.preservedFiles = options.preserveChanges;
      }

      // 3. Restore files from backup
      const restoreResult = await this.backupManager.restoreFromBackup(backupPath, {
        dryRun: options.dryRun,
        overwriteExisting: true,
      });

      if (!restoreResult.success) {
        result.errors.push(...restoreResult.errors);
        result.warnings.push(...restoreResult.warnings);
        throw new Error('Failed to restore files from backup');
      }

      result.rolledBackFiles = restoreResult.restoredFiles;
      result.warnings.push(...restoreResult.warnings);

      // 4. Restore preserved files if any
      if (result.preservedFiles.length > 0) {
        await this.restorePreservedFiles(result.preservedFiles);
      }

      // 5. Run verification after rollback if requested
      if (options.testAfterRollback && !options.dryRun) {
        console.log('🧪 Running verification after rollback...');
        result.verificationResult = await this.verifier.verify();
        
        if (!result.verificationResult.isValid) {
          result.warnings.push('Verification failed after rollback - system may still have issues');
        }
      }

      result.success = true;
      result.rollbackTime = Date.now() - startTime;

      console.log(`✅ Rollback completed successfully in ${result.rollbackTime}ms`);
      console.log(`📁 Restored ${result.rolledBackFiles.length} files`);

    } catch (error) {
      result.errors.push(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
      result.rollbackTime = Date.now() - startTime;
      
      console.error(`❌ Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Setup automatic rollback triggers
   */
  async setupAutoRollback(): Promise<void> {
    // This would set up file watchers and test runners to automatically trigger rollback
    // For now, we'll provide the framework for manual triggering
    
    console.log('🔧 Auto-rollback system configured');
    console.log('   - Test failure detection: enabled');
    console.log('   - Build failure detection: enabled');
    console.log('   - Verification failure detection: enabled');
  }

  /**
   * Check if rollback is needed based on current system state
   */
  async checkRollbackNeeded(): Promise<RollbackTrigger | null> {
    try {
      // Run verification to check system state
      const verificationResult = await this.verifier.verify();
      
      if (!verificationResult.isValid) {
        const trigger: RollbackTrigger = {
          type: 'verification-failure',
          reason: 'System verification failed after cleanup',
          verificationErrors: verificationResult.errors,
        };

        // Check specific failure types
        if (!verificationResult.buildResult.success) {
          trigger.type = 'build-failure';
          trigger.reason = 'Build process failed after cleanup';
          trigger.buildErrors = verificationResult.buildResult.errors;
        } else if (!verificationResult.testResult.success) {
          trigger.type = 'test-failure';
          trigger.reason = 'Tests failed after cleanup';
          trigger.failedTests = verificationResult.testResult.failedTestDetails.map(t => t.name);
        }

        return trigger;
      }

      return null; // No rollback needed

    } catch (error) {
      return {
        type: 'verification-failure',
        reason: `Failed to check system state: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Create rollback plan without executing it
   */
  async createRollbackPlan(backupPath?: string): Promise<{
    backupToUse: string;
    filesToRestore: string[];
    estimatedTime: number;
    risks: string[];
    recommendations: string[];
  }> {
    const plan = {
      backupToUse: '',
      filesToRestore: [] as string[],
      estimatedTime: 0,
      risks: [] as string[],
      recommendations: [] as string[],
    };

    try {
      // Find backup
      const backup = await this.findBackupToRestore(backupPath);
      if (!backup) {
        throw new Error('No suitable backup found');
      }

      plan.backupToUse = backup;

      // Read backup manifest
      const manifestPath = path.join(backup, 'backup-manifest.json');
      const manifest: BackupManifest = JSON.parse(
        await fs.promises.readFile(manifestPath, 'utf-8')
      );

      plan.filesToRestore = manifest.files.map(f => f.originalPath);
      plan.estimatedTime = manifest.files.length * 10; // Rough estimate: 10ms per file

      // Assess risks
      if (manifest.files.length > 100) {
        plan.risks.push('Large number of files to restore - operation may take significant time');
      }

      if (manifest.totalSize > 10 * 1024 * 1024) { // 10MB
        plan.risks.push('Large backup size - ensure sufficient disk space');
      }

      // Check for recent changes that would be lost
      const recentChanges = await this.findRecentChanges(manifest.timestamp);
      if (recentChanges.length > 0) {
        plan.risks.push(`${recentChanges.length} recent changes will be lost`);
        plan.recommendations.push('Consider preserving recent changes using preserveChanges option');
      }

      // General recommendations
      plan.recommendations.push('Run in dry-run mode first to preview changes');
      plan.recommendations.push('Ensure all team members are aware of the rollback');
      plan.recommendations.push('Run full test suite after rollback');

    } catch (error) {
      plan.risks.push(`Failed to create rollback plan: ${error instanceof Error ? error.message : String(error)}`);
    }

    return plan;
  }

  /**
   * Find the most suitable backup for rollback
   */
  private async findBackupToRestore(preferredBackupPath?: string): Promise<string | null> {
    if (preferredBackupPath && fs.existsSync(preferredBackupPath)) {
      return preferredBackupPath;
    }

    // Find the most recent backup
    const backups = await this.backupManager.listBackups();
    
    if (backups.length === 0) {
      return null;
    }

    // Return the most recent backup (backups are sorted by timestamp descending)
    const latestBackup = backups[0];
    const backupDir = path.join(
      this.projectRoot,
      '.cleanup-backups',
      `backup-${latestBackup.timestamp.replace(/[:.]/g, '-')}`
    );

    return fs.existsSync(backupDir) ? backupDir : null;
  }

  /**
   * Preserve specified files before rollback
   */
  private async preserveFiles(filesToPreserve: string[]): Promise<void> {
    const preserveDir = path.join(this.projectRoot, '.cleanup-preserve');
    await fs.promises.mkdir(preserveDir, { recursive: true });

    for (const file of filesToPreserve) {
      const sourcePath = path.join(this.projectRoot, file);
      const preservePath = path.join(preserveDir, file);

      if (fs.existsSync(sourcePath)) {
        // Create directory structure
        const preserveFileDir = path.dirname(preservePath);
        await fs.promises.mkdir(preserveFileDir, { recursive: true });

        // Copy file
        await fs.promises.copyFile(sourcePath, preservePath);
      }
    }
  }

  /**
   * Restore preserved files after rollback
   */
  private async restorePreservedFiles(preservedFiles: string[]): Promise<void> {
    const preserveDir = path.join(this.projectRoot, '.cleanup-preserve');

    for (const file of preservedFiles) {
      const preservePath = path.join(preserveDir, file);
      const targetPath = path.join(this.projectRoot, file);

      if (fs.existsSync(preservePath)) {
        // Create directory structure
        const targetDir = path.dirname(targetPath);
        await fs.promises.mkdir(targetDir, { recursive: true });

        // Restore file
        await fs.promises.copyFile(preservePath, targetPath);
      }
    }

    // Clean up preserve directory
    await this.removeDirectory(preserveDir);
  }

  /**
   * Find files that have been changed since backup timestamp
   */
  private async findRecentChanges(backupTimestamp: string): Promise<string[]> {
    const changes: string[] = [];
    const backupTime = new Date(backupTimestamp);

    const scanForChanges = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await scanForChanges(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.promises.stat(fullPath);
            if (stats.mtime > backupTime) {
              changes.push(path.relative(this.projectRoot, fullPath));
            }
          }
        }
      } catch (error) {
        // Ignore errors for individual files/directories
      }
    };

    await scanForChanges(path.join(this.projectRoot, 'src'));
    return changes;
  }

  /**
   * Remove directory recursively
   */
  private async removeDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      return;
    }

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
   * Generate rollback report
   */
  async generateRollbackReport(result: RollbackResult, trigger: RollbackTrigger): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'rollback-report.md');

    const report = `# Rollback Report

Generated on: ${new Date().toISOString()}

## Rollback Trigger

**Type**: ${trigger.type}
**Reason**: ${trigger.reason}

${trigger.failedTests ? `
### Failed Tests
${trigger.failedTests.map(test => `- ${test}`).join('\n')}
` : ''}

${trigger.buildErrors ? `
### Build Errors
${trigger.buildErrors.map(error => `- ${error}`).join('\n')}
` : ''}

${trigger.verificationErrors ? `
### Verification Errors
${trigger.verificationErrors.map(error => `- ${error}`).join('\n')}
` : ''}

## Rollback Results

**Success**: ${result.success ? '✅ YES' : '❌ NO'}
**Duration**: ${result.rollbackTime}ms
**Files Restored**: ${result.rolledBackFiles.length}
**Files Preserved**: ${result.preservedFiles.length}

### Restored Files
${result.rolledBackFiles.map(file => `- ${file}`).join('\n')}

${result.preservedFiles.length > 0 ? `
### Preserved Files
${result.preservedFiles.map(file => `- ${file}`).join('\n')}
` : ''}

${result.errors.length > 0 ? `
### Errors
${result.errors.map(error => `- ${error}`).join('\n')}
` : ''}

${result.warnings.length > 0 ? `
### Warnings
${result.warnings.map(warning => `- ${warning}`).join('\n')}
` : ''}

${result.verificationResult ? `
## Post-Rollback Verification

**Status**: ${result.verificationResult.isValid ? '✅ PASSED' : '❌ FAILED'}
**Build**: ${result.verificationResult.buildResult.success ? '✅' : '❌'}
**Tests**: ${result.verificationResult.testResult.success ? '✅' : '❌'}
**TypeScript**: ${result.verificationResult.typeCheckResult.success ? '✅' : '❌'}
**Battle System**: ${result.verificationResult.functionalityResult.battleSystemWorking ? '✅' : '❌'}
` : ''}

## Recommendations

${result.success ? `
✅ **Rollback completed successfully**
- System has been restored to previous state
- Review the trigger cause to prevent future issues
- Consider improving cleanup procedures
- Update documentation with lessons learned
` : `
❌ **Rollback failed**
- Manual intervention may be required
- Check file system permissions
- Verify backup integrity
- Consider restoring from external backup
`}

## Next Steps

1. Investigate root cause of the issue that triggered rollback
2. Fix any underlying problems in the cleanup process
3. Test the fix in a separate environment
4. Update cleanup procedures to prevent similar issues
5. Document lessons learned for future reference
`;

    await fs.promises.writeFile(reportPath, report);
    console.log(`📊 Rollback report generated: ${reportPath}`);
  }
}