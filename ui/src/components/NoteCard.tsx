interface Props {
  content: string;
  color?: string;
  priority?: string;
}

type ColorTriple = { bg: string; border: string; text: string };

const DARK_COLORS: Record<string, ColorTriple> = {
  yellow: { bg: 'hsl(38 50% 15%)', border: 'hsl(38 70% 45%)', text: 'hsl(38 60% 70%)' },
  blue:   { bg: 'hsl(210 40% 15%)', border: 'hsl(210 50% 45%)', text: 'hsl(210 40% 70%)' },
  green:  { bg: 'hsl(152 40% 15%)', border: 'hsl(152 50% 40%)', text: 'hsl(152 40% 70%)' },
  pink:   { bg: 'hsl(340 35% 15%)', border: 'hsl(340 45% 50%)', text: 'hsl(340 40% 70%)' },
  orange: { bg: 'hsl(25 50% 15%)', border: 'hsl(25 70% 50%)', text: 'hsl(25 55% 70%)' },
  purple: { bg: 'hsl(280 35% 15%)', border: 'hsl(280 40% 50%)', text: 'hsl(280 35% 70%)' },
  red:    { bg: 'hsl(0 40% 15%)', border: 'hsl(0 50% 45%)', text: 'hsl(0 40% 70%)' },
};

const LIGHT_COLORS: Record<string, ColorTriple> = {
  yellow: { bg: 'hsl(38 60% 96%)', border: 'hsl(38 70% 45%)', text: 'hsl(38 50% 30%)' },
  blue:   { bg: 'hsl(210 50% 96%)', border: 'hsl(210 50% 45%)', text: 'hsl(210 40% 30%)' },
  green:  { bg: 'hsl(152 40% 96%)', border: 'hsl(152 50% 40%)', text: 'hsl(152 40% 28%)' },
  pink:   { bg: 'hsl(340 40% 96%)', border: 'hsl(340 45% 50%)', text: 'hsl(340 40% 30%)' },
  orange: { bg: 'hsl(25 60% 96%)', border: 'hsl(25 70% 50%)', text: 'hsl(25 50% 30%)' },
  purple: { bg: 'hsl(280 35% 96%)', border: 'hsl(280 40% 50%)', text: 'hsl(280 35% 30%)' },
  red:    { bg: 'hsl(0 50% 96%)', border: 'hsl(0 50% 45%)', text: 'hsl(0 40% 30%)' },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  high:   { bg: 'hsl(0 60% 20%)', text: 'hsl(0 85% 65%)' },
  medium: { bg: 'hsl(38 50% 20%)', text: 'hsl(38 80% 65%)' },
  low:    { bg: 'hsl(152 40% 18%)', text: 'hsl(152 55% 60%)' },
};

function isLightMode(): boolean {
  return document.documentElement.classList.contains('light');
}

function resolveColor(color?: string): ColorTriple {
  const map = isLightMode() ? LIGHT_COLORS : DARK_COLORS;
  if (!color) return map.blue;
  return map[color.toLowerCase()] || map.blue;
}

interface ParsedNote {
  mode: 'kv' | 'numbered' | 'prose';
  kvPairs: Array<{ key: string; value: string }>;
  plainParts: string[];
  numberedParts: Array<{ num: string; text: string }>;
  proseText: string;
}

function parseContent(content: string): ParsedNote {
  // Match the HTML renderer's parsing logic
  const kvEntries = content.split(/(?<=\.)\s+/).filter(s => s.trim());
  const kvPairs: Array<{ key: string; value: string }> = [];
  const plainParts: string[] = [];

  for (const entry of kvEntries) {
    const ci = entry.indexOf(':');
    if (ci > 0 && ci < 35 && !entry.match(/^(If |When |For |The |This |That |No |Each |Also )/i)) {
      kvPairs.push({ key: entry.slice(0, ci).trim(), value: entry.slice(ci + 1).trim().replace(/\.$/, '') });
    } else {
      plainParts.push(entry.trim().replace(/\.$/, ''));
    }
  }

  if (kvPairs.length >= 2 && kvPairs.length >= plainParts.length) {
    return { mode: 'kv', kvPairs, plainParts, numberedParts: [], proseText: '' };
  }

  const numbered = content.match(/\(\d+\)/g);
  if (numbered && numbered.length >= 2) {
    const parts = content.split(/(?=\(\d+\)\s*)/).filter(s => s.trim());
    const numberedParts: Array<{ num: string; text: string }> = [];
    const prose: string[] = [];
    for (const p of parts) {
      const m = p.match(/^\((\d+)\)\s*(.*)/s);
      if (m) numberedParts.push({ num: m[1], text: m[2].trim().replace(/\.$/, '') });
      else prose.push(p.trim());
    }
    return { mode: 'numbered', kvPairs: [], plainParts: prose, numberedParts, proseText: '' };
  }

  return { mode: 'prose', kvPairs: [], plainParts: [], numberedParts: [], proseText: content };
}

export default function NoteCard({ content, color, priority }: Props) {
  const colors = resolveColor(color);
  const parsed = parseContent(content);
  const priorityColors = priority ? PRIORITY_COLORS[priority.toLowerCase()] : null;

  return (
    <div
      className="h-full overflow-auto"
      style={{
        background: colors.bg,
        borderLeft: `3px solid ${colors.border}`,
        borderRadius: '0 8px 8px 0',
        padding: '10px 14px',
        fontSize: 12,
        lineHeight: 1.6,
        color: colors.text,
      }}
    >
      {/* Priority badge */}
      {priority && priorityColors && (
        <span
          style={{
            display: 'inline-block',
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '1px 8px',
            borderRadius: 3,
            marginBottom: 6,
            background: priorityColors.bg,
            color: priorityColors.text,
          }}
        >
          {priority}
        </span>
      )}

      {/* KV mode */}
      {parsed.mode === 'kv' && (
        <div>
          {parsed.kvPairs.map((kv, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                padding: '6px 0',
                borderBottom: i < parsed.kvPairs.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 11, minWidth: 80, flexShrink: 0, opacity: 0.85, color: 'var(--fg)' }}>
                {kv.key}
              </span>
              <span style={{ flex: 1, lineHeight: 1.6, textAlign: 'justify' }}>
                {kv.value}
              </span>
            </div>
          ))}
          {parsed.plainParts.map((p, i) => (
            <div key={`p-${i}`} style={{ lineHeight: 1.6, textAlign: 'justify', paddingTop: 6 }}>
              {p}
            </div>
          ))}
        </div>
      )}

      {/* Numbered mode */}
      {parsed.mode === 'numbered' && (
        <div>
          {parsed.plainParts.map((p, i) => (
            <div key={`prose-${i}`} style={{ lineHeight: 1.7, textAlign: 'justify', marginBottom: 4 }}>
              {p}
            </div>
          ))}
          {parsed.numberedParts.map((np, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                padding: '6px 0',
                borderBottom: i < parsed.numberedParts.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '50%',
                  flexShrink: 0,
                  color: 'var(--fg)',
                }}
              >
                {np.num}
              </span>
              <span style={{ flex: 1, lineHeight: 1.6 }}>
                {np.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Prose mode */}
      {parsed.mode === 'prose' && (
        <div style={{ lineHeight: 1.7, textAlign: 'justify' }}>
          {parsed.proseText}
        </div>
      )}
    </div>
  );
}
