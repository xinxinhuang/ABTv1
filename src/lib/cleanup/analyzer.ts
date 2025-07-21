import { CleanupConfig, AnalysisResults, FileAnalysis } from './types';
import { FileAnalyzer } from './fileAnalyzer';
import { DependencyTracker } from './dependencyTracker';
import { UsageScanner } from './usageScanner';
import { DEFAULT_CLEANUP_CONFIG } from './config';

/**
 * Main analyzer class that coordinates all cleanup analysis
 */
export class CodeCleanupAnalyzer {
  private config: CleanupConfig;
  private fileAnalyzer: FileAnalyzer;
  private dependencyTracker: DependencyTracker;
  private usageScanner: UsageScanner;

  constructor(config: CleanupConfig = DEFAULT_CLEANUP_CONFIG) {
    this.config = config;
    this.fileAnalyzer = new FileAnalyzer();
    this.dependencyTracker = new DependencyTracker();
    this.usageScanner = new UsageScanner();
  }

  /**
   * Performs comprehensive analysis of the codebase
   */
  async analyze(): Promise<AnalysisResults> {
    console.log('Starting codebase analysis...');
    
    // Analyze files
    const fileAnalyses = await this.fileAnalyzer.analyzeFiles(this.config);
    
    // Get unused files
    const unusedFiles = this.fileAnalyzer.getRemovableFiles(fileAnalyses);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(fileAnalyses);
    
    // Assess risks
    const riskAssessment = this.assessRisks(fileAnalyses);

    const results: AnalysisResults = {
      totalFilesAnalyzed: fileAnalyses.length,
      unusedFiles,
      duplicateTypes: [], // TODO: Implement type analysis
      unusedImports: [], // TODO: Implement import analysis
      recommendations,
      riskAssessment,
      analysisDate: new Date(),
      configUsed: this.config
    };

    console.log(`Analysis complete. Found ${unusedFiles.length} unused files out of ${fileAnalyses.length} analyzed.`);
    
    return results;
  }

  /**
   * Generates cleanup recommendations based on analysis
   */
  private generateRecommendations(analyses: FileAnalysis[]) {
    const recommendations = [];
    
    const removableFiles = this.fileAnalyzer.getRemovableFiles(analyses);
    if (removableFiles.length > 0) {
      recommendations.push({
        type: 'remove_file' as const,
        priority: 'high' as const,
        description: `Remove ${removableFiles.length} unused files`,
        affectedFiles: removableFiles.map(f => f.path),
        estimatedImpact: `Reduce codebase by ${removableFiles.reduce((sum, f) => sum + f.size, 0)} bytes`,
        riskLevel: 'low' as const
      });
    }

    return recommendations;
  }

  /**
   * Assesses risks of cleanup operations
   */
  private assessRisks(analyses: FileAnalysis[]) {
    const highRiskFiles = this.fileAnalyzer.getHighRiskFiles(analyses);
    
    return {
      highRiskFiles: highRiskFiles.map(f => f.path),
      mediumRiskFiles: analyses.filter(a => a.removalRisk === 'medium').map(a => a.path),
      lowRiskFiles: analyses.filter(a => a.removalRisk === 'low').map(a => a.path),
      potentialBreakingChanges: highRiskFiles.map(f => f.path),
      recommendedTestingAreas: ['Battle system functionality', 'Navigation', 'Type checking'],
      overallRisk: highRiskFiles.length > 0 ? 'high' as const : 'low' as const
    };
  }  /**
   
* Generates a summary report of the analysis
   */
  generateSummaryReport(results: AnalysisResults): string {
    const report = [];
    
    report.push('=== Code Cleanup Analysis Report ===');
    report.push(`Analysis Date: ${results.analysisDate.toISOString()}`);
    report.push(`Total Files Analyzed: ${results.totalFilesAnalyzed}`);
    report.push(`Unused Files Found: ${results.unusedFiles.length}`);
    report.push(`Overall Risk Level: ${results.riskAssessment.overallRisk}`);
    report.push('');
    
    if (results.unusedFiles.length > 0) {
      report.push('Unused Files:');
      results.unusedFiles.forEach(file => {
        report.push(`  - ${file.path} (${file.size} bytes, risk: ${file.removalRisk})`);
      });
      report.push('');
    }
    
    if (results.recommendations.length > 0) {
      report.push('Recommendations:');
      results.recommendations.forEach(rec => {
        report.push(`  - [${rec.priority.toUpperCase()}] ${rec.description}`);
        report.push(`    Impact: ${rec.estimatedImpact}`);
        report.push(`    Risk: ${rec.riskLevel}`);
      });
      report.push('');
    }
    
    if (results.riskAssessment.highRiskFiles.length > 0) {
      report.push('High Risk Files (review before removal):');
      results.riskAssessment.highRiskFiles.forEach(file => {
        report.push(`  - ${file}`);
      });
      report.push('');
    }
    
    report.push('Recommended Testing Areas:');
    results.riskAssessment.recommendedTestingAreas.forEach(area => {
      report.push(`  - ${area}`);
    });
    
    return report.join('\n');
  }

  /**
   * Analyzes specific battle system v1 files
   */
  async analyzeBattleV1Files(): Promise<FileAnalysis[]> {
    const battleV1Config = {
      ...this.config,
      targetDirectories: [
        'booster-game/src/hooks/battle',
        'booster-game/src/lib/battle',
        'booster-game/src/components/game/battle',
        'booster-game/src/hooks/useBattle.ts'
      ]
    };

    return this.fileAnalyzer.analyzeFiles(battleV1Config);
  }

  /**
   * Quick check for battle system v1 usage
   */
  async checkBattleV1Usage(): Promise<{ hasUsage: boolean; usageFiles: string[] }> {
    const battleV1Files = [
      'src/hooks/battle',
      'src/lib/battle/battleLogic.ts',
      'src/hooks/useBattle.ts'
    ];

    const usageFiles: string[] = [];
    
    for (const file of battleV1Files) {
      const references = await this.usageScanner.findReferencesToFile(
        file, 
        'booster-game/src', 
        this.config.excludePatterns
      );
      usageFiles.push(...references);
    }

    return {
      hasUsage: usageFiles.length > 0,
      usageFiles: [...new Set(usageFiles)]
    };
  }
}