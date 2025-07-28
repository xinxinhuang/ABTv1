import { runImportCleanup } from './runImportCleanup';
import { runImportOrganization } from './runImportOrganization';
import { runImportPathOptimization } from './runImportPathOptimization';

async function runCompleteImportOptimization() {
  console.log('🚀 Starting complete import optimization...\n');
  
  try {
    // Step 1: Remove unused imports
    console.log('📋 Step 1: Removing unused imports');
    await runImportCleanup();
    console.log('\n');
    
    // Step 2: Organize and standardize imports
    console.log('📋 Step 2: Organizing and standardizing imports');
    await runImportOrganization();
    console.log('\n');
    
    // Step 3: Optimize import paths
    console.log('📋 Step 3: Optimizing import paths');
    await runImportPathOptimization();
    console.log('\n');
    
    console.log('🎉 Complete import optimization finished successfully!');
    console.log('\n📊 Summary:');
    console.log('✅ Removed unused imports');
    console.log('✅ Organized imports by type (external, internal, relative)');
    console.log('✅ Consolidated duplicate imports');
    console.log('✅ Converted deep relative paths to absolute paths');
    console.log('✅ Removed redundant import aliases');
    
  } catch (error) {
    console.error('❌ Error during complete import optimization:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runCompleteImportOptimization();
}

export { runCompleteImportOptimization };