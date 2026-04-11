import type { Board, Element } from '../models/board.js';
import type {
  ArchitectureDiagramData,
  DbSchemaData,
  FlowChartData,
  SequenceDiagramData,
  DependencyGraphData,
  ApiMapData,
  TechStackData,
  PermissionMatrixData,
  FileTreeData,
  NoteData,
  TextBlockData,
  SecurityLayerMapData,
  CicdPipelineData,
  EnvironmentMapData,
  PageMapData,
} from '../models/elements.js';

export function elementToMermaid(element: Element): string | null {
  switch (element.type) {
    case 'architecture_diagram':
      return architectureToMermaid(element.data as ArchitectureDiagramData);
    case 'flow_chart':
      return flowChartToMermaid(element.data as FlowChartData);
    case 'sequence_diagram':
      return sequenceToMermaid(element.data as SequenceDiagramData);
    case 'db_schema':
      return dbSchemaToMermaid(element.data as DbSchemaData);
    case 'dependency_graph':
      return dependencyGraphToMermaid(element.data as DependencyGraphData);
    default:
      return null;
  }
}

function architectureToMermaid(data: ArchitectureDiagramData): string {
  const lines: string[] = ['graph TD'];
  if (data.layers && data.layers.length > 0) {
    for (const layer of data.layers) {
      lines.push(`  subgraph ${sanitizeMermaidId(layer.name)}["${layer.name}"]`);
      for (const compId of layer.component_ids) {
        const comp = data.components.find(c => c.id === compId);
        if (comp) lines.push(`    ${sanitizeMermaidId(comp.id)}["${comp.name}${comp.technology ? `\\n(${comp.technology})` : ''}"]`);
      }
      lines.push('  end');
    }
  } else {
    for (const comp of data.components) {
      lines.push(`  ${sanitizeMermaidId(comp.id)}["${comp.name}${comp.technology ? `\\n(${comp.technology})` : ''}"]`);
    }
  }
  for (const conn of data.connections) {
    const label = conn.label ? `|${conn.label}|` : '';
    const arrow = conn.async ? '-.->' : '-->';
    lines.push(`  ${sanitizeMermaidId(conn.from)} ${arrow}${label} ${sanitizeMermaidId(conn.to)}`);
  }
  return lines.join('\n');
}

function flowChartToMermaid(data: FlowChartData): string {
  const lines: string[] = ['flowchart TD'];
  for (const node of data.nodes) {
    const shape = getFlowNodeShape(node.type, node.name);
    lines.push(`  ${sanitizeMermaidId(node.id)}${shape}`);
  }
  for (const edge of data.edges) {
    const label = edge.label ? `|${edge.label}|` : '';
    lines.push(`  ${sanitizeMermaidId(edge.from)} -->${label} ${sanitizeMermaidId(edge.to)}`);
  }
  return lines.join('\n');
}

function getFlowNodeShape(type: string, name: string): string {
  switch (type) {
    case 'start':
    case 'end':
      return `(["${name}"])`;
    case 'decision':
      return `{"${name}"}`;
    case 'io':
      return `[/"${name}"/]`;
    case 'subprocess':
      return `[["${name}"]]`;
    default:
      return `["${name}"]`;
  }
}

function sequenceToMermaid(data: SequenceDiagramData): string {
  const lines: string[] = ['sequenceDiagram'];
  for (const actor of data.actors) {
    lines.push(`  participant ${sanitizeMermaidId(actor.id)} as ${actor.name}`);
  }
  const sorted = [...data.messages].sort((a, b) => a.order - b.order);
  for (const msg of sorted) {
    const arrow = msg.type === 'async' ? '-->>' : msg.type === 'response' ? '-->>-' : '->>';
    lines.push(`  ${sanitizeMermaidId(msg.from)}${arrow}${sanitizeMermaidId(msg.to)}: ${msg.label}`);
    if (msg.note) {
      lines.push(`  Note over ${sanitizeMermaidId(msg.from)},${sanitizeMermaidId(msg.to)}: ${msg.note}`);
    }
  }
  return lines.join('\n');
}

