import type { Board, Section, Element, LayoutType, SectionCategory, Position, Size } from '../models/board.js';

const SECTION_PADDING = 40;
const ELEMENT_SPACING = 40;
const SECTION_GAP = 50;
const COLUMN_GAP = 50;

// Category layout grid (2 columns)
const CATEGORY_ORDER: SectionCategory[][] = [
  ['system_structure', 'data_layer', 'security', 'user_flows'],
  ['project_meta', 'api_integration', 'infrastructure', 'processes'],
];

export function layoutBoard(board: Board): Board {
  const laid = { ...board, sections: board.sections.map(s => ({ ...s })) };

  // Layout elements within each section
  for (const section of laid.sections) {
    if (section.elements.length > 0) {
      layoutElements(section.elements, board.config.default_layout, section.size.width - SECTION_PADDING * 2);
    }
    // Auto-size section to contain its elements
    section.size = calculateSectionSize(section);
  }

  // Layout sections by category in a 2-column grid
  layoutSections(laid.sections);

  return laid;
}

function layoutSections(sections: Section[]): void {
  // Group by category
  const byCategory = new Map<string, Section[]>();
  for (const s of sections) {
    if (s.parent_section_id) continue; // skip child sections
    const arr = byCategory.get(s.category) || [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }

  const colWidths = [0, 0];
  const colHeights = [0, 0];

  for (let col = 0; col < 2; col++) {
    for (const category of CATEGORY_ORDER[col]) {
      const secs = byCategory.get(category) || [];
      for (const section of secs) {
        section.position = {
          x: col === 0 ? 0 : colWidths[0] + COLUMN_GAP,
          y: colHeights[col],
        };
        colWidths[col] = Math.max(colWidths[col], section.size.width);
        colHeights[col] += section.size.height + SECTION_GAP;
      }
    }
  }

  // Handle sections with categories not in the grid
  let extraY = Math.max(colHeights[0], colHeights[1]);
  for (const section of sections) {
    if (section.parent_section_id) continue;
    const inGrid = CATEGORY_ORDER.flat().includes(section.category);
    if (!inGrid) {
      section.position = { x: 0, y: extraY };
      extraY += section.size.height + SECTION_GAP;
    }
  }
}

export function layoutElements(elements: Element[], layout: LayoutType, containerWidth: number): void {
  switch (layout) {
    case 'grid':
      layoutGrid(elements, containerWidth);
      break;
    case 'horizontal':
      layoutHorizontal(elements);
      break;
    case 'vertical':
      layoutVertical(elements);
      break;
    case 'tree':
      layoutVertical(elements); // simplified tree = vertical
      break;
    case 'force':
      layoutForce(elements);
      break;
    case 'freeform':
    default:
      // Only position elements that have default (0,0) position
      layoutGrid(elements.filter(e => e.position.x === 0 && e.position.y === 0), containerWidth);
      break;
  }
}

function layoutGrid(elements: Element[], containerWidth: number): void {
  if (elements.length === 0) return;
  const maxElWidth = Math.max(...elements.map(e => e.size.width));
  const cols = Math.max(1, Math.floor((containerWidth + ELEMENT_SPACING) / (maxElWidth + ELEMENT_SPACING)));

  elements.forEach((el, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    el.position = {
      x: SECTION_PADDING + col * (el.size.width + ELEMENT_SPACING),
      y: SECTION_PADDING + 40 + row * (el.size.height + ELEMENT_SPACING), // 40 for section header
    };
  });
}

function layoutHorizontal(elements: Element[]): void {
  let x = SECTION_PADDING;
  for (const el of elements) {
    el.position = { x, y: SECTION_PADDING + 40 };
    x += el.size.width + ELEMENT_SPACING;
  }
}

function layoutVertical(elements: Element[]): void {
  let y = SECTION_PADDING + 40;
  for (const el of elements) {
    el.position = { x: SECTION_PADDING, y };
    y += el.size.height + ELEMENT_SPACING;
  }
}

function layoutForce(elements: Element[]): void {
  if (elements.length === 0) return;

  // Initialize positions in a circle
  const centerX = 400;
  const centerY = 300;
  const radius = Math.min(300, elements.length * 30);

  elements.forEach((el, i) => {
    const angle = (2 * Math.PI * i) / elements.length;
    el.position = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  // Simple spring simulation (100 iterations)
  for (let iter = 0; iter < 100; iter++) {
    const forces = elements.map(() => ({ fx: 0, fy: 0 }));

    // Repulsion between all pairs
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const dx = elements[j].position.x - elements[i].position.x;
        const dy = elements[j].position.y - elements[i].position.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const repulsion = 5000 / (dist * dist);
        const fx = (dx / dist) * repulsion;
        const fy = (dy / dist) * repulsion;
        forces[i].fx -= fx;
        forces[i].fy -= fy;
        forces[j].fx += fx;
        forces[j].fy += fy;
      }
    }

    // Gravity toward center
    for (let i = 0; i < elements.length; i++) {
      const dx = centerX - elements[i].position.x;
      const dy = centerY - elements[i].position.y;
      forces[i].fx += dx * 0.01;
      forces[i].fy += dy * 0.01;
    }

    // Apply forces with damping
    const damping = 0.9 - (iter / 100) * 0.5;
    for (let i = 0; i < elements.length; i++) {
      elements[i].position.x += forces[i].fx * damping;
      elements[i].position.y += forces[i].fy * damping;
    }
  }

  // Normalize to positive coordinates with padding
  const minX = Math.min(...elements.map(e => e.position.x));
  const minY = Math.min(...elements.map(e => e.position.y));
  for (const el of elements) {
    el.position.x -= minX - SECTION_PADDING;
    el.position.y -= minY - SECTION_PADDING - 40;
  }
}

function calculateSectionSize(section: Section): Size {
  if (section.elements.length === 0) {
    return { width: 600, height: 200 };
  }

  let maxX = 0;
  let maxY = 0;
  for (const el of section.elements) {
    maxX = Math.max(maxX, el.position.x + el.size.width);
    maxY = Math.max(maxY, el.position.y + el.size.height);
  }

  return {
    width: Math.max(600, maxX + SECTION_PADDING),
    height: Math.max(200, maxY + SECTION_PADDING),
  };
}
