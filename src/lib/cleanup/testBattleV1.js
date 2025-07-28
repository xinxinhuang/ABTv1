const fs = require('fs');
const path = require('path');

/**
 * Test battle v1 analysis functionality
 */
async function testBattleV1Analysis() {
  console.log('Testing Battle V1 Analysis...\n');
  
  try {
    // Find battle v1 files
    const battleV1Files = await findBattleV1Files();
    console.log(`Found ${battleV1Files.length} potential battle v1 files:`);
    
    battleV1Files.forEach(file => {
      console.log(`- ${file.relativePath} (${file.size} bytes)`);
      if (file.exports.length > 0) {
        console.log(`  Exports: ${file.exports.join(', ')}`);
      }
    });
    
    // Search for usage references
    console.log('\nSearching for usage references...');
    const references = await findUsageReferences(battleV1Files);
    
    console.log(`\nFound ${references.length} potential references:`);
    references.forEach(ref => {
      console.log(`- ${path.relative('.', ref.file)}:${ref.line}`);
      console.log(`  ${ref.content}`);
      console.log(`  Type: ${ref.type}, References: ${path.basename(ref.referencedFile)}`);
    });
    
    // Find route references
    console.log('\nSearching for route references...');
    const routeRefs = await findRouteReferences();
    
    console.log(`\nFound ${routeRefs.length} route references:`);
    routeRefs.forEach(ref => {
      console.log(`- ${path.relative('.', ref.file)}:${ref.line}`);
      console.log(`  Route: ${ref.route}`);
      console.log(`  Content: ${ref.content}`);
    });
    
    // Summary
    console.log('\n=== SUMMARY ===');
    const safeToRemove = battleV1Files.filter(file => 
      !references.some(ref => ref.referencedFile === file.path)
    );
    
    console.log(`Total battle v1 files: ${battleV1Files.length}`);
    console.log(`Total references found: ${references.length}`);
    console.log(`Route references: ${routeRefs.length}`);
    console.log(`Safe to remove: ${safeToRemove.length}`);
    
    if (safeToRemove.length > 0) {
      console.log('\nFiles that appear safe to remove:');
      safeToRemove.forEach(file => {
        console.log(`- ${file.relativePath}`);
      });
    }
    
  } catch (error) {
    console.error('Error during battle v1 analysis:', error);
  }
}

async function findBattleV1Files() {
  const files = [];
  const baseDir = path.resolve('booster-game');
  
  const battleV1Targets = [
    'src/hooks/battle/',
    'src/hooks/useBattle.ts',
    'src/lib/battle/battleLogic.ts',
    'src/lib/battle/',
    'src/app/battle/',
  ];
  
  for (const target of battleV1Targets) {
    const fullPath = path.join(baseDir, target);
    
    try {
      const stats = await fs.promises.stat(fullPath);
      
      if (stats.isDirectory()) {
        const dirFiles = await scanDirectory(fullPath);
        for (const file of dirFiles) {
          const fileInfo = await createBattleV1FileInfo(file);
          if (fileInfo) files.push(fileInfo);
        }
      } else if (stats.isFile()) {
        const fileInfo = await createBattleV1FileInfo(fullPath);
        if (fileInfo) files.push(fileInfo);
      }
    } catch (error) {
      console.log(`Battle v1 target not found: ${target}`);
    }
  }
  
  return files;
}

async function createBattleV1FileInfo(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const stats = await fs.promises.stat(filePath);
    const relativePath = path.relative(path.resolve('booster-game'), filePath);
    
    return {
      path: filePath,
      relativePath,
      size: stats.size,
      lastModified: stats.mtime,
      exports: extractExports(content),
      isBattleV1: isBattleV1File(filePath, content),
    };
  } catch (error) {
    console.warn(`Error analyzing battle v1 file ${filePath}:`, error);
    return null;
  }
}

function isBattleV1File(filePath, content) {
  if (filePath.includes('/battle/') && !filePath.includes('/battle-v2/')) {
    return true;
  }
  
  if (filePath.includes('useBattle.ts') && !filePath.includes('useBattle-v2')) {
    return true;
  }
  
  const battleV1Patterns = [
    'battleLogic',
    'useBattle',
    'BattleState',
    'BattleAction',
  ];
  
  return battleV1Patterns.some(pattern => content.includes(pattern));
}

