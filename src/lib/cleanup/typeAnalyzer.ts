import * as fs from 'fs';
import * as path from 'path';

/**
 * Analyzer for identifying duplicate and similar type definitions
 */
export class TypeAnalyzer {
  
  /**
   * Analyze type definitions across multiple files
   */
  async analyzeTypes(filePaths: string[]): Promise<TypeAnalysisResult> {
    const typeDefinitions: TypeDefinition[] = [];
    
    // Extract types from each file
    for (const filePath of filePaths) {
      const fileTypes = await this.extractTypesFromFile(filePath);
      typeDefinitions.push(...fileTypes);
    }
    
    // Find duplicates and similarities
    const duplicates = this.findDuplicateTypes(typeDefinitions);
    const similarities = this.findSimilarTypes(typeDefinitions);
    const consolidationOpportunities = this.identifyConsolidationOpportunities(typeDefinitions);
    
    return {
      totalTypes: typeDefinitions.length,
      typeDefinitions,
      duplicates,
      similarities,
      consolidationOpportunities,
      recommendations: this.generateRecommendations(duplicates, similarities, consolidationOpportunities),
    };
  }

  /**
   * Extract type definitions from a TypeScript file
   */
  private async extractTypesFromFile(filePath: string): Promise<TypeDefinition[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const types: TypeDefinition[] = [];
      
      // Extract interfaces
      const interfaceMatches = content.matchAll(/export\s+interface\s+(\w+)(?:\s+extends\s+[\w\s,<>]+)?\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs);
      for (const match of interfaceMatches) {
        const name = match[1];
        const body = match[2];
        const properties = this.extractProperties(body);
        
        types.push({
          name,
          type: 'interface',
          filePath,
          body: body.trim(),
          properties,
          isDeprecated: this.isDeprecated(match[0]),
          documentation: this.extractDocumentation(content, match.index || 0),
        });
      }
      
      // Extract type aliases
      const typeMatches = content.matchAll(/export\s+type\s+(\w+)\s*=\s*([^;]+);/gs);
      for (const match of typeMatches) {
        const name = match[1];
        const definition = match[2].trim();
        
        types.push({
          name,
          type: 'type',
          filePath,
          body: definition,
          properties: [],
          isDeprecated: this.isDeprecated(match[0]),
          documentation: this.extractDocumentation(content, match.index || 0),
        });
      }
      
      // Extract enums
      const enumMatches = content.matchAll(/export\s+enum\s+(\w+)\s*\{([^}]+)\}/gs);
      for (const match of enumMatches) {
        const name = match[1];
        const body = match[2];
        const enumValues = this.extractEnumValues(body);
        
        types.push({
          name,
          type: 'enum',
          filePath,
          body: body.trim(),
          properties: enumValues.map(value => ({ name: value, type: 'enum_value' })),
          isDeprecated: this.isDeprecated(match[0]),
          documentation: this.extractDocumentation(content, match.index || 0),
        });
      }
      
