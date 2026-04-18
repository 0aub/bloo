interface Props {
  content: string;
}

function renderMarkdown(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed === '') {
      if (inList) { out.push('</div>'); inList = false; }
      out.push('<div style="height:6px"></div>');
      continue;
    }

    let line = esc(trimmed);
    line = line.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
    line = line.replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>');

    const h3 = trimmed.match(/^### (.+)$/);
    const h2 = trimmed.match(/^## (.+)$/);
    const h1 = trimmed.match(/^# (.+)$/);
    if (h3) {
      if (inList) { out.push('</div>'); inList = false; }
      let t = esc(h3[1]); t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      out.push(`<div style="font-weight:700;font-size:12px;margin:10px 0 3px;color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:3px">${t}</div>`);
      continue;
    }
    if (h2) {
      if (inList) { out.push('</div>'); inList = false; }
      let t = esc(h2[1]); t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      out.push(`<div style="font-weight:700;font-size:13px;margin:12px 0 4px;color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:3px">${t}</div>`);
      continue;
    }
    if (h1) {
      if (inList) { out.push('</div>'); inList = false; }
      let t = esc(h1[1]); t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      out.push(`<div style="font-weight:800;font-size:14px;margin:14px 0 5px;color:var(--fg);border-bottom:1px solid var(--border);padding-bottom:4px">${t}</div>`);
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!inList) { out.push('<div style="margin:4px 0 4px 4px">'); inList = true; }
      out.push(`<div style="display:flex;gap:6px;margin:1px 0;line-height:1.5"><span style="color:var(--accent);flex-shrink:0">•</span><span>${line.replace(/^[-*]\s+/, '')}</span></div>`);
      continue;
    }

    const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) {
      if (!inList) { out.push('<div style="margin:4px 0 4px 4px">'); inList = true; }
      let c = esc(numbered[2]);
      c = c.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      c = c.replace(/\*(.+?)\*/g, '<em>$1</em>');
      c = c.replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>');
      out.push(`<div style="display:flex;gap:6px;margin:1px 0;line-height:1.5"><span style="color:var(--accent);font-weight:700;flex-shrink:0">${numbered[1]}.</span><span>${c}</span></div>`);
      continue;
    }

    if (inList) { out.push('</div>'); inList = false; }
    out.push(`<div style="margin:2px 0;line-height:1.6">${line}</div>`);
  }

  if (inList) out.push('</div>');
  return out.join('');
}

export default function TextBlockCard({ content }: Props) {
  const html = renderMarkdown(content);

  return (
    <div
      className="h-full overflow-auto"
      style={{
        fontSize: 12,
        padding: '4px 8px',
        color: 'var(--fg)',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
