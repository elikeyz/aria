export default function Header() {
  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
      style={{ background: '#050c18', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-3">
        <div className="meridian-logo-mark">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" fillOpacity="0.9" />
            <path
              d="M2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h1
            className="text-sm font-semibold tracking-wide"
            style={{ color: '#f1f5f9', fontFamily: 'var(--font-geist-sans)' }}
          >
            Meridian Electronics
          </h1>
          <p className="text-xs" style={{ color: '#64748b' }}>
            AI Shopping Assistant
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 meridian-pulse" />
        <span className="text-xs font-medium" style={{ color: '#34d399' }}>
          Online
        </span>
      </div>
    </header>
  );
}
