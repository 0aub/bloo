interface Props {
  content: string;
  color?: string;
  priority?: string;
}

// Markdown renderer shared with TextBlockCard
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:13px;margin:8px 0 4px;color:var(--fg)">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:14px;margin:10px 0 4px;color:var(--fg)">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-weight:800;font-size:15px;margin:12px 0 4px;color:var(--fg)">$1</div>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>')
    .replace(/^[-*] (.+)$/gm, '<div style="padding-left:12px;text-indent:-12px;margin:2px 0">• $1</div>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="margin:2px 0"><span style="color:var(--accent);font-weight:700">$1.</span> $2</div>')
    .replace(/\n\n/g, '<div style="height:6px"></div>')
    .replace(/\n/g, '<br/>');
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'background:hsl(0 60% 20%);color:hsl(0 85% 65%)',
  medium: 'background:hsl(38 50% 20%);color:hsl(38 80% 65%)',
  low: 'background:hsl(152 40% 18%);color:hsl(152 55% 60%)',
};

export default function NoteCard({ content, color, priority }: Props) {
  const html = renderMarkdown(content);
  const priorityStyle = priority ? PRIORITY_STYLES[priority.toLowerCase()] : null;

  // Note color maps to a CSS class — we use accent-colored left border
  // and transparent bg so it works in both dark and light themes
  const borderColor = color === 'yellow' ? 'hsl(38 70% 45%)'
    : color === 'green' ? 'hsl(152 50% 40%)'
    : color === 'red' ? 'hsl(0 50% 45%)'
    : color === 'orange' ? 'hsl(25 70% 50%)'
    : color === 'pink' ? 'hsl(340 45% 50%)'
    : color === 'purple' ? 'hsl(280 40% 50%)'
    : 'var(--accent)'; // default / blue

  return (
    <div
      className="h-full overflow-auto"
      style={{
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '0 8px 8px 0',
        padding: '10px 14px',
        fontSize: 12,
        lineHeight: 1.6,
        color: 'var(--fg)',
      }}
    >
      {priority && priorityStyle && (
        <span
          style={{
            display: 'inline-block',
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '1px 8px',
            borderRadius: 3,
            marginBottom: 6,
            ...Object.fromEntries(priorityStyle.split(';').map(s => {
              const [k, v] = s.split(':');
              return [k.trim(), v.trim()];
            })),
          }}
        >
          {priority}
        </span>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
