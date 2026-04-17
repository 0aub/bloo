interface Props {
  content: string;
}

// Simple markdown-to-HTML: bold, italic, inline code, headers, links
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headers: ### heading
    .replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:13px;margin:8px 0 4px;color:var(--fg)">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:14px;margin:10px 0 4px;color:var(--fg)">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-weight:800;font-size:15px;margin:12px 0 4px;color:var(--fg)">$1</div>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-elevated);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">$1</code>')
    // Bullet lists: - item or * item
    .replace(/^[-*] (.+)$/gm, '<div style="padding-left:12px;text-indent:-12px;margin:2px 0">• $1</div>')
    // Numbered lists: 1. item
    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="margin:2px 0"><span style="color:var(--accent);font-weight:700">$1.</span> <span style="font-weight:600">$2</span></div>')
    // Line breaks
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, '<br/>');
}

export default function TextBlockCard({ content }: Props) {
  const html = renderMarkdown(content);

  return (
    <div
      className="h-full overflow-auto"
      style={{
        fontSize: 12,
        lineHeight: 1.7,
        textAlign: 'justify',
        padding: 4,
        color: 'var(--fg)',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
