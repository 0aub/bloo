import type { Board, SectionCategory } from '../models/board.js';

const ALL_CATEGORIES: SectionCategory[] = [
  'system_structure', 'data_layer', 'api_integration', 'security',
  'infrastructure', 'user_flows', 'processes', 'project_meta',
];

export interface HealthReport {
  coverage: {
    documented: string[];
    missing: string[];
    coverage_percent: number;
  };
  stale_elements: Array<{
    element_id: string;
    name: string;
    type: string;
    last_updated: string;
    days_since_update: number;
  }>;
  issues: Array<{
    type: 'broken_connection' | 'orphaned_element' | 'empty_section' | 'missing_cross_ref';
    description: string;
    element_ids: string[];
    suggestion: string;
  }>;
}

export function analyzeHealth(board: Board): HealthReport {
  const elementIds = new Set<string>();
  const categoriesWithContent = new Set<string>();
  const now = Date.now();

  // Collect data
  for (const section of board.sections) {
    if (section.elements.length > 0) {
      categoriesWithContent.add(section.category);
    }
    for (const element of section.elements) {
      elementIds.add(element.id);
    }
  }

  // Coverage
  const documented = ALL_CATEGORIES.filter(c => categoriesWithContent.has(c));
  const missing = ALL_CATEGORIES.filter(c => !categoriesWithContent.has(c));
  const coverage_percent = Math.round((documented.length / ALL_CATEGORIES.length) * 100);

  // Stale elements (>30 days since update)
  const stale_elements: HealthReport['stale_elements'] = [];
  for (const section of board.sections) {
    for (const element of section.elements) {
      const daysSince = Math.floor((now - new Date(element.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) {
        stale_elements.push({
          element_id: element.id,
          name: element.name,
          type: element.type,
          last_updated: element.updated_at,
          days_since_update: daysSince,
        });
      }
    }
  }

  // Issues
  const issues: HealthReport['issues'] = [];

  // Broken connections
  for (const conn of board.connections) {
    const broken: string[] = [];
    if (!elementIds.has(conn.from_element_id)) broken.push(conn.from_element_id);
    if (!elementIds.has(conn.to_element_id)) broken.push(conn.to_element_id);
    if (broken.length > 0) {
      issues.push({
        type: 'broken_connection',
        description: `Connection ${conn.id} references non-existent element(s): ${broken.join(', ')}`,
        element_ids: broken,
        suggestion: 'Remove this connection or update the element references',
      });
    }
  }

  // Empty sections
  for (const section of board.sections) {
    if (section.elements.length === 0) {
      issues.push({
        type: 'empty_section',
        description: `Section "${section.title}" has no elements`,
        element_ids: [],
        suggestion: 'Add documentation elements or remove this section',
      });
    }
  }

  // Elements with no cross-references (for major diagram types)
  const referencedElements = new Set<string>();
  for (const ref of board.cross_references) {
    referencedElements.add(ref.from_element_id);
    referencedElements.add(ref.to_element_id);
  }

  const majorTypes = new Set(['architecture_diagram', 'db_schema', 'api_map', 'security_layer_map']);
  for (const section of board.sections) {
    for (const element of section.elements) {
      if (majorTypes.has(element.type) && !referencedElements.has(element.id)) {
        issues.push({
          type: 'missing_cross_ref',
          description: `${element.type} "${element.name}" has no cross-references to other elements`,
          element_ids: [element.id],
          suggestion: 'Add cross-references to link this element with related documentation',
        });
      }
    }
  }

  return { coverage: { documented, missing, coverage_percent }, stale_elements, issues };
}
