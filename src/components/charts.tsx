export function Donut({
  segments,
  size = 150,
  thickness = 16,
  center,
  sub,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  center: string;
  sub?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${center} ${sub ?? ""}`}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
      {total > 0 &&
        segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={i}
              cx={mid}
              cy={mid}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${mid} ${mid})`}
            />
          );
          offset += len;
          return el;
        })}
      <text x={mid} y={mid - 2} textAnchor="middle" fontSize="26" fontWeight="700" fill="#0f172a">
        {center}
      </text>
      {sub && (
        <text x={mid} y={mid + 18} textAnchor="middle" fontSize="12" fill="#64748b">
          {sub}
        </text>
      )}
    </svg>
  );
}

export function Bar({ pct, color = "#4f46e5" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}
