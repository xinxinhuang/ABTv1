const fs = require('fs');
const path = require('path');

/**
 * Test type analysis functionality
 */
async function testTypeAnalysis() {
  console.log('Testing Type Analysis...\n');
  
  try {
    const battleTypesPath = path.resolve('booster-game/src/types/battle.ts');
    const battleV2TypesPath = path.resolve('booster-game/src/types/battle-v2.ts');
    
    // Analyze both battle type files
    const result = await analyzeTypes([battleTypesPath, battleV2TypesPath]);
    
    console.log('=== TYPE ANALYSIS RESULTS ===');
    console.log(`Total types found: ${result.totalTypes}`);
    console.log(`Duplicate types: ${result.duplicates.length}`);
    console.log(`Similar types: ${result.similarities.length}`);
    console.log(`Consolidation opportunities: ${result.consolidationOpportunities.length}`);
    
    // Show type definitions
    console.log('\n=== TYPE DEFINITIONS ===');
    result.typeDefinitions.forEach(type => {
      const fileName = path.basename(type.filePath);
      const deprecated = type.isDeprecated ? ' (DEPRECATED)' : '';
      console.log(`- ${type.name} (${type.type}) in ${fileName}${deprecated}`);
      if (type.documentation) {
        console.log(`  Doc: ${type.documentation}`);
      }
      if (type.properties.length > 0) {
        console.log(`  Properties: ${type.properties.map(p => p.name).join(', ')}`);
      }
    });
    
    // Show duplicates
    if (result.duplicates.length > 0) {
      console.log('\n=== DUPLICATE TYPES ===');
      result.duplicates.forEach(dup => {
        console.log(`- ${dup.name} (${dup.severity} severity)`);
        dup.definitions.forEach(def => {
          console.log(`  - ${path.basename(def.filePath)}`);
        });
        console.log(`  Strategy: ${dup.consolidationStrategy.description}`);
      });
    }
    
    // Show similarities
    if (result.similarities.length > 0) {
      console.log('\n=== SIMILAR TYPES ===');
      result.similarities.forEach(sim => {
        console.log(`- ${sim.type1} vs ${sim.type2} (${Math.round(sim.similarity.score * 100)}% similar)`);
        console.log(`  Common: ${sim.similarity.commonProperties.join(', ')}`);
        if (sim.similarity.differences.length > 0) {
          console.log(`  Differences: ${sim.similarity.differences.slice(0, 3).join(', ')}`);
        }
      });
    }
    
    // Show consolidation opportunities
    if (result.consolidationOpportunities.length > 0) {
      console.log('\n=== CONSOLIDATION OPPORTUNITIES ===');
      result.consolidationOpportunities.forEach(opp => {
        console.log(`- ${opp.description} (${opp.estimatedImpact} impact)`);
        console.log(`  Target: ${path.basename(opp.targetFile)}`);
      });
    }
    
    // Show recommendations
    if (result.recommendations.length > 0) {
      console.log('\n=== RECOMMENDATIONS ===');
      result.recommendations.forEach(rec => {
        console.log(`- [${rec.priority.toUpperCase()}] ${rec.description}`);
        console.log(`  Action: ${rec.action}`);
      });
    }
    
  } catch (error) {
    console.error('Error during type analysis:', error);
  }
}

async function analyzeTypes(filePaths) {
  const typeDefinitions = [];
  
  // Extract types from each file
  for (const filePath of filePaths) {
    const fileTypes = await extractTypesFromFile(filePath);
    typeDefinitions.push(...fileTypes);
  }
  
  // Find duplicates and similarities
  const duplicates = findDuplicateTypes(typeDefinitions);
  const similarities = findSimilarTypes(typeDefinitions);
  const consolidationOpportunities = identifyConsolidationOpportunities(typeDefinitions);
  const recommendations = generateRecommendations(duplicates, similarities, consolidationOpportunities);
  
  return {
    totalTypes: typeDefinitions.length,
    typeDefinitions,
    duplicates,
    similarities,
    consolidationOpportunities,
    recommendations,
  };
}