function dbSchemaToMermaid(data: DbSchemaData): string {
  const lines: string[] = ['erDiagram'];
  for (const table of data.tables) {
    lines.push(`  ${sanitizeMermaidId(table.name)} {`);
    for (const col of table.columns) {
      const pk = col.primary_key ? 'PK' : '';
      lines.push(`    ${col.type.replace(/[^a-zA-Z0-9_]/g, '_')} ${col.name} ${pk}`.trimEnd());
    }
    lines.push('  }');
  }
  for (const rel of data.relationships) {
    const relSymbol = rel.type === 'one_to_one' ? '||--||' : rel.type === 'one_to_many' ? '||--o{' : '}o--o{';
    const label = rel.label || `${rel.from_column} -> ${rel.to_column}`;
    lines.push(`  ${sanitizeMermaidId(rel.from_table)} ${relSymbol} ${sanitizeMermaidId(rel.to_table)} : "${label}"`);
  }
  return lines.join('\n');
}

function dependencyGraphToMermaid(data: DependencyGraphData): string {
  const lines: string[] = ['graph LR'];
  for (const node of data.nodes) {
    const label = node.version ? `${node.name}@${node.version}` : node.name;
    lines.push(`  ${sanitizeMermaidId(node.id)}["${label}"]`);
  }
  for (const edge of data.edges) {
    const style = edge.type === 'peer' ? '-.->' : '-->';
    lines.push(`  ${sanitizeMermaidId(edge.from)} ${style} ${sanitizeMermaidId(edge.to)}`);
  }
  return lines.join('\n');
}

function sanitizeMermaidId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

// --- Markdown export ---

export function boardToMarkdown(board: Board): string {
  const lines: string[] = [];
  lines.push(`# ${board.name}`);
  lines.push('');
  if (board.description) {
    lines.push(board.description);
    lines.push('');
  }
  lines.push(`**Project:** \`${board.project_path}\``);
  lines.push(`**Theme:** ${board.theme} | **Version:** ${board.version} | **Updated:** ${board.updated_at}`);
  if (board.tags.length) lines.push(`**Tags:** ${board.tags.join(', ')}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const section of board.sections) {
    if (section.parent_section_id) continue; // Render only top-level; children inline
    renderSectionMarkdown(section, board.sections, lines, 2);
  }

  return lines.join('\n');
}

function renderSectionMarkdown(section: import('../models/board.js').Section, allSections: import('../models/board.js').Section[], lines: string[], headingLevel: number): void {
  const heading = '#'.repeat(headingLevel);
  lines.push(`${heading} ${section.title}`);
  lines.push('');
  if (section.description) {
    lines.push(section.description);
    lines.push('');
  }

  for (const element of section.elements) {
    lines.push(`${heading}# ${element.name}`);
    lines.push('');
    if (element.description) {
      lines.push(element.description);
      lines.push('');
    }

    const mermaid = elementToMermaid(element);
    if (mermaid) {
      lines.push('```mermaid');
      lines.push(mermaid);
      lines.push('```');
      lines.push('');
    } else {
      renderElementMarkdown(element, lines);
    }
  }

  // Render child sections
  const children = allSections.filter(s => s.parent_section_id === section.id);
  for (const child of children) {
    renderSectionMarkdown(child, allSections, lines, headingLevel + 1);
  }
}