function extractExports(content) {
  const exports = new Set();
  
  const namedExportPattern = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let match;
  while ((match = namedExportPattern.exec(content)) !== null) {
    exports.add(match[1]);
  }
  
  const exportStatementPattern = /export\s*\{\s*([^}]+)\s*\}/g;
  while ((match = exportStatementPattern.exec(content)) !== null) {
    const exportList = match[1].split(',').map(e => e.trim().split(/\s+as\s+/)[0].trim());
    exportList.forEach(exp => exports.add(exp));
  }
  
  if (content.includes('export default')) {
    exports.add('default');
  }
  
  return Array.from(exports);
}

async function findUsageReferences(battleV1Files) {
  const references = [];
  const srcDir = path.resolve('booster-game/src');
  
  const allFiles = await scanDirectory(srcDir);
  
  for (const file of allFiles) {
    try {
      const content = await fs.promises.readFile(file, 'utf-8');
      
      for (const battleFile of battleV1Files) {
        const refs = findReferencesInFile(content, battleFile, file);
        references.push(...refs);
      }
    } catch (error) {
      console.warn(`Error searching file ${file}:`, error);
    }
  }
  
  return references;
}

function findReferencesInFile(content, battleFile, searchingInFile) {
  const references = [];
  const lines = content.split('\n');
  
  // Search for usage of exports
  for (const exportName of battleFile.exports) {
    if (exportName === 'default') continue;
    
    const usagePattern = new RegExp(`\\b${exportName}\\b`, 'g');
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      if (usagePattern.test(line)) {
        references.push({
          file: searchingInFile,
          line: lineNumber,
          content: line.trim(),
          type: 'usage',
          referencedFile: battleFile.path,
          referencedExport: exportName,
        });
      }
    }
  }
  
  // Search for import statements
  const baseName = path.basename(battleFile.path, path.extname(battleFile.path));
  const importPattern = new RegExp(`from\\s+['"\`]([^'"\`]*${baseName}[^'"\`]*)['"\`]`, 'g');
  
  let lineNumber = 0;
  for (const line of lines) {
    lineNumber++;
    let match;
    importPattern.lastIndex = 0;
    if ((match = importPattern.exec(line)) !== null) {
      references.push({
        file: searchingInFile,
        line: lineNumber,
        content: line.trim(),
        type: 'import',
        referencedFile: battleFile.path,
        referencedExport: 'import',
      });
    }
  }
  
  return references;
}

async function findRouteReferences() {
  const references = [];
  const srcDir = path.resolve('booster-game/src');
  const allFiles = await scanDirectory(srcDir);
  
  const routePatterns = [
    /['"`]\/battle\/[^'"`]*['"`]/g,
    /['"`]\/game\/arena\/battle\/[^'"`]*['"`]/g,
    /router\.push\s*\(\s*['"`]([^'"`]*\/battle\/[^'"`]*)['"`]/g,
    /href\s*=\s*['"`]([^'"`]*\/battle\/[^'"`]*)['"`]/g,
  ];
  
  for (const file of allFiles) {
    try {
      const content = await fs.promises.readFile(file, 'utf-8');
      const lines = content.split('\n');
      
      for (const pattern of routePatterns) {
        let lineNumber = 0;
        for (const line of lines) {
          lineNumber++;
          let match;
          pattern.lastIndex = 0;
          while ((match = pattern.exec(line)) !== null) {
            references.push({
              file,
              line: lineNumber,
              content: line.trim(),
              route: match[1] || match[0],
              type: 'route-reference',
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Error searching routes in ${file}:`, error);
    }
  }
  
  return references;
}

async function scanDirectory(dirPath, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!shouldSkipDirectory(entry.name)) {
          const subFiles = await scanDirectory(fullPath, extensions);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Error scanning directory ${dirPath}:`, error);
  }
  
  return files;
}

function shouldSkipDirectory(dirName) {
  const skipDirs = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    '.vercel',
    '.swc',
  ];
  
  return skipDirs.includes(dirName) || dirName.startsWith('.');
}

// Run the test
testBattleV1Analysis();