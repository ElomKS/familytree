export default function DeleteConfirmModal({
  onConfirm,
  onCancel,
  title = "Supprimer ce membre ?",
  message = "Ceci supprime définitivement le membre ainsi que tous ses liens de parenté. Cette action est irréversible.",
  confirmLabel = "Supprimer",
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50 animate-fade-in">
      <div className="bg-panel card-shadow-lg border border-border rounded-lg p-6 max-w-sm w-full animate-slide-up">
        <h3 className="font-display text-lg text-ink-light mb-2">{title}</h3>
        <p className="text-sm text-ink-muted mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded-md border border-border text-ink-muted hover:text-ink-light transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="text-sm px-4 py-2 rounded-md bg-danger text-danger-text font-medium hover:bg-danger-hover transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
