/**
 * Post-cleanup verification utilities
 * Ensures the application still works correctly after cleanup operations
 */

import fs from 'fs';
import path from 'path';
import { CleanupConfig } from './types';

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  buildResult: BuildVerificationResult;
  testResult: TestVerificationResult;
  typeCheckResult: TypeCheckResult;
  functionalityResult: FunctionalityVerificationResult;
  performanceMetrics: PerformanceMetrics;
}

export interface BuildVerificationResult {
  success: boolean;
  buildTime: number;
  errors: string[];
  warnings: string[];
  bundleSize?: number;
}

export interface TestVerificationResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testDuration: number;
  failedTestDetails: FailedTest[];
}

export interface FailedTest {
  name: string;
  error: string;
  file: string;
}

export interface TypeCheckResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  checkDuration: number;
}

export interface FunctionalityVerificationResult {
  battleSystemWorking: boolean;
  routingWorking: boolean;
  componentsRendering: boolean;
  hooksWorking: boolean;
  errors: string[];
}

export interface PerformanceMetrics {
  buildTime: number;
  testTime: number;
  typeCheckTime: number;
  bundleSize: number;
  memoryUsage: number;
}

export class PostCleanupVerifier {
  private config: CleanupConfig;
  private projectRoot: string;

  constructor(config: CleanupConfig, projectRoot: string = process.cwd()) {
    this.config = config;
    this.projectRoot = projectRoot;
  }

  /**
   * Run comprehensive post-cleanup verification
   */
  async verify(): Promise<VerificationResult> {
    const startTime = Date.now();

    const result: VerificationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      buildResult: {
        success: false,
        buildTime: 0,
        errors: [],
        warnings: [],
      },
      testResult: {
        success: false,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        testDuration: 0,
        failedTestDetails: [],
      },
      typeCheckResult: {
        success: false,
        errors: [],
        warnings: [],
        checkDuration: 0,
      },
      functionalityResult: {
        battleSystemWorking: false,
        routingWorking: false,
        componentsRendering: false,
        hooksWorking: false,
        errors: [],
      },
      performanceMetrics: {
        buildTime: 0,
        testTime: 0,
        typeCheckTime: 0,
        bundleSize: 0,
        memoryUsage: 0,
      },
    };

