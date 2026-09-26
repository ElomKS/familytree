import { useEffect, useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import PersonCard from "./PersonCard";
import PersonDetailPanel from "./PersonDetailPanel";
import { fullName } from "../utils/person";

const PER_PAGE = 20;

const SORTS = [
  { key: "name", label: "Nom (A → Z)" },
  { key: "nameDesc", label: "Nom (Z → A)" },
  { key: "recent", label: "Récemment ajoutés" },
];

export default function PersonList({
  people,
  allPeople,
  query,
  setQuery,
  selectedPerson,
  relationships,
  onSelect,
  onCloseDetail,
  onEdit,
  onDelete,
  isAdmin,
  onAddRelationship,
  onRemoveRelationship,
  onViewFamily,
  onShowForm,
}) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("name");
  useEffect(() => setPage(1), [query, sortBy]);

  const sorted = useMemo(() => {
    const arr = [...people];
    if (sortBy === "name") {
      return arr.sort((a, b) => fullName(a).localeCompare(fullName(b)));
    }
    if (sortBy === "nameDesc") {
      return arr.sort((a, b) => fullName(b).localeCompare(fullName(a)));
    }
    return arr.sort(
      (a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || "") || fullName(a).localeCompare(fullName(b))
    );
  }, [people, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  const paged = sorted.slice(start, start + PER_PAGE);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 bg-panel card-shadow border border-border rounded-md px-3 py-2">
          <Search size={15} className="text-ink-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom"
            className="w-full bg-transparent text-ink-light text-sm outline-none"
          />
        </div>
        {onShowForm && (
          <button
            onClick={onShowForm}
            className="shrink-0 flex items-center gap-1.5 text-sm px-3 py-2 rounded-md bg-panel card-shadow border border-border text-ink-muted hover:text-ink-light transition-colors"
          >
            <Plus size={14} /> Formulaire
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <p className="font-display text-lg text-ink-muted">
            {query.trim() ? "Aucun résultat." : "Aucun membre pour l'instant."}
          </p>
          <p className="text-sm text-ink-subtle mt-1">
            {query.trim() ? "Essayez une autre recherche." : "Ajoutez-en un via le formulaire ci-contre."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-sm text-ink-muted">
              {sorted.length} membre{sorted.length > 1 ? "s" : ""}
              {query.trim() && (
                <>
                  {" "}pour «&nbsp;{query.trim()}&nbsp;»
                </>
              )}
            </p>
            <div className="ml-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs bg-panel card-shadow border border-border text-ink-muted rounded-md px-2 py-1.5 outline-none focus:border-accent transition-colors cursor-pointer"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ul className="space-y-3">
            {paged.map((p) => (
              <PersonCard key={p.id} person={p} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
          {sorted.length > PER_PAGE && (
            <div className="flex items-center justify-between mt-5 bg-panel card-shadow border border-border rounded-md px-3 py-2">
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage <= 1}
                className="text-sm text-ink-muted hover:text-ink-light transition-colors disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-xs text-ink-muted">
                {start + 1}–{Math.min(start + PER_PAGE, sorted.length)} sur {sorted.length}
              </span>
              <button
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="text-sm text-ink-muted hover:text-ink-light transition-colors disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          )}
          <PersonDetailPanel
            person={selectedPerson}
            people={allPeople}
            relationships={relationships}
            onClose={onCloseDetail}
            onEdit={onEdit}
            onDelete={onDelete}
            isAdmin={isAdmin}
            onAddRelationship={onAddRelationship}
            onRemoveRelationship={onRemoveRelationship}
            onViewFamily={onViewFamily}
          />
        </>
      )}
    </div>
  );
}
