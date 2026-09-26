import { AlertCircle, CheckCircle2, X } from "lucide-react";

export default function Toast({ status, onDismiss }) {
  if (!status) return null;
  const ok = status.type === "success";
  return (
    <div
      role="status"
      onClick={onDismiss}
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-lg px-4 py-3 shadow-lg animate-slide-up cursor-pointer border max-w-sm ${
        ok ? "bg-panel border-success/40" : "bg-panel border-danger/40"
      }`}
    >
      {ok ? (
        <CheckCircle2 size={17} className="text-success shrink-0" />
      ) : (
        <AlertCircle size={17} className="text-danger shrink-0" />
      )}
      <p className="text-sm text-ink-light min-w-0">{status.text}</p>
      <X size={14} className="text-ink-subtle shrink-0" />
    </div>
  );
}