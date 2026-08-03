export default function Field({ label, icon, error, input }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-muted mb-1.5">
        {icon}
        {label}
      </label>
      {input}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
