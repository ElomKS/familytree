import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import PersonCard from "./PersonCard";
import PersonDetailPanel from "./PersonDetailPanel";

const PER_PAGE = 20;

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
}) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [query]);

  const totalPages = Math.max(1, Math.ceil(people.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  const paged = people.slice(start, start + PER_PAGE);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 bg-panel card-shadow border border-border rounded-md px-3 py-2">
        <Search size={15} className="text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom"
          className="w-full bg-transparent text-ink-light text-sm outline-none"
        />
      </div>

      {!query.trim() ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <p className="font-display text-lg text-ink-muted">Recherchez un membre pour afficher la liste.</p>
          <p className="text-sm text-ink-subtle mt-1">La liste est masquée tant qu'une recherche n'est pas saisie.</p>
        </div>
      ) : people.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <p className="font-display text-lg text-ink-muted">Aucun résultat.</p>
          <p className="text-sm text-ink-subtle mt-1">Essayez une autre recherche.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {paged.map((p) => (
              <PersonCard key={p.id} person={p} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
          {people.length > PER_PAGE && (
            <div className="flex items-center justify-between mt-5 bg-panel card-shadow border border-border rounded-md px-3 py-2">
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage <= 1}
                className="text-sm text-ink-muted hover:text-ink-light transition-colors disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-xs text-ink-muted">
                {start + 1}–{Math.min(start + PER_PAGE, people.length)} sur {people.length}
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
