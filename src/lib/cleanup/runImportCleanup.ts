import * as path from 'path';

import { ImportAnalyzer } from './importAnalyzer';

async function runImportCleanup() {
  const analyzer = new ImportAnalyzer();
  const srcPath = path.join(process.cwd(), 'src');
  
  console.log('🔍 Analyzing imports in', srcPath);
  
  try {
    const results = await analyzer.analyzeDirectory(srcPath);
    
    console.log(`\n📊 Analysis Results:`);
    console.log(`- Files analyzed: ${results.length} files with import issues`);
    
    let totalUnusedImports = 0;
    let totalDuplicateModules = 0;
    
    for (const result of results) {
      totalUnusedImports += result.unusedImports.length;
      totalDuplicateModules += result.duplicateImports.length;
      
      console.log(`\n📄 ${result.file.replace(srcPath, 'src')}`);
      console.log(`  - Total imports: ${result.totalImports}`);
      
      if (result.unusedImports.length > 0) {
        console.log(`  - Unused imports: ${result.unusedImports.length}`);
        for (const unused of result.unusedImports) {
          console.log(`    • Line ${unused.line + 1}: ${unused.importName} from '${unused.module}'`);
        }
      }
      
      if (result.duplicateImports.length > 0) {
        console.log(`  - Duplicate imports from: ${result.duplicateImports.join(', ')}`);
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`- Total unused imports: ${totalUnusedImports}`);
    console.log(`- Total duplicate modules: ${totalDuplicateModules}`);
    
    // Ask for confirmation before cleaning up
    console.log(`\n🧹 Starting cleanup...`);
    
    let cleanedFiles = 0;
    for (const result of results) {
      if (result.unusedImports.length > 0) {
        await analyzer.removeUnusedImports(result.file);
        cleanedFiles++;
        console.log(`✅ Cleaned: ${result.file.replace(srcPath, 'src')}`);
      }
    }
    
    console.log(`\n🎉 Cleanup complete! Cleaned ${cleanedFiles} files.`);
    
  } catch (error) {
    console.error('❌ Error during import cleanup:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runImportCleanup();
}

export { runImportCleanup };