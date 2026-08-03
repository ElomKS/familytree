import { useState } from "react";
import { Link2 } from "lucide-react";
import { fullName } from "../utils/person";

const typeOptions = [
  { value: "parent", label: "Parent" },
  { value: "spouse", label: "Conjoint(e)" },
  { value: "child", label: "Enfant" },
];

export default function RelationshipPicker({ person, people, onClose, onCreate }) {
  const [type, setType] = useState("parent");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const others = people.filter((p) => p.id !== person.id);

  function handleSubmit(ev) {
    ev.preventDefault();
    const typed = name.trim();
    if (!typed) {
      setError("Choisissez ou saisissez un membre.");
      return;
    }
    onCreate(type, typed);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50 animate-fade-in">
      <div className="bg-panel card-shadow-lg border border-border rounded-lg p-6 max-w-md w-full animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-accent" />
            <h3 className="font-display text-lg text-ink-light">Ajouter un lien</h3>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-light text-sm transition-colors">
            Fermer
          </button>
        </div>

        <p className="text-sm text-ink-muted mb-4">
          Relier <span className="text-ink-light font-medium">{fullName(person)}</span> à un autre membre :
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-1.5">Lien</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`text-sm px-3 py-2 rounded-md border transition-colors ${
                    type === opt.value
                      ? "bg-accent text-panel font-medium border-accent"
                      : "border-border text-ink-muted hover:text-ink-light"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-subtle mt-2">
              {type === "parent" && `${fullName(person)} sera l'enfant du membre choisi.`}
              {type === "child" && `Le membre choisi sera l'enfant de ${fullName(person)}.`}
              {type === "spouse" && `Le membre choisi sera le/la conjoint(e) de ${fullName(person)}.`}
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-1.5">Membre</label>
            <input
              list="picker-people"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Choisir ou saisir un nom…"
              className="w-full bg-panel-input border border-border rounded-md px-3 py-2 text-ink-light text-sm outline-none focus:border-accent transition-colors"
            />
            <datalist id="picker-people">
              {others.map((p) => (
                <option key={p.id} value={fullName(p)} />
              ))}
            </datalist>
            {error && <p className="text-danger text-sm mt-1">{error}</p>}
            <p className="text-xs text-ink-subtle mt-2">
              Saisissez un nom enregistré pour créer le lien, ou un nouveau nom pour l'ajouter automatiquement.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 text-sm px-4 py-2 rounded-md bg-accent text-panel font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              Créer le lien
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md border border-border text-ink-muted hover:text-ink-light transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
