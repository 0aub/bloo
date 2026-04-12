import React from 'react';

interface Props {
  content: string;
  color?: string;
  priority?: string;
}

interface ParsedLine {
  key: string;
  value: string;
  index?: number;
}

function parseContent(content: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  // Split on sentence boundaries or newlines
  const parts = content.split(/(?:\n|(?<=\.) )/).filter(Boolean);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Check for "N. Key: Value" pattern
    const numberedMatch = trimmed.match(/^(\d+)\.\s*(.+?):\s*(.+)$/);
    if (numberedMatch) {
      lines.push({ index: parseInt(numberedMatch[1]), key: numberedMatch[2], value: numberedMatch[3] });
      continue;
    }

    // Check for "Key: Value" pattern
    const kvMatch = trimmed.match(/^(.+?):\s+(.+)$/);
    if (kvMatch) {
      lines.push({ key: kvMatch[1], value: kvMatch[2] });
      continue;
    }

    // Plain text line
    lines.push({ key: '', value: trimmed });
  }

  return lines;
}

const COLOR_MAP: Record<string, string> = {
  green: 'var(--accent)',
  blue: '#3b82f6',
  red: '#ef4444',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#a855f7',
  pink: '#ec4899',
};

export default function NoteCard({ content, color, priority }: Props) {
  const lines = parseContent(content);
  const borderColor = color ? (COLOR_MAP[color.toLowerCase()] || color) : 'var(--accent)';

  return (
    <div
      className="h-full overflow-auto text-xs leading-relaxed"
      style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: 10 }}
    >
      {priority && (
        <span
          className="inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mb-2"
          style={{
            background: borderColor,
            color: '#fff',
            opacity: 0.9,
          }}
        >
          {priority}
        </span>
      )}
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              {line.key ? (
                <>
                  <td
                    className="align-top pr-2 py-0.5 whitespace-nowrap font-bold"
                    style={{ color: 'var(--fg)' }}
                  >
                    {line.index != null && (
                      <span style={{ color: 'var(--fg-muted)', marginRight: 4 }}>{line.index}.</span>
                    )}
                    {line.key}:
                  </td>
                  <td className="align-top py-0.5" style={{ color: 'var(--fg-muted)' }}>
                    {line.value}
                  </td>
                </>
              ) : (
                <td colSpan={2} className="py-0.5" style={{ color: 'var(--fg)' }}>
                  {line.value}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
