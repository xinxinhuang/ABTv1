const fs = require('fs');
const path = require('path');

/**
 * Simple test to verify the file scanner logic works
 */
async function testBasicScanning() {
  console.log('Testing basic file scanning functionality...\n');
  
  try {
    // Test directory scanning
    const srcDir = path.resolve(__dirname, '..');
    console.log(`Scanning directory: ${srcDir}`);
    
    const files = await scanDirectory(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
    console.log(`Found ${files.length} files`);
    
    // Test file analysis on a few files
    const testFiles = files.slice(0, 3);
    console.log(`\nAnalyzing first 3 files:`);
    
    for (const file of testFiles) {
      const analysis = await analyzeBasicFile(file);
      console.log(`- ${path.relative(process.cwd(), file)}`);
      console.log(`  Type: ${analysis.type}, Size: ${analysis.size} bytes`);
      console.log(`  Dependencies: ${analysis.dependencies.length}`);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
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

async function analyzeBasicFile(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const stats = await fs.promises.stat(filePath);
    
    const dependencies = extractBasicDependencies(content);
    
    return {
      path: filePath,
      type: determineFileType(filePath, content),
      size: stats.size,
      dependencies,
    };
  } catch (error) {
    console.warn(`Error analyzing file ${filePath}:`, error);
    return null;
  }
}

function extractBasicDependencies(content) {
  const dependencies = new Set();
  
  // Simple import pattern matching
  const importPattern = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
  let match;
  
  while ((match = importPattern.exec(content)) !== null) {
    const dependency = match[1];
    if (dependency && (dependency.startsWith('.') || dependency.startsWith('/'))) {
      dependencies.add(dependency);
    }
  }
  
  return Array.from(dependencies);
}

function determineFileType(filePath, content) {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  if (fileName.includes('.test.') || fileName.includes('.spec.')) {
    return 'test';
  }
  
  if (fileName.startsWith('use') && (fileName.endsWith('.ts') || fileName.endsWith('.tsx'))) {
    return 'hook';
  }
  
  if (content.includes('export default') && (content.includes('React') || content.includes('jsx'))) {
    return 'component';
  }
  
  if (dirName.includes('/types/') || content.includes('interface ') || content.includes('type ')) {
    return 'type';
  }
  
  return 'utility';
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
testBasicScanning();