async function extractTypesFromFile(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const types = [];
    
    // Extract interfaces
    const interfacePattern = /export\s+interface\s+(\w+)(?:\s+extends\s+[\w\s,<>]+)?\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
    let match;
    
    while ((match = interfacePattern.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      const properties = extractProperties(body);
      
      types.push({
        name,
        type: 'interface',
        filePath,
        body: body.trim(),
        properties,
        isDeprecated: isDeprecated(match[0]),
        documentation: extractDocumentation(content, match.index || 0),
      });
    }
    
    // Extract type aliases
    const typePattern = /export\s+type\s+(\w+)\s*=\s*([^;]+);/gs;
    while ((match = typePattern.exec(content)) !== null) {
      const name = match[1];
      const definition = match[2].trim();
      
      types.push({
        name,
        type: 'type',
        filePath,
        body: definition,
        properties: [],
        isDeprecated: isDeprecated(match[0]),
        documentation: extractDocumentation(content, match.index || 0),
      });
    }
    
    // Extract enums
    const enumPattern = /export\s+enum\s+(\w+)\s*\{([^}]+)\}/gs;
    while ((match = enumPattern.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      const enumValues = extractEnumValues(body);
      
      types.push({
        name,
        type: 'enum',
        filePath,
        body: body.trim(),
        properties: enumValues.map(value => ({ name: value, type: 'enum_value' })),
        isDeprecated: isDeprecated(match[0]),
        documentation: extractDocumentation(content, match.index || 0),
      });
    }
    
    return types;
  } catch (error) {
    console.warn(`Error extracting types from ${filePath}:`, error);
    return [];
  }
}

function extractProperties(body) {
  const properties = [];
  const propertyPattern = /(\w+)(\?)?:\s*([^;,\n]+)/g;
  let match;
  
  while ((match = propertyPattern.exec(body)) !== null) {
    properties.push({
      name: match[1],
      type: match[3].trim(),
      optional: !!match[2],
    });
  }
  
  return properties;
}

function extractEnumValues(body) {
  const values = [];
  const valuePattern = /(\w+)\s*(?:=\s*[^,\n]+)?/g;
  let match;
  
  while ((match = valuePattern.exec(body)) !== null) {
    values.push(match[1]);
  }
  
  return values;
}

function isDeprecated(definition) {
  return definition.includes('@deprecated') || definition.includes('deprecated');
}

function extractDocumentation(content, position) {
  const beforePosition = content.substring(0, position);
  const lines = beforePosition.split('\n');
  
  const docLines = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('*/')) {
      continue;
    }
    if (line.startsWith('*')) {
      docLines.unshift(line.substring(1).trim());
    } else if (line.startsWith('/**')) {
      docLines.unshift(line.substring(3).trim());
      break;
    } else if (line === '') {
      continue;
    } else {
      break;
    }
  }
  
  return docLines.join(' ').trim();
}

function findDuplicateTypes(types) {
  const duplicates = [];
  const typeGroups = new Map();
  
  // Group types by name
  for (const type of types) {
    if (!typeGroups.has(type.name)) {
      typeGroups.set(type.name, []);
    }
    typeGroups.get(type.name).push(type);
  }
  
  // Find groups with multiple definitions
  for (const [name, definitions] of typeGroups) {
    if (definitions.length > 1) {
      const uniqueDefinitions = getUniqueDefinitions(definitions);
      
      if (uniqueDefinitions.length > 1) {
        duplicates.push({
          name,
          definitions: uniqueDefinitions,
          severity: assessDuplicateSeverity(uniqueDefinitions),
          consolidationStrategy: suggestConsolidationStrategy(uniqueDefinitions),
        });
      }
    }
  }
  
  return duplicates;
}

function findSimilarTypes(types) {
  const similarities = [];
  
  for (let i = 0; i < types.length; i++) {
    for (let j = i + 1; j < types.length; j++) {
      const type1 = types[i];
      const type2 = types[j];
      
      if (type1.name !== type2.name && type1.type === type2.type) {
        const similarity = calculateSimilarity(type1, type2);
        
        if (similarity.score > 0.7) {
          similarities.push({
            type1: type1.name,
            type2: type2.name,
            similarity,
            consolidationPotential: assessConsolidationPotential(type1, type2, similarity),
          });
        }
      }
    }
  }
  
  return similarities;
}

function calculateSimilarity(type1, type2) {
  if (type1.type !== type2.type) {
    return { score: 0, commonProperties: [], differences: [] };
  }
  
  const props1 = type1.properties;
  const props2 = type2.properties;
  
  const commonProperties = [];
  const differences = [];
  
  // Find common properties
  for (const prop1 of props1) {
    const matchingProp = props2.find(p => p.name === prop1.name);
    if (matchingProp) {
      if (prop1.type === matchingProp.type) {
        commonProperties.push(prop1.name);
      } else {
        differences.push(`${prop1.name}: ${prop1.type} vs ${matchingProp.type}`);
      }
    } else {
      differences.push(`${prop1.name} only in ${type1.name}`);
    }
  }
  
  // Find properties only in type2
  for (const prop2 of props2) {
    if (!props1.find(p => p.name === prop2.name)) {
      differences.push(`${prop2.name} only in ${type2.name}`);
    }
  }
  
  const totalProperties = Math.max(props1.length, props2.length);
  const score = totalProperties > 0 ? commonProperties.length / totalProperties : 0;
  
  return { score, commonProperties, differences };
}

