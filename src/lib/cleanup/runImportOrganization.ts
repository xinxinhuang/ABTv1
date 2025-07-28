import * as path from 'path';

import { ImportOrganizer } from './importOrganizer';

async function runImportOrganization() {
  const organizer = new ImportOrganizer();
  const srcPath = path.join(process.cwd(), 'src');
  
  console.log('📋 Organizing imports in', srcPath);
  
  try {
    await organizer.organizeDirectory(srcPath);
  } catch (error) {
    console.error('❌ Error during import organization:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runImportOrganization();
}

export { runImportOrganization };