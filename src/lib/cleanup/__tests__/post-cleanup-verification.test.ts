/**
 * Tests for post-cleanup verification system
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PostCleanupVerifier } from '../postCleanupVerification';
import { CleanupConfig } from '../types';

// Mock child_process
const mockExecSync = jest.fn();
jest.mock('child_process', () => ({
  execSync: mockExecSync,
}));

// Mock fs
const mockExistsSync = jest.fn();
const mockReaddir = jest.fn();
const mockStat = jest.fn();
const mockWriteFile = jest.fn();

jest.mock('fs', () => ({
  existsSync: mockExistsSync,
  promises: {
    readdir: mockReaddir,
    stat: mockStat,
    writeFile: mockWriteFile,
  },
}));

describe('PostCleanupVerifier', () => {
  let verifier: PostCleanupVerifier;
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

    verifier = new PostCleanupVerifier(mockConfig, '/mock/project');
  });

  describe('verify', () => {
    it('should return valid result when all checks pass', async () => {
      // Mock successful TypeScript compilation
      mockExecSync.mockReturnValueOnce('No errors found');
      
      // Mock successful build
      mockExecSync.mockReturnValueOnce('Build completed successfully');
      
      // Mock successful tests
      mockExecSync.mockReturnValueOnce('Tests: 0 failed, 10 passed, 10 total');
      
      // Mock file system checks - all battle-v2 files exist
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue([]);
      mockStat.mockResolvedValue({ size: 1024 } as any);

      const result = await verifier.verify();

      expect(result.typeCheckResult.success).toBe(true);
      expect(result.buildResult.success).toBe(true);
      expect(result.testResult.success).toBe(true);
      expect(result.functionalityResult.battleSystemWorking).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid result when TypeScript compilation fails', async () => {
      // Mock failed TypeScript compilation
      const tsError = new Error('TypeScript compilation failed');
      (tsError as any).stdout = 'error TS2304: Cannot find name';
      mockExecSync.mockImplementationOnce(() => {
        throw tsError;
      });
      
      // Mock successful build
      mockExecSync.mockImplementationOnce(() => 'Build completed successfully');
      
      // Mock successful tests
      mockExecSync.mockImplementationOnce(() => 'Tests: 0 failed, 10 passed, 10 total');
      
      // Mock file system checks
      mockExistsSync.mockReturnValue(true);

      const result = await verifier.verify();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('TypeScript compilation failed');
      expect(result.typeCheckResult.success).toBe(false);
      expect(result.typeCheckResult.errors.length).toBeGreaterThan(0);
    });

    it('should return invalid result when build fails', async () => {
      // Mock successful TypeScript compilation
      mockExecSync.mockImplementationOnce(() => 'No errors found');
      
      // Mock failed build
      const buildError = new Error('Build failed');
      (buildError as any).stdout = 'Build error occurred';
      mockExecSync.mockImplementationOnce(() => {
        throw buildError;
      });
      
      // Mock successful tests
      mockExecSync.mockImplementationOnce(() => 'Tests: 0 failed, 10 passed, 10 total');
      
      // Mock file system checks
      mockExistsSync.mockReturnValue(true);

      const result = await verifier.verify();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Build process failed');
      expect(result.buildResult.success).toBe(false);
    });

    it('should return invalid result when tests fail', async () => {
      // Mock successful TypeScript compilation
      mockExecSync.mockImplementationOnce(() => 'No errors found');
      
      // Mock successful build
      mockExecSync.mockImplementationOnce(() => 'Build completed successfully');
      
      // Mock failed tests
      const testError = new Error('Tests failed');
      (testError as any).stdout = 'Tests: 2 failed, 8 passed, 10 total';
      mockExecSync.mockImplementationOnce(() => {
        throw testError;
      });
      
      // Mock file system checks
      mockExistsSync.mockReturnValue(true);

      const result = await verifier.verify();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('2 tests failed');
      expect(result.testResult.success).toBe(false);
      expect(result.testResult.failedTests).toBe(2);
      expect(result.testResult.passedTests).toBe(8);
      expect(result.testResult.totalTests).toBe(10);
    });

    it('should return invalid result when battle system files are missing', async () => {
      // Mock successful TypeScript compilation
      mockExecSync.mockImplementationOnce(() => 'No errors found');
      
      // Mock successful build
      mockExecSync.mockImplementationOnce(() => 'Build completed successfully');
      
      // Mock successful tests
      mockExecSync.mockImplementationOnce(() => 'Tests: 0 failed, 10 passed, 10 total');
      
      // Mock missing battle system files
      mockExistsSync.mockReturnValue(false);

      const result = await verifier.verify();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Battle system functionality verification failed');
      expect(result.functionalityResult.battleSystemWorking).toBe(false);
      expect(result.functionalityResult.hooksWorking).toBe(false);
      expect(result.functionalityResult.componentsRendering).toBe(false);
      expect(result.functionalityResult.routingWorking).toBe(false);
    });
  });

  describe('generateReport', () => {
    it('should generate a markdown report', async () => {
      mockWriteFile.mockResolvedValue(undefined);
      
      const mockResult = {
        isValid: true,
        errors: [],
        warnings: [],
        buildResult: {
          success: true,
          buildTime: 5000,
          errors: [],
          warnings: [],
          bundleSize: 1024000,
        },
        testResult: {
          success: true,
          totalTests: 10,
          passedTests: 10,
          failedTests: 0,
          testDuration: 3000,
          failedTestDetails: [],
        },
        typeCheckResult: {
          success: true,
          errors: [],
          warnings: [],
          checkDuration: 2000,
        },
        functionalityResult: {
          battleSystemWorking: true,
          routingWorking: true,
          componentsRendering: true,
          hooksWorking: true,
          errors: [],
        },
        performanceMetrics: {
          buildTime: 5000,
          testTime: 3000,
          typeCheckTime: 2000,
          bundleSize: 1024000,
          memoryUsage: 50000000,
        },
      };

      await verifier.generateReport(mockResult);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('post-cleanup-verification-report.md'),
        expect.stringContaining('# Post-Cleanup Verification Report')
      );
    });
  });

  describe('parseTestOutput', () => {
    it('should correctly parse Jest test output', () => {
      const testOutput = `
        PASS src/components/test1.test.ts
        FAIL src/components/test2.test.ts
        Tests: 2 failed, 8 passed, 10 total
        Snapshots: 0 total
        Time: 5.123 s
      `;

      // Access private method for testing
      const parseTestOutput = (verifier as any).parseTestOutput.bind(verifier);
      const result = parseTestOutput(testOutput);

      expect(result.totalTests).toBe(10);
      expect(result.passedTests).toBe(8);
      expect(result.failedTests).toBe(2);
      expect(result.failedTestDetails).toHaveLength(1); // One FAIL line
    });
  });

  describe('parseTypeScriptErrors', () => {
    it('should correctly parse TypeScript error output', () => {
      const tsOutput = `
        src/components/Component.tsx(10,5): error TS2304: Cannot find name 'unknownVariable'.
        src/hooks/useHook.ts(20,10): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
        Found 2 errors.
      `;

      // Access private method for testing
      const parseTypeScriptErrors = (verifier as any).parseTypeScriptErrors.bind(verifier);
      const errors = parseTypeScriptErrors(tsOutput);

      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('error TS2304');
      expect(errors[1]).toContain('error TS2345');
    });
  });

  describe('formatBytes', () => {
    it('should correctly format byte sizes', () => {
      // Access private method for testing
      const formatBytes = (verifier as any).formatBytes.bind(verifier);

      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });
});