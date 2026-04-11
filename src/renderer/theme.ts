import type { SectionCategory } from '../models/board.js';

export interface Theme {
  name: 'dark' | 'light';
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  foreground: string;
  foregroundMuted: string;
  primary: string;
  primaryHover: string;
  accent: string;
  border: string;
  borderHover: string;
  glow: string;
  statusRunning: string;
  statusPending: string;
  statusError: string;
  statusIdle: string;
}

export const darkTheme: Theme = {
  name: 'dark',
  background: 'hsl(160 15% 7%)',
  backgroundSecondary: 'hsl(160 10% 10%)',
  backgroundTertiary: 'hsl(160 8% 13%)',
  foreground: 'hsl(0 0% 95%)',
  foregroundMuted: 'hsl(155 5% 55%)',
  primary: 'hsl(155 65% 30%)',
  primaryHover: 'hsl(155 60% 35%)',
  accent: 'hsl(152 65% 55%)',
  border: 'hsl(160 8% 18%)',
  borderHover: 'hsl(155 15% 25%)',
  glow: 'hsl(152 65% 55%)',
  statusRunning: 'hsl(152 60% 42%)',
  statusPending: 'hsl(38 92% 50%)',
  statusError: 'hsl(0 85% 55%)',
  statusIdle: 'hsl(155 5% 45%)',
};

export const lightTheme: Theme = {
  name: 'light',
  background: 'hsl(150 10% 97%)',
  backgroundSecondary: 'hsl(150 8% 95%)',
  backgroundTertiary: 'hsl(150 6% 92%)',
  foreground: 'hsl(160 20% 9%)',
  foregroundMuted: 'hsl(155 8% 45%)',
  primary: 'hsl(155 60% 28%)',
  primaryHover: 'hsl(155 55% 33%)',
  accent: 'hsl(152 55% 45%)',
  border: 'hsl(150 8% 88%)',
  borderHover: 'hsl(155 12% 78%)',
  glow: 'hsl(152 55% 45%)',
  statusRunning: 'hsl(152 60% 42%)',
  statusPending: 'hsl(38 92% 50%)',
  statusError: 'hsl(0 85% 55%)',
  statusIdle: 'hsl(155 5% 45%)',
};

export function getTheme(name: 'dark' | 'light'): Theme {
  return name === 'dark' ? darkTheme : lightTheme;
}

// Section category colors (dark theme)
const categoryColors: Record<SectionCategory, { primary: string; bg: string; border: string }> = {
  system_structure: { primary: 'hsl(200 60% 50%)', bg: 'hsl(200 40% 12%)', border: 'hsl(200 40% 25%)' },
  data_layer: { primary: 'hsl(152 55% 45%)', bg: 'hsl(152 35% 12%)', border: 'hsl(152 35% 25%)' },
  api_integration: { primary: 'hsl(280 45% 55%)', bg: 'hsl(280 25% 12%)', border: 'hsl(280 25% 25%)' },
  security: { primary: 'hsl(0 60% 55%)', bg: 'hsl(0 35% 12%)', border: 'hsl(0 35% 25%)' },
  infrastructure: { primary: 'hsl(35 80% 55%)', bg: 'hsl(35 50% 12%)', border: 'hsl(35 50% 25%)' },
  user_flows: { primary: 'hsl(180 40% 50%)', bg: 'hsl(180 25% 12%)', border: 'hsl(180 25% 25%)' },
  processes: { primary: 'hsl(320 40% 55%)', bg: 'hsl(320 25% 12%)', border: 'hsl(320 25% 25%)' },
  project_meta: { primary: 'hsl(155 5% 45%)', bg: 'hsl(155 5% 12%)', border: 'hsl(155 5% 25%)' },
};

export function getCategoryColor(category: SectionCategory): { primary: string; bg: string; border: string } {
  return categoryColors[category] || categoryColors.project_meta;
}

