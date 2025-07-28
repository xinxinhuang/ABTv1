/**
 * Tests for rollback system
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RollbackManager, RollbackTrigger } from '../rollback';
import { CleanupConfig } from '../types';

// Mock dependencies
jest.mock('../backup');
jest.mock('../postCleanupVerification');
jest.mock('fs');

const mockBackupManager = {
  listBackups: jest.fn(),
  restoreFromBackup: jest.fn(),
};

const mockVerifier = {
  verify: jest.fn(),
};

const mockFs = {
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    copyFile: jest.fn(),
    unlink: jest.fn(),
    rmdir: jest.fn(),
  },
};

jest.mock('fs', () => mockFs);

// Mock the classes
jest.mock('../backup', () => ({
  BackupManager: jest.fn(() => mockBackupManager),
}));

jest.mock('../postCleanupVerification', () => ({
  PostCleanupVerifier: jest.fn(() => mockVerifier),
}));

describe('RollbackManager', () => {
  let rollbackManager: RollbackManager;
  let mockConfig: CleanupConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      targetDirectories: ['src/hooks/battle', 'src/components/game/battle'],
      testBeforeRemoval: true,
      createBackup: true,
      dryRun: false,
      excludePatterns: [],
      preserveFiles: [],
      typeConsolidationRules: {
        preferV2Types: true,
        consolidateInterfaces: true,
        removeDeprecatedTypes: true,
      },
      importOptimization: {
        removeUnused: true,
        organizeImports: true,
        optimizePaths: true,
      },
    };

    rollbackManager = new RollbackManager(mockConfig, '/mock/project');
  });

  describe('checkRollbackNeeded', () => {
    it('should return null when system is healthy', async () => {
      mockVerifier.verify.mockResolvedValue({
        isValid: true,
        errors: [],
        buildResult: { success: true },
        testResult: { success: true },
      });

      const result = await rollbackManager.checkRollbackNeeded();

      expect(result).toBeNull();
    });

    it('should return build-failure trigger when build fails', async () => {
      mockVerifier.verify.mockResolvedValue({
        isValid: false,
        errors: ['Build failed'],
        buildResult: { 
          success: false,
          errors: ['Build error occurred'],
        },
        testResult: { success: true },
      });

      const result = await rollbackManager.checkRollbackNeeded();

      expect(result).toEqual({
        type: 'build-failure',
        reason: 'Build process failed after cleanup',
        buildErrors: ['Build error occurred'],
      });
    });

    it('should return test-failure trigger when tests fail', async () => {
      mockVerifier.verify.mockResolvedValue({
        isValid: false,
        errors: ['Tests failed'],
        buildResult: { success: true },
        testResult: { 
          success: false,
          failedTestDetails: [
            { name: 'test1', error: 'error1', file: 'file1' },
            { name: 'test2', error: 'error2', file: 'file2' },
          ],
        },
      });

      const result = await rollbackManager.checkRollbackNeeded();

      expect(result).toEqual({
        type: 'test-failure',
        reason: 'Tests failed after cleanup',
        failedTests: ['test1', 'test2'],
      });
    });

    it('should return verification-failure trigger for general failures', async () => {
      mockVerifier.verify.mockResolvedValue({
        isValid: false,
        errors: ['General verification error'],
        buildResult: { success: true },
        testResult: { success: true },
      });

      const result = await rollbackManager.checkRollbackNeeded();

      expect(result).toEqual({
        type: 'verification-failure',
        reason: 'System verification failed after cleanup',
        verificationErrors: ['General verification error'],
      });
    });
  });

  describe('rollback', () => {
    const mockTrigger: RollbackTrigger = {
      type: 'manual',
      reason: 'Manual rollback requested',
    };

    it('should successfully rollback when backup is available', async () => {
      // Mock backup availability
      mockBackupManager.listBackups.mockResolvedValue([
        { timestamp: '2024-01-01T10:00:00.000Z' },
      ]);
      
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock successful restore
      mockBackupManager.restoreFromBackup.mockResolvedValue({
        success: true,
        restoredFiles: ['src/file1.ts', 'src/file2.ts'],
        errors: [],
        warnings: [],
      });

      const result = await rollbackManager.rollback(mockTrigger);

      expect(result.success).toBe(true);
      expect(result.rolledBackFiles).toEqual(['src/file1.ts', 'src/file2.ts']);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when no backup is available', async () => {
      // Mock no backups available
      mockBackupManager.listBackups.mockResolvedValue([]);

      const result = await rollbackManager.rollback(mockTrigger);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Rollback failed: No suitable backup found for rollback');
    });

    it('should fail when restore operation fails', async () => {
      // Mock backup availability
      mockBackupManager.listBackups.mockResolvedValue([
        { timestamp: '2024-01-01T10:00:00.000Z' },
      ]);
      
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock failed restore
      mockBackupManager.restoreFromBackup.mockResolvedValue({
        success: false,
        restoredFiles: [],
        errors: ['Restore failed'],
        warnings: [],
      });

      const result = await rollbackManager.rollback(mockTrigger);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Rollback failed: Failed to restore files from backup');
    });

    it('should preserve specified files during rollback', async () => {
      // Mock backup availability
      mockBackupManager.listBackups.mockResolvedValue([
        { timestamp: '2024-01-01T10:00:00.000Z' },
      ]);
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.mkdir.mockResolvedValue(undefined);
      mockFs.promises.copyFile.mockResolvedValue(undefined);
      mockFs.promises.readdir.mockResolvedValue([]);
      mockFs.promises.rmdir.mockResolvedValue(undefined);
      
      // Mock successful restore
      mockBackupManager.restoreFromBackup.mockResolvedValue({
        success: true,
        restoredFiles: ['src/file1.ts'],
        errors: [],
        warnings: [],
      });

      const result = await rollbackManager.rollback(mockTrigger, {
        preserveChanges: ['src/new-feature.ts'],
      });

      expect(result.success).toBe(true);
      expect(result.preservedFiles).toEqual(['src/new-feature.ts']);
    });

    it('should run verification after rollback when requested', async () => {
      // Mock backup availability
      mockBackupManager.listBackups.mockResolvedValue([
        { timestamp: '2024-01-01T10:00:00.000Z' },
      ]);
      
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock successful restore
      mockBackupManager.restoreFromBackup.mockResolvedValue({
        success: true,
        restoredFiles: ['src/file1.ts'],
        errors: [],
        warnings: [],
      });

      // Mock verification result
      mockVerifier.verify.mockResolvedValue({
        isValid: true,
        errors: [],
      });

      const result = await rollbackManager.rollback(mockTrigger, {
        testAfterRollback: true,
      });

      expect(result.success).toBe(true);
      expect(result.verificationResult).toBeDefined();
      expect(result.verificationResult?.isValid).toBe(true);
      expect(mockVerifier.verify).toHaveBeenCalled();
    });
  });

  describe('createRollbackPlan', () => {
    it('should create a rollback plan with backup information', async () => {
      // Mock backup availability
      mockBackupManager.listBackups.mockResolvedValue([
        { timestamp: '2024-01-01T10:00:00.000Z' },
      ]);
      
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock backup manifest
      const mockManifest = {
        timestamp: '2024-01-01T10:00:00.000Z',
        files: [
          { originalPath: 'src/file1.ts', size: 1024 },
          { originalPath: 'src/file2.ts', size: 2048 },
        ],
        totalSize: 3072,
      };
      
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockManifest));
      mockFs.promises.readdir.mockResolvedValue([]);

      const plan = await rollbackManager.createRollbackPlan();

      expect(plan.filesToRestore).toEqual(['src/file1.ts', 'src/file2.ts']);
      expect(plan.estimatedTime).toBe(20); // 2 files * 10ms each
      expect(plan.backupToUse).toContain('backup-2024-01-01T10-00-00-000Z');
    });

    it('should identify risks for large backups', async () => {
      // Mock backup availability
      mockBackupManager.listBackups.mockResolvedValue([
        { timestamp: '2024-01-01T10:00:00.000Z' },
      ]);
      
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock large backup manifest
      const mockManifest = {
        timestamp: '2024-01-01T10:00:00.000Z',
        files: Array.from({ length: 150 }, (_, i) => ({
          originalPath: `src/file${i}.ts`,
          size: 1024,
        })),
        totalSize: 15 * 1024 * 1024, // 15MB
      };
      
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockManifest));
      mockFs.promises.readdir.mockResolvedValue([]);

      const plan = await rollbackManager.createRollbackPlan();

      expect(plan.risks).toContain('Large number of files to restore - operation may take significant time');
      expect(plan.risks).toContain('Large backup size - ensure sufficient disk space');
    });
  });

  describe('generateRollbackReport', () => {
    it('should generate a markdown rollback report', async () => {
      mockFs.promises.writeFile.mockResolvedValue(undefined);

      const mockResult = {
        success: true,
        rolledBackFiles: ['src/file1.ts', 'src/file2.ts'],
        preservedFiles: ['src/new-feature.ts'],
        errors: [],
        warnings: ['Warning message'],
        rollbackTime: 5000,
      };

      const mockTrigger: RollbackTrigger = {
        type: 'test-failure',
        reason: 'Tests failed after cleanup',
        failedTests: ['test1', 'test2'],
      };

      await rollbackManager.generateRollbackReport(mockResult, mockTrigger);

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('rollback-report.md'),
        expect.stringContaining('# Rollback Report')
      );

      const reportContent = (mockFs.promises.writeFile as jest.Mock).mock.calls[0][1];
      expect(reportContent).toContain('test-failure');
      expect(reportContent).toContain('Tests failed after cleanup');
      expect(reportContent).toContain('src/file1.ts');
      expect(reportContent).toContain('src/new-feature.ts');
    });
  });
});