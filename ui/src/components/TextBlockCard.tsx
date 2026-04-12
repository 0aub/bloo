interface Props {
  content: string;
}

export default function TextBlockCard({ content }: Props) {
  const paragraphs = content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="h-full overflow-auto text-xs leading-relaxed px-1">
      {paragraphs.map((para, i) => {
        const lines = para.split('\n').filter(Boolean);
        return (
          <div key={i} className={i > 0 ? 'mt-2' : ''}>
            {lines.map((line, j) => {
              const trimmed = line.trim();
              // Detect numbered lines: "1. Something" or "1) Something"
              const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
              if (numberedMatch) {
                return (
                  <p key={j} className="mb-0.5" style={{ textAlign: 'justify', color: 'var(--fg)' }}>
                    <span className="font-bold" style={{ color: 'var(--accent)' }}>
                      {numberedMatch[1]}.
                    </span>{' '}
                    <span style={{ fontWeight: 600 }}>{numberedMatch[2]}</span>
                  </p>
                );
              }
              return (
                <p key={j} className="mb-0.5" style={{ textAlign: 'justify', color: 'var(--fg)' }}>
                  {trimmed}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
