import { ImportPathOptimizer } from './importPathOptimizer';
import * as path from 'path';

async function runImportPathOptimization() {
  const srcPath = path.join(process.cwd(), 'src');
  const optimizer = new ImportPathOptimizer(srcPath);
  
  console.log('🚀 Optimizing import paths in', srcPath);
  
  try {
    await optimizer.optimizeDirectory(srcPath);
  } catch (error) {
    console.error('❌ Error during import path optimization:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runImportPathOptimization();
}

export { runImportPathOptimization };