    try {
      console.log('🔍 Running post-cleanup verification...\n');

      // 1. TypeScript compilation check
      console.log('📝 Checking TypeScript compilation...');
      result.typeCheckResult = await this.verifyTypeScriptCompilation();
      
      if (!result.typeCheckResult.success) {
        result.isValid = false;
        result.errors.push('TypeScript compilation failed');
      }

      // 2. Build verification
      console.log('🏗️  Verifying build process...');
      result.buildResult = await this.verifyBuild();
      
      if (!result.buildResult.success) {
        result.isValid = false;
        result.errors.push('Build process failed');
      }

      // 3. Test suite execution
      console.log('🧪 Running test suite...');
      result.testResult = await this.runTestSuite();
      
      if (!result.testResult.success) {
        result.isValid = false;
        result.errors.push(`${result.testResult.failedTests} tests failed`);
      }

      // 4. Battle system functionality verification
      console.log('⚔️  Verifying battle system functionality...');
      result.functionalityResult = await this.verifyBattleSystemFunctionality();
      
      if (!result.functionalityResult.battleSystemWorking) {
        result.isValid = false;
        result.errors.push('Battle system functionality verification failed');
      }

      // 5. Calculate performance metrics
      result.performanceMetrics = {
        buildTime: result.buildResult.buildTime,
        testTime: result.testResult.testDuration,
        typeCheckTime: result.typeCheckResult.checkDuration,
        bundleSize: result.buildResult.bundleSize || 0,
        memoryUsage: process.memoryUsage().heapUsed,
      };

    } catch (error) {
      result.errors.push(`Verification error: ${error instanceof Error ? error.message : String(error)}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Verify TypeScript compilation
   */
  private async verifyTypeScriptCompilation(): Promise<TypeCheckResult> {
    const startTime = Date.now();
    
    try {
      const { execSync } = require('child_process');
      
      const output = execSync('npx tsc --noEmit --pretty', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      return {
        success: true,
        errors: [],
        warnings: this.parseTypeScriptWarnings(output),
        checkDuration: Date.now() - startTime,
      };

    } catch (error: any) {
      const errorOutput = error.stdout || error.stderr || error.message;
      const parsedErrors = this.parseTypeScriptErrors(errorOutput);

      return {
        success: false,
        errors: parsedErrors,
        warnings: [],
        checkDuration: Date.now() - startTime,
      };
    }
  }

  /**
   * Verify build process
   */
  private async verifyBuild(): Promise<BuildVerificationResult> {
    const startTime = Date.now();
    
    try {
      const { execSync } = require('child_process');
      
      const output = execSync('npm run build', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 300000, // 5 minutes
      });

      const buildTime = Date.now() - startTime;
      const bundleSize = await this.calculateBundleSize();

      return {
        success: true,
        buildTime,
        errors: [],
        warnings: this.parseBuildWarnings(output),
        bundleSize,
      };

    } catch (error: any) {
      const errorOutput = error.stdout || error.stderr || error.message;
      
      return {
        success: false,
        buildTime: Date.now() - startTime,
        errors: [errorOutput],
        warnings: [],
      };
    }
  }

  /**
   * Run test suite
   */
  private async runTestSuite(): Promise<TestVerificationResult> {
    const startTime = Date.now();
    
    try {
      const { execSync } = require('child_process');
      
      const output = execSync('npm test -- --passWithNoTests --verbose', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 180000, // 3 minutes
      });

      const testStats = this.parseTestOutput(output);
      
      return {
        success: testStats.failedTests === 0,
        totalTests: testStats.totalTests,
        passedTests: testStats.passedTests,
        failedTests: testStats.failedTests,
        testDuration: Date.now() - startTime,
        failedTestDetails: testStats.failedTestDetails,
      };

    } catch (error: any) {
      const errorOutput = error.stdout || error.stderr || error.message;
      const testStats = this.parseTestOutput(errorOutput);
      
      return {
        success: false,
        totalTests: testStats.totalTests,
        passedTests: testStats.passedTests,
        failedTests: testStats.failedTests,
        testDuration: Date.now() - startTime,
        failedTestDetails: testStats.failedTestDetails,
      };
    }
  }

  /**
   * Verify battle system functionality
   */
  private async verifyBattleSystemFunctionality(): Promise<FunctionalityVerificationResult> {
    const result: FunctionalityVerificationResult = {
      battleSystemWorking: true,
      routingWorking: true,
      componentsRendering: true,
      hooksWorking: true,
      errors: [],
    };

    try {
      // Check if battle-v2 files exist and are accessible
      const battleV2HooksPath = path.join(this.projectRoot, 'src/hooks/battle-v2');
      const battleV2ComponentsPath = path.join(this.projectRoot, 'src/components/game/battle-v2');
      const battleV2PagePath = path.join(this.projectRoot, 'src/app/game/arena/battle-v2/[battleId]/page.tsx');

      if (!fs.existsSync(battleV2HooksPath)) {
        result.hooksWorking = false;
        result.errors.push('Battle-v2 hooks directory not found');
      }

      if (!fs.existsSync(battleV2ComponentsPath)) {
        result.componentsRendering = false;
        result.errors.push('Battle-v2 components directory not found');
      }

      if (!fs.existsSync(battleV2PagePath)) {
        result.routingWorking = false;
        result.errors.push('Battle-v2 page route not found');
      }

      // Check if required hook files exist
      const requiredHooks = [
        'useBattleState.ts',
        'useBattleActions.ts',
        'useBattleRealtime.ts',
        'useHumanoidCards.ts',
      ];

      for (const hook of requiredHooks) {
        const hookPath = path.join(battleV2HooksPath, hook);
        if (!fs.existsSync(hookPath)) {
          result.hooksWorking = false;
          result.errors.push(`Required hook ${hook} not found`);
        }
      }

      // Check if required component files exist
      const requiredComponents = [
        'index.ts',
        'HumanoidCardGrid.tsx',
      ];

      for (const component of requiredComponents) {
        const componentPath = path.join(battleV2ComponentsPath, component);
        if (!fs.existsSync(componentPath)) {
          result.componentsRendering = false;
          result.errors.push(`Required component ${component} not found`);
        }
      }

      // Check if consolidated types exist
      const consolidatedTypesPath = path.join(this.projectRoot, 'src/types/battle-consolidated.ts');
      if (!fs.existsSync(consolidatedTypesPath)) {
        result.errors.push('Consolidated battle types not found');
      }

      // Overall battle system status
      result.battleSystemWorking = result.hooksWorking && 
                                  result.componentsRendering && 
                                  result.routingWorking;

    } catch (error) {
      result.battleSystemWorking = false;
      result.errors.push(`Functionality check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Calculate bundle size
   */
  private async calculateBundleSize(): Promise<number> {
    try {
      const nextBuildDir = path.join(this.projectRoot, '.next');
      
      if (!fs.existsSync(nextBuildDir)) {
        return 0;
      }

      let totalSize = 0;
      
      const calculateDirSize = async (dirPath: string): Promise<number> => {
        let size = 0;
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            size += await calculateDirSize(fullPath);
          } else {
            const stats = await fs.promises.stat(fullPath);
            size += stats.size;
          }
        }
        
        return size;
      };

      totalSize = await calculateDirSize(nextBuildDir);
      return totalSize;

    } catch (error) {
      return 0;
    }
  }

