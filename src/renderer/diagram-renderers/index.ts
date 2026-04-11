import type { Element } from '../../models/board.js';
import type { Size } from '../../models/board.js';

export interface DiagramRenderer {
  render(element: Element): string;
  calculateSize(element: Element): Size;
}

// Import all renderers
import * as architecture from './architecture.js';
import * as dbSchema from './db-schema.js';
import * as flowChart from './flow-chart.js';
import * as pageMap from './page-map.js';
import * as apiMap from './api-map.js';
import * as sequence from './sequence.js';
import * as fileTree from './file-tree.js';
import * as dependencyGraph from './dependency-graph.js';
import * as securityMap from './security-map.js';
import * as cicdPipeline from './cicd-pipeline.js';
import * as environmentMap from './environment-map.js';
import * as permissionMatrix from './permission-matrix.js';
import * as techStack from './tech-stack.js';
import * as note from './note.js';
import * as textBlock from './text-block.js';
import * as image from './image.js';
import * as badge from './badge.js';

const renderers: Record<string, DiagramRenderer> = {
  architecture_diagram: architecture,
  db_schema: dbSchema,
  flow_chart: flowChart,
  page_map: pageMap,
  api_map: apiMap,
  sequence_diagram: sequence,
  file_tree: fileTree,
  dependency_graph: dependencyGraph,
  security_layer_map: securityMap,
  cicd_pipeline: cicdPipeline,
  environment_map: environmentMap,
  permission_matrix: permissionMatrix,
  tech_stack: techStack,
  note: note,
  text_block: textBlock,
  image: image,
  badge: badge,
};

// Fallback renderer for unknown types
const fallbackRenderer: DiagramRenderer = {
  render(element: Element): string {
    return `<text x="10" y="20" fill="hsl(155 5% 55%)" font-size="12" font-family="'JetBrains Mono',monospace">${element.type}: ${element.name}</text>`;
  },
  calculateSize(): Size {
    return { width: 300, height: 100 };
  },
};

export function getRenderer(type: string): DiagramRenderer {
  return renderers[type] || fallbackRenderer;
}