// Component type colors (architecture diagrams)
const componentColors: Record<string, { fill: string; border: string; glow: string }> = {
  service: { fill: 'hsl(200 50% 15%)', border: 'hsl(200 60% 50%)', glow: 'hsl(200 60% 50% / 0.15)' },
  database: { fill: 'hsl(152 40% 15%)', border: 'hsl(152 55% 45%)', glow: 'hsl(152 55% 45% / 0.15)' },
  queue: { fill: 'hsl(35 50% 15%)', border: 'hsl(35 80% 55%)', glow: 'hsl(35 80% 55% / 0.15)' },
  cache: { fill: 'hsl(0 40% 15%)', border: 'hsl(0 60% 55%)', glow: 'hsl(0 60% 55% / 0.15)' },
  client: { fill: 'hsl(280 30% 15%)', border: 'hsl(280 45% 55%)', glow: 'hsl(280 45% 55% / 0.15)' },
  external: { fill: 'hsl(155 5% 15%)', border: 'hsl(155 5% 45%)', glow: 'none' },
  gateway: { fill: 'hsl(180 30% 15%)', border: 'hsl(180 40% 50%)', glow: 'hsl(180 40% 50% / 0.15)' },
  worker: { fill: 'hsl(320 30% 15%)', border: 'hsl(320 40% 55%)', glow: 'hsl(320 40% 55% / 0.15)' },
  storage: { fill: 'hsl(152 35% 15%)', border: 'hsl(152 50% 40%)', glow: 'hsl(152 50% 40% / 0.15)' },
  cdn: { fill: 'hsl(35 45% 15%)', border: 'hsl(35 70% 50%)', glow: 'hsl(35 70% 50% / 0.15)' },
  load_balancer: { fill: 'hsl(180 35% 15%)', border: 'hsl(180 45% 45%)', glow: 'hsl(180 45% 45% / 0.15)' },
  container: { fill: 'transparent', border: 'hsl(155 5% 30%)', glow: 'none' },
};

export function getComponentColor(type: string): { fill: string; border: string; glow: string } {
  return componentColors[type] || componentColors.service;
}

// Note colors
const noteColors: Record<string, { bg: string; border: string; text: string }> = {
  yellow: { bg: 'hsl(38 50% 15%)', border: 'hsl(38 70% 45%)', text: 'hsl(38 60% 70%)' },
  blue: { bg: 'hsl(210 40% 15%)', border: 'hsl(210 50% 45%)', text: 'hsl(210 40% 70%)' },
  green: { bg: 'hsl(152 40% 15%)', border: 'hsl(152 50% 40%)', text: 'hsl(152 40% 70%)' },
  pink: { bg: 'hsl(340 35% 15%)', border: 'hsl(340 45% 50%)', text: 'hsl(340 40% 70%)' },
  orange: { bg: 'hsl(25 50% 15%)', border: 'hsl(25 70% 50%)', text: 'hsl(25 55% 70%)' },
  purple: { bg: 'hsl(280 35% 15%)', border: 'hsl(280 40% 50%)', text: 'hsl(280 35% 70%)' },
};

export function getNoteColor(color: string): { bg: string; border: string; text: string } {
  return noteColors[color] || noteColors.yellow;
}

// API method badge colors
const methodColors: Record<string, { bg: string; text: string }> = {
  GET: { bg: 'hsl(152 40% 15%)', text: 'hsl(152 55% 55%)' },
  POST: { bg: 'hsl(210 40% 15%)', text: 'hsl(210 50% 55%)' },
  PUT: { bg: 'hsl(35 45% 15%)', text: 'hsl(35 70% 55%)' },
  PATCH: { bg: 'hsl(50 45% 15%)', text: 'hsl(50 70% 55%)' },
  DELETE: { bg: 'hsl(0 40% 15%)', text: 'hsl(0 60% 55%)' },
  WS: { bg: 'hsl(280 35% 15%)', text: 'hsl(280 45% 55%)' },
  SSE: { bg: 'hsl(180 35% 15%)', text: 'hsl(180 45% 55%)' },
  GRAPHQL: { bg: 'hsl(320 35% 15%)', text: 'hsl(320 40% 55%)' },
};

export function getMethodColor(method: string): { bg: string; text: string } {
  return methodColors[method] || methodColors.GET;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'current': return 'hsl(152 60% 42%)';
    case 'stale': return 'hsl(38 92% 50%)';
    case 'deprecated': return 'hsl(0 85% 55%)';
    default: return 'hsl(155 5% 45%)';
  }
}