      return types;
    } catch (error) {
      console.warn(`Error extracting types from ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Extract properties from interface body
   */
  private extractProperties(body: string): TypeProperty[] {
    const properties: TypeProperty[] = [];
    
    // Simple property extraction (handles basic cases)
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

  /**
   * Extract enum values
   */
  private extractEnumValues(body: string): string[] {
    const values: string[] = [];
    const valuePattern = /(\w+)\s*(?:=\s*[^,\n]+)?/g;
    let match;
    
    while ((match = valuePattern.exec(body)) !== null) {
      values.push(match[1]);
    }
    
    return values;
  }

  /**
   * Check if type definition is marked as deprecated
   */
  private isDeprecated(definition: string): boolean {
    return definition.includes('@deprecated') || definition.includes('deprecated');
  }

  /**
   * Extract documentation comment before type definition
   */
  private extractDocumentation(content: string, position: number): string {
    const beforePosition = content.substring(0, position);
    const lines = beforePosition.split('\n');
    
    // Look for JSDoc comment before the type
    const docLines: string[] = [];
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

  /**
   * Find exact duplicate types
   */
  private findDuplicateTypes(types: TypeDefinition[]): DuplicateType[] {
    const duplicates: DuplicateType[] = [];
    const typeGroups = new Map<string, TypeDefinition[]>();
    
    // Group types by name
    for (const type of types) {
      if (!typeGroups.has(type.name)) {
        typeGroups.set(type.name, []);
      }
      typeGroups.get(type.name)!.push(type);
    }
    
    // Find groups with multiple definitions
    for (const [name, definitions] of typeGroups) {
      if (definitions.length > 1) {
        // Check if they're actually different or just in different files
        const uniqueDefinitions = this.getUniqueDefinitions(definitions);
        
        if (uniqueDefinitions.length > 1) {
          duplicates.push({
            name,
            definitions: uniqueDefinitions,
            severity: this.assessDuplicateSeverity(uniqueDefinitions),
            consolidationStrategy: this.suggestConsolidationStrategy(uniqueDefinitions),
          });
        }
      }
    }
    
    return duplicates;
  }

  /**
   * Find similar types that might be consolidatable
   */
  private findSimilarTypes(types: TypeDefinition[]): SimilarType[] {
    const similarities: SimilarType[] = [];
    
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const type1 = types[i];
        const type2 = types[j];
        
        if (type1.name !== type2.name && type1.type === type2.type) {
          const similarity = this.calculateSimilarity(type1, type2);
          
          if (similarity.score > 0.7) { // 70% similarity threshold
            similarities.push({
              type1: type1.name,
              type2: type2.name,
              similarity,
              consolidationPotential: this.assessConsolidationPotential(type1, type2, similarity),
            });
          }
        }
      }
    }
    
    return similarities;
  }

  /**
   * Calculate similarity between two types
   */
  private calculateSimilarity(type1: TypeDefinition, type2: TypeDefinition): SimilarityScore {
    if (type1.type !== type2.type) {
      return { score: 0, commonProperties: [], differences: [] };
    }
    
    const props1 = type1.properties;
    const props2 = type2.properties;
    
    const commonProperties: string[] = [];
    const differences: string[] = [];
    
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

  /**
   * Get unique type definitions (remove exact duplicates)
   */
  private getUniqueDefinitions(definitions: TypeDefinition[]): TypeDefinition[] {
    const unique: TypeDefinition[] = [];
    const seen = new Set<string>();
    
    for (const def of definitions) {
      const key = `${def.type}:${def.body}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(def);
      }
    }
    
    return unique;
  }

  /**
   * Assess severity of duplicate types
   */
  private assessDuplicateSeverity(definitions: TypeDefinition[]): 'low' | 'medium' | 'high' {
    // Check if any are deprecated
    const hasDeprecated = definitions.some(d => d.isDeprecated);
    if (hasDeprecated) return 'low';
    
    // Check if definitions are significantly different
    const bodies = definitions.map(d => d.body);
    const uniqueBodies = new Set(bodies);
    
    if (uniqueBodies.size > 1) return 'high';
    return 'medium';
  }

  /**
   * Suggest consolidation strategy for duplicates
   */
  private suggestConsolidationStrategy(definitions: TypeDefinition[]): ConsolidationStrategy {
    const hasDeprecated = definitions.some(d => d.isDeprecated);
    
    if (hasDeprecated) {
      return {
        action: 'remove_deprecated',
        targetFile: definitions.find(d => !d.isDeprecated)?.filePath || definitions[0].filePath,
        description: 'Remove deprecated definitions and keep the active one',
      };
    }
    
    // Prefer battle-v2 types over battle types
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

  /**
   * Assess consolidation potential for similar types
   */
  private assessConsolidationPotential(type1: TypeDefinition, type2: TypeDefinition, similarity: SimilarityScore): 'low' | 'medium' | 'high' {
    if (similarity.score > 0.9) return 'high';
    if (similarity.score > 0.8) return 'medium';
    return 'low';
  }

  /**
   * Identify consolidation opportunities
   */
  private identifyConsolidationOpportunities(types: TypeDefinition[]): ConsolidationOpportunity[] {
    const opportunities: ConsolidationOpportunity[] = [];
    
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

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    duplicates: DuplicateType[],
    similarities: SimilarType[],
    opportunities: ConsolidationOpportunity[]
  ): TypeRecommendation[] {
    const recommendations: TypeRecommendation[] = [];
    
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
}

// Type definitions for the analyzer
export interface TypeDefinition {
  name: string;
  type: 'interface' | 'type' | 'enum';
  filePath: string;
  body: string;
  properties: TypeProperty[];
  isDeprecated: boolean;
  documentation: string;
}

export interface TypeProperty {
  name: string;
  type: string;
  optional?: boolean;
}

export interface DuplicateType {
  name: string;
  definitions: TypeDefinition[];
  severity: 'low' | 'medium' | 'high';
  consolidationStrategy: ConsolidationStrategy;
}

export interface SimilarType {
  type1: string;
  type2: string;
  similarity: SimilarityScore;
  consolidationPotential: 'low' | 'medium' | 'high';
}

export interface SimilarityScore {
  score: number;
  commonProperties: string[];
  differences: string[];
}

export interface ConsolidationStrategy {
  action: 'remove_deprecated' | 'prefer_v2' | 'merge';
  targetFile: string;
  description: string;
}

export interface ConsolidationOpportunity {
  type: 'remove_deprecated' | 'consolidate_versions' | 'merge_similar';
  description: string;
  affectedTypes: string[];
  targetFile: string;
  estimatedImpact: 'low' | 'medium' | 'high';
}

export interface TypeRecommendation {
  priority: 'low' | 'medium' | 'high';
  type: 'remove_duplicate' | 'consolidate' | 'consider_merge';
  description: string;
  action: string;
  affectedFiles: string[];
}

export interface TypeAnalysisResult {
  totalTypes: number;
  typeDefinitions: TypeDefinition[];
  duplicates: DuplicateType[];
  similarities: SimilarType[];
  consolidationOpportunities: ConsolidationOpportunity[];
  recommendations: TypeRecommendation[];
}