function getUniqueDefinitions(definitions) {
  const unique = [];
  const seen = new Set();
  
  for (const def of definitions) {
    const key = `${def.type}:${def.body}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(def);
    }
  }
  
  return unique;
}

function assessDuplicateSeverity(definitions) {
  const hasDeprecated = definitions.some(d => d.isDeprecated);
  if (hasDeprecated) return 'low';
  
  const bodies = definitions.map(d => d.body);
  const uniqueBodies = new Set(bodies);
  
  if (uniqueBodies.size > 1) return 'high';
  return 'medium';
}

function suggestConsolidationStrategy(definitions) {
  const hasDeprecated = definitions.some(d => d.isDeprecated);
  
  if (hasDeprecated) {
    return {
      action: 'remove_deprecated',
      targetFile: definitions.find(d => !d.isDeprecated)?.filePath || definitions[0].filePath,
      description: 'Remove deprecated definitions and keep the active one',
    };
  }
  
  const v2Definition = definitions.find(d => d.filePath.includes('battle-v2'));
  if (v2Definition) {
    return {
      action: 'prefer_v2',
      targetFile: v2Definition.filePath,
      description: 'Consolidate to battle-v2 types and update imports',
    };
  }
  
  return {
    action: 'merge',
    targetFile: definitions[0].filePath,
    description: 'Merge definitions and update all imports',
  };
}

function assessConsolidationPotential(type1, type2, similarity) {
  if (similarity.score > 0.9) return 'high';
  if (similarity.score > 0.8) return 'medium';
  return 'low';
}

function identifyConsolidationOpportunities(types) {
  const opportunities = [];
  
  // Look for deprecated types that can be removed
  const deprecatedTypes = types.filter(t => t.isDeprecated);
  for (const deprecated of deprecatedTypes) {
    const replacement = types.find(t => 
      !t.isDeprecated && 
      t.name === deprecated.name && 
      t.filePath !== deprecated.filePath
    );
    
    if (replacement) {
      opportunities.push({
        type: 'remove_deprecated',
        description: `Remove deprecated ${deprecated.name} from ${path.basename(deprecated.filePath)}`,
        affectedTypes: [deprecated.name],
        targetFile: replacement.filePath,
        estimatedImpact: 'low',
      });
    }
  }
  
  // Look for battle vs battle-v2 consolidation opportunities
  const battleTypes = types.filter(t => t.filePath.includes('battle.ts'));
  const battleV2Types = types.filter(t => t.filePath.includes('battle-v2.ts'));
  
  for (const battleType of battleTypes) {
    const v2Equivalent = battleV2Types.find(t => t.name === battleType.name);
    if (v2Equivalent && !battleType.isDeprecated) {
      opportunities.push({
        type: 'consolidate_versions',
        description: `Consolidate ${battleType.name} between battle.ts and battle-v2.ts`,
        affectedTypes: [battleType.name],
        targetFile: v2Equivalent.filePath,
        estimatedImpact: 'medium',
      });
    }
  }
  
  return opportunities;
}

function generateRecommendations(duplicates, similarities, opportunities) {
  const recommendations = [];
  
  // Recommendations for duplicates
  for (const duplicate of duplicates) {
    recommendations.push({
      priority: duplicate.severity === 'high' ? 'high' : 'medium',
      type: 'remove_duplicate',
      description: `Resolve duplicate type definition: ${duplicate.name}`,
      action: duplicate.consolidationStrategy.description,
      affectedFiles: duplicate.definitions.map(d => d.filePath),
    });
  }
  
  // Recommendations for consolidation opportunities
  for (const opportunity of opportunities) {
    recommendations.push({
      priority: opportunity.estimatedImpact === 'high' ? 'high' : 'medium',
      type: 'consolidate',
      description: opportunity.description,
      action: `Move to ${path.basename(opportunity.targetFile)}`,
      affectedFiles: [opportunity.targetFile],
    });
  }
  
  // Recommendations for similar types
  for (const similar of similarities) {
    if (similar.consolidationPotential === 'high') {
      recommendations.push({
        priority: 'low',
        type: 'consider_merge',
        description: `Consider merging similar types: ${similar.type1} and ${similar.type2}`,
        action: `Evaluate if these types can be consolidated`,
        affectedFiles: [],
      });
    }
  }
  
  return recommendations;
}

// Run the test
testTypeAnalysis();