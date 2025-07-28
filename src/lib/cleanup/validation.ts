/**
 * Pre-cleanup validation utilities
 * Ensures the current battle system functionality works before cleanup
 */

import { CleanupConfig, FileAnalysis, RiskAssessment } from './types';
import fs from 'fs';
import path from 'path';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  testResults: TestResult[];
  backupCreated: boolean;
  backupPath?: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface DryRunResult {
  filesToRemove: string[];
  filesToModify: string[];
  estimatedSavings: {
    filesRemoved: number;
    linesRemoved: number;
    sizeReduced: number; // in bytes
  };
  potentialIssues: string[];
}

export class PreCleanupValidator {
  private config: CleanupConfig;
  private projectRoot: string;

  constructor(config: CleanupConfig, projectRoot: string = process.cwd()) {
    this.config = config;
    this.projectRoot = projectRoot;
  }

  /**
   * Run comprehensive pre-cleanup validation
   */
  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      testResults: [],
      backupCreated: false,
    };

    try {
      // 1. Create backup if configured
      if (this.config.createBackup) {
        const backupPath = await this.createBackup();
        result.backupCreated = true;
        result.backupPath = backupPath;
      }

      // 2. Run battle system functionality tests
      const testResults = await this.runBattleSystemTests();
      result.testResults = testResults;

      // 3. Validate TypeScript compilation
      const tsValidation = await this.validateTypeScriptCompilation();
      if (!tsValidation.success) {
        result.errors.push(`TypeScript compilation failed: ${tsValidation.error}`);
        result.isValid = false;
      }

      // 4. Check for critical dependencies
      const depValidation = await this.validateCriticalDependencies();
      if (depValidation.length > 0) {
        result.warnings.push(...depValidation);
      }

      // 5. Validate build process
      const buildValidation = await this.validateBuildProcess();
      if (!buildValidation.success) {
        result.errors.push(`Build validation failed: ${buildValidation.error}`);
        result.isValid = false;
      }

      // Check if any tests failed
      const failedTests = testResults.filter(test => !test.passed);
      if (failedTests.length > 0) {
        result.errors.push(`${failedTests.length} tests failed`);
        result.isValid = false;
      }

    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Create backup of files before cleanup
   */
  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.projectRoot, '.cleanup-backups', `backup-${timestamp}`);
    
    // Create backup directory
    await fs.promises.mkdir(backupDir, { recursive: true });

    // Copy all target directories to backup
    for (const targetDir of this.config.targetDirectories) {
      const sourcePath = path.join(this.projectRoot, targetDir);
      const backupPath = path.join(backupDir, targetDir);
      
      if (fs.existsSync(sourcePath)) {
        await this.copyDirectory(sourcePath, backupPath);
      }
    }

    // Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      config: this.config,
      directories: this.config.targetDirectories,
    };
    
    await fs.promises.writeFile(
      path.join(backupDir, 'backup-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    return backupDir;
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(source: string, destination: string): Promise<void> {
    await fs.promises.mkdir(destination, { recursive: true });
    
    const entries = await fs.promises.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        await fs.promises.copyFile(sourcePath, destPath);
      }
    }
  }

  /**
   * Run battle system functionality tests
   */
  private async runBattleSystemTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test battle-v2 hooks
    results.push(await this.testBattleV2Hooks());
    
    // Test battle-v2 components
    results.push(await this.testBattleV2Components());
    
    // Test battle system integration
    results.push(await this.testBattleSystemIntegration());

    return results;
  }

  /**
   * Test battle-v2 hooks functionality
   */
  private async testBattleV2Hooks(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Check if battle-v2 hooks can be imported
      const hooksPath = path.join(this.projectRoot, 'src/hooks/battle-v2');
      
      if (!fs.existsSync(hooksPath)) {
        throw new Error('Battle-v2 hooks directory not found');
      }

      // Check for required hook files
      const requiredHooks = [
        'useBattleState.ts',
        'useBattleActions.ts',
        'useBattleRealtime.ts',
        'useHumanoidCards.ts'
      ];

      for (const hook of requiredHooks) {
        const hookPath = path.join(hooksPath, hook);
        if (!fs.existsSync(hookPath)) {
          throw new Error(`Required hook ${hook} not found`);
        }
      }

      return {
        name: 'Battle-v2 Hooks Test',
        passed: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Battle-v2 Hooks Test',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Test battle-v2 components functionality
   */
  private async testBattleV2Components(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Check if battle-v2 components can be imported
      const componentsPath = path.join(this.projectRoot, 'src/components/game/battle-v2');
      
      if (!fs.existsSync(componentsPath)) {
        throw new Error('Battle-v2 components directory not found');
      }

      // Check for required component files
      const requiredComponents = [
        'index.ts',
        'HumanoidCardGrid.tsx'
      ];

      for (const component of requiredComponents) {
        const componentPath = path.join(componentsPath, component);
        if (!fs.existsSync(componentPath)) {
          throw new Error(`Required component ${component} not found`);
        }
      }

      return {
        name: 'Battle-v2 Components Test',
        passed: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Battle-v2 Components Test',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Test battle system integration
   */
  private async testBattleSystemIntegration(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Check if battle-v2 page exists and is properly configured
      const battlePagePath = path.join(this.projectRoot, 'src/app/game/arena/battle-v2');
      
      if (!fs.existsSync(battlePagePath)) {
        throw new Error('Battle-v2 page directory not found');
      }

      // Check for page.tsx
      const pageFile = path.join(battlePagePath, '[battleId]/page.tsx');
      if (!fs.existsSync(pageFile)) {
        throw new Error('Battle-v2 page.tsx not found');
      }

      return {
        name: 'Battle System Integration Test',
        passed: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Battle System Integration Test',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate TypeScript compilation
   */
  private async validateTypeScriptCompilation(): Promise<{ success: boolean; error?: string }> {
    try {
      const { execSync } = require('child_process');
      
      // Run TypeScript compiler check
      execSync('npx tsc --noEmit', {
        cwd: this.projectRoot,
        stdio: 'pipe',
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate critical dependencies
   */
  private async validateCriticalDependencies(): Promise<string[]> {
    const warnings: string[] = [];
    
    try {
      // Check package.json dependencies
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf-8'));
      
      // Check for critical battle system dependencies
      const criticalDeps = [
        '@supabase/supabase-js',
        'zustand',
        'react',
        'next'
      ];

      for (const dep of criticalDeps) {
        if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
          warnings.push(`Critical dependency ${dep} not found in package.json`);
        }
      }

    } catch (error) {
      warnings.push(`Could not validate dependencies: ${error instanceof Error ? error.message : String(error)}`);
    }

    return warnings;
  }

  /**
   * Validate build process
   */
  private async validateBuildProcess(): Promise<{ success: boolean; error?: string }> {
    if (this.config.dryRun) {
      // Skip actual build in dry run mode
      return { success: true };
    }

    try {
      const { execSync } = require('child_process');
      
      // Run Next.js build check
      execSync('npm run build', {
        cwd: this.projectRoot,
        stdio: 'pipe',
        timeout: 300000, // 5 minutes timeout
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run dry-run mode to preview changes
   */
  async runDryRun(filesToRemove: FileAnalysis[]): Promise<DryRunResult> {
    const result: DryRunResult = {
      filesToRemove: [],
      filesToModify: [],
      estimatedSavings: {
        filesRemoved: 0,
        linesRemoved: 0,
        sizeReduced: 0,
      },
      potentialIssues: [],
    };

    try {
      for (const file of filesToRemove) {
        if (file.canRemove && file.removalRisk === 'low') {
          result.filesToRemove.push(file.path);
          result.estimatedSavings.filesRemoved++;
          result.estimatedSavings.sizeReduced += file.size;
          
          // Estimate lines removed
          const content = await fs.promises.readFile(
            path.join(this.projectRoot, file.path),
            'utf-8'
          );
          result.estimatedSavings.linesRemoved += content.split('\n').length;
        } else {
          result.potentialIssues.push(
            `Cannot safely remove ${file.path}: ${file.removalRisk} risk`
          );
        }
      }

    } catch (error) {
      result.potentialIssues.push(
        `Dry run error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }
}