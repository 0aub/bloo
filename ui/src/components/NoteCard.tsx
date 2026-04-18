interface Props {
  content: string;
  color?: string;
  priority?: string;
}

function renderMarkdown(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Blank line — close list, add spacer
    if (trimmed === '') {
      if (inList) { out.push('</div>'); inList = false; }
      out.push('<div style="height:6px"></div>');
      continue;
    }

    let line = esc(trimmed);
    // Inline formatting
    line = line.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
    line = line.replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>');

    // Headers
    const h1 = trimmed.match(/^# (.+)$/);
    const h2 = trimmed.match(/^## (.+)$/);
    const h3 = trimmed.match(/^### (.+)$/);
    if (h3) {
      if (inList) { out.push('</div>'); inList = false; }
      let title = esc(h3[1]);
      title = title.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      out.push(`<div style="font-weight:700;font-size:12px;margin:10px 0 3px;color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:3px">${title}</div>`);
      continue;
    }
    if (h2) {
      if (inList) { out.push('</div>'); inList = false; }
      let title = esc(h2[1]);
      title = title.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      out.push(`<div style="font-weight:700;font-size:13px;margin:12px 0 4px;color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:3px">${title}</div>`);
      continue;
    }
    if (h1) {
      if (inList) { out.push('</div>'); inList = false; }
      let title = esc(h1[1]);
      title = title.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      out.push(`<div style="font-weight:800;font-size:14px;margin:14px 0 5px;color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:4px">${title}</div>`);
      continue;
    }

    // Bullet lists
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!inList) { out.push('<div style="margin:4px 0 4px 4px">'); inList = true; }
      out.push(`<div style="display:flex;gap:6px;margin:1px 0;line-height:1.5"><span style="color:var(--accent);flex-shrink:0">•</span><span>${line.replace(/^[-*]\s+/, '')}</span></div>`);
      continue;
    }

    // Numbered lists
    const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) {
      if (!inList) { out.push('<div style="margin:4px 0 4px 4px">'); inList = true; }
      let content = esc(numbered[2]);
      content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      content = content.replace(/\*(.+?)\*/g, '<em>$1</em>');
      content = content.replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>');
      out.push(`<div style="display:flex;gap:6px;margin:1px 0;line-height:1.5"><span style="color:var(--accent);font-weight:700;flex-shrink:0">${numbered[1]}.</span><span>${content}</span></div>`);
      continue;
    }

    // Regular paragraph line
    if (inList) { out.push('</div>'); inList = false; }
    out.push(`<div style="margin:2px 0;line-height:1.6">${line}</div>`);
  }

  if (inList) out.push('</div>');
  return out.join('');
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'background:hsl(0 60% 20%);color:hsl(0 85% 65%)',
  medium: 'background:hsl(38 50% 20%);color:hsl(38 80% 65%)',
  low: 'background:hsl(152 40% 18%);color:hsl(152 55% 60%)',
};

export default function NoteCard({ content, color, priority }: Props) {
  const html = renderMarkdown(content);
  const priorityStyle = priority ? PRIORITY_STYLES[priority.toLowerCase()] : null;

  const borderColor = color === 'yellow' ? 'hsl(38 70% 45%)'
    : color === 'green' ? 'hsl(152 50% 40%)'
    : color === 'red' ? 'hsl(0 50% 45%)'
    : color === 'orange' ? 'hsl(25 70% 50%)'
    : color === 'pink' ? 'hsl(340 45% 50%)'
    : color === 'purple' ? 'hsl(280 40% 50%)'
    : 'var(--accent)';

  return (
    <div
      className="h-full overflow-auto"
      style={{
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '0 8px 8px 0',
        padding: '8px 12px',
        fontSize: 12,
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