function renderElementMarkdown(element: Element, lines: string[]): void {
  const data = element.data as unknown;

  switch (element.type) {
    case 'tech_stack': {
      const d = data as TechStackData;
      for (const cat of d.categories) {
        lines.push(`**${cat.name}:**`);
        for (const tech of cat.technologies) {
          lines.push(`- ${tech.name}${tech.version ? ` v${tech.version}` : ''} — ${tech.purpose}`);
        }
        lines.push('');
      }
      break;
    }
    case 'api_map': {
      const d = data as ApiMapData;
      if (d.base_url) lines.push(`**Base URL:** \`${d.base_url}\``);
      for (const group of d.groups) {
        lines.push(`**${group.name}:**`);
        lines.push('| Method | Path | Description | Auth |');
        lines.push('|---|---|---|---|');
        for (const ep of group.endpoints) {
          lines.push(`| \`${ep.method}\` | \`${ep.path}\` | ${ep.description} | ${ep.auth ? 'Yes' : 'No'} |`);
        }
        lines.push('');
      }
      break;
    }
    case 'permission_matrix': {
      const d = data as PermissionMatrixData;
      const header = `| Resource | ${d.roles.join(' | ')} |`;
      const divider = `|---|${d.roles.map(() => '---').join('|')}|`;
      lines.push(header);
      lines.push(divider);
      for (const res of d.resources) {
        const cells = d.roles.map(role => (res.permissions[role] || []).join(', ') || '—');
        lines.push(`| ${res.name} | ${cells.join(' | ')} |`);
      }
      lines.push('');
      break;
    }
    case 'file_tree': {
      const d = data as FileTreeData;
      lines.push('```');
      lines.push(`${d.root}/`);
      for (const entry of d.entries) {
        const prefix = entry.type === 'directory' ? '📁 ' : '📄 ';
        const desc = entry.description ? ` — ${entry.description}` : '';
        lines.push(`  ${prefix}${entry.path}${desc}`);
      }
      lines.push('```');
      lines.push('');
      break;
    }
    case 'note': {
      const d = data as NoteData;
      lines.push(`> ${d.content}`);
      lines.push('');
      break;
    }
    case 'text_block': {
      const d = data as TextBlockData;
      lines.push(d.content);
      lines.push('');
      break;
    }
    case 'security_layer_map': {
      const d = data as SecurityLayerMapData;
      lines.push('| Layer | Level | Technology | Description |');
      lines.push('|---|---|---|---|');
      for (const layer of [...d.layers].sort((a, b) => a.level - b.level)) {
        lines.push(`| ${layer.name} | ${layer.level} | ${layer.technology || '—'} | ${layer.description || '—'} |`);
      }
      lines.push('');
      break;
    }
    case 'cicd_pipeline': {
      const d = data as CicdPipelineData;
      lines.push(`**Trigger:** ${d.trigger}${d.platform ? ` (${d.platform})` : ''}`);
      for (const stage of d.stages) {
        lines.push(`- **${stage.name}**${stage.environment ? ` [${stage.environment}]` : ''}`);
        for (const step of stage.steps) {
          lines.push(`  - ${step.name}${step.command ? `: \`${step.command}\`` : ''}`);
        }
      }
      lines.push('');
      break;
    }
    case 'environment_map': {
      const d = data as EnvironmentMapData;
      for (const env of d.environments) {
        lines.push(`**${env.name}**${env.url ? ` — ${env.url}` : ''}`);
        if (env.infrastructure) lines.push(`  Infrastructure: ${env.infrastructure}`);
        for (const svc of env.services) {
          lines.push(`  - ${svc.name}${svc.replicas ? ` (×${svc.replicas})` : ''}`);
        }
        lines.push('');
      }
      break;
    }
    case 'page_map': {
      const d = data as PageMapData;
      lines.push('| Page | Route | Auth | Roles |');
      lines.push('|---|---|---|---|');
      for (const page of d.pages) {
        lines.push(`| ${page.name} | \`${page.route}\` | ${page.auth_required ? 'Yes' : 'No'} | ${(page.roles || []).join(', ') || '—'} |`);
      }
      lines.push('');
      break;
    }
    default: {
      // Generic: dump key-value pairs
      lines.push('```json');
      lines.push(JSON.stringify(data, null, 2));
      lines.push('```');
      lines.push('');
    }
  }
}

export function boardToMermaid(board: Board): string {
  const blocks: string[] = [];
  blocks.push(`%% ${board.name}`);
  blocks.push('');

  for (const section of board.sections) {
    for (const element of section.elements) {
      const mermaid = elementToMermaid(element);
      if (mermaid) {
        blocks.push(`%% ${element.name} (${element.type})`);
        blocks.push(mermaid);
        blocks.push('');
      }
    }
  }

  return blocks.join('\n');
}