  /**
   * Parse TypeScript errors from output
   */
  private parseTypeScriptErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('error TS')) {
        errors.push(line.trim());
      }
    }
    
    return errors;
  }

  /**
   * Parse TypeScript warnings from output
   */
  private parseTypeScriptWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('warning TS')) {
        warnings.push(line.trim());
      }
    }
    
    return warnings;
  }

  /**
   * Parse build warnings from output
   */
  private parseBuildWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('warning') || line.includes('Warning')) {
        warnings.push(line.trim());
      }
    }
    
    return warnings;
  }

  /**
   * Parse test output to extract statistics
   */
  private parseTestOutput(output: string): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    failedTestDetails: FailedTest[];
  } {
    const result = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      failedTestDetails: [] as FailedTest[],
    };

    const lines = output.split('\n');
    
    for (const line of lines) {
      // Parse Jest test summary
      const testSummaryMatch = line.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (testSummaryMatch) {
        result.failedTests = parseInt(testSummaryMatch[1]);
        result.passedTests = parseInt(testSummaryMatch[2]);
        result.totalTests = parseInt(testSummaryMatch[3]);
      }

      // Parse individual test failures
      if (line.includes('FAIL') && line.includes('.test.')) {
        const testFile = line.split(' ').pop() || '';
        result.failedTestDetails.push({
          name: 'Test suite failed',
          error: line,
          file: testFile,
        });
      }
    }

    return result;
  }

  /**
   * Generate verification report
   */
  async generateReport(result: VerificationResult, outputPath?: string): Promise<void> {
    const reportPath = outputPath || path.join(this.projectRoot, 'post-cleanup-verification-report.md');
    
    const report = this.formatVerificationReport(result);
    await fs.promises.writeFile(reportPath, report);
    
    console.log(`📊 Verification report generated: ${reportPath}`);
  }

  /**
   * Format verification result as markdown report
   */
  private formatVerificationReport(result: VerificationResult): string {
    const { buildResult, testResult, typeCheckResult, functionalityResult, performanceMetrics } = result;
    
    return `# Post-Cleanup Verification Report

Generated on: ${new Date().toISOString()}

## Overall Status

**✅ Verification ${result.isValid ? 'PASSED' : 'FAILED'}**

## Summary

- **Build**: ${buildResult.success ? '✅ PASSED' : '❌ FAILED'}
- **Tests**: ${testResult.success ? '✅ PASSED' : '❌ FAILED'} (${testResult.passedTests}/${testResult.totalTests})
- **TypeScript**: ${typeCheckResult.success ? '✅ PASSED' : '❌ FAILED'}
- **Battle System**: ${functionalityResult.battleSystemWorking ? '✅ WORKING' : '❌ BROKEN'}

## Performance Metrics

- **Build Time**: ${performanceMetrics.buildTime}ms
- **Test Time**: ${performanceMetrics.testTime}ms
- **TypeScript Check Time**: ${performanceMetrics.typeCheckTime}ms
- **Bundle Size**: ${this.formatBytes(performanceMetrics.bundleSize)}
- **Memory Usage**: ${this.formatBytes(performanceMetrics.memoryUsage)}

## Build Verification

**Status**: ${buildResult.success ? 'PASSED' : 'FAILED'}
**Duration**: ${buildResult.buildTime}ms
**Bundle Size**: ${buildResult.bundleSize ? this.formatBytes(buildResult.bundleSize) : 'Unknown'}

${buildResult.errors.length > 0 ? `
### Build Errors
${buildResult.errors.map(error => `- ${error}`).join('\n')}
` : ''}

${buildResult.warnings.length > 0 ? `
### Build Warnings
${buildResult.warnings.map(warning => `- ${warning}`).join('\n')}
` : ''}

## Test Results

**Status**: ${testResult.success ? 'PASSED' : 'FAILED'}
**Total Tests**: ${testResult.totalTests}
**Passed**: ${testResult.passedTests}
**Failed**: ${testResult.failedTests}
**Duration**: ${testResult.testDuration}ms

${testResult.failedTestDetails.length > 0 ? `
### Failed Tests
${testResult.failedTestDetails.map(test => `
- **${test.name}** (${test.file})
  \`\`\`
  ${test.error}
  \`\`\`
`).join('\n')}
` : ''}

## TypeScript Compilation

**Status**: ${typeCheckResult.success ? 'PASSED' : 'FAILED'}
**Duration**: ${typeCheckResult.checkDuration}ms

${typeCheckResult.errors.length > 0 ? `
### TypeScript Errors
${typeCheckResult.errors.map(error => `- ${error}`).join('\n')}
` : ''}

${typeCheckResult.warnings.length > 0 ? `
### TypeScript Warnings
${typeCheckResult.warnings.map(warning => `- ${warning}`).join('\n')}
` : ''}

## Battle System Functionality

**Overall Status**: ${functionalityResult.battleSystemWorking ? 'WORKING' : 'BROKEN'}

- **Hooks**: ${functionalityResult.hooksWorking ? '✅' : '❌'}
- **Components**: ${functionalityResult.componentsRendering ? '✅' : '❌'}
- **Routing**: ${functionalityResult.routingWorking ? '✅' : '❌'}

${functionalityResult.errors.length > 0 ? `
### Functionality Errors
${functionalityResult.errors.map(error => `- ${error}`).join('\n')}
` : ''}

## Overall Errors

${result.errors.length > 0 ? result.errors.map(error => `- ${error}`).join('\n') : 'No errors detected'}

## Overall Warnings

${result.warnings.length > 0 ? result.warnings.map(warning => `- ${warning}`).join('\n') : 'No warnings'}

## Recommendations

${result.isValid ? `
✅ **Cleanup verification successful!**
- All systems are functioning correctly
- Build process is working
- Tests are passing
- Battle system is operational

**Next Steps:**
- Monitor application in development/staging
- Run additional integration tests if needed
- Document any changes made during cleanup
` : `
❌ **Cleanup verification failed!**
- Review the errors above
- Fix any broken functionality
- Re-run verification after fixes
- Consider rolling back changes if issues persist

**Immediate Actions Required:**
${result.errors.map(error => `- Fix: ${error}`).join('\n')}
`}
`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}