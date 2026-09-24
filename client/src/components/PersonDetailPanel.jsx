import { X, Flag, MessageSquare, Link2, Users } from "lucide-react";
import { fullName, genderLabel } from "../utils/person";
import Avatar from "./Avatar";

function PersonName({ person }) {
  if (!person) return <span className="text-ink-muted italic">Membre supprimé</span>;
  const name = fullName(person);
  return (
    <span className="flex items-center gap-2 min-w-0">
      <Avatar person={person} size="w-5 h-5" textSize="text-[9px]" />
      <span className="truncate">{name}</span>
    </span>
  );
}

export default function PersonDetailPanel({
  person,
  people,
  relationships,
  onClose,
  onEdit,
  onDelete,
  isAdmin,
  onAddRelationship,
  onRemoveRelationship,
  onViewFamily,
}) {
  if (!person) return null;

  const name = fullName(person);
  const byId = new Map(people.map((p) => [p.id, p]));

  const parentRels = relationships.filter(
    (r) => r.relationshipType === "parent" && r.relatedPersonId === person.id
  );
  const childRels = relationships.filter(
    (r) => r.relationshipType === "parent" && r.personId === person.id
  );
  const spouseRels = relationships.filter(
    (r) => r.relationshipType === "spouse" && (r.personId === person.id || r.relatedPersonId === person.id)
  );
  const otherOf = (r) =>
    r.relatedPersonId === person.id ? byId.get(r.personId) : byId.get(r.relatedPersonId);

  return (
    <div className="bg-panel card-shadow border border-border rounded-lg mt-4 animate-slide-up">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h3 className="font-display text-lg text-ink-light truncate">{name}</h3>
        <button
          onClick={onClose}
          className="text-ink-muted hover:text-ink-light transition-colors"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-5 py-4 space-y-3">
        {genderLabel(person.gender) && (
          <div className="flex items-center gap-3 text-sm">
            <Flag size={14} className="text-accent shrink-0" />
            <span className="text-ink-muted">Genre :</span>
            <span className="text-ink-light">{genderLabel(person.gender)}</span>
          </div>
        )}

        {person.notes && (
          <div className="flex items-start gap-3 text-sm">
            <MessageSquare size={14} className="text-accent shrink-0 mt-0.5" />
            <div>
              <span className="text-ink-muted">Notes :</span>
              <p className="text-ink-light mt-1 italic border-l-2 border-border pl-2 whitespace-pre-wrap">{person.notes}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 text-sm pt-2 border-t border-border">
          <Users size={14} className="text-accent shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-ink-muted mb-1">Parents</p>
              {parentRels.length ? (
                <ul className="space-y-1">
                  {parentRels.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 text-ink-light">
                      <PersonName person={otherOf(r)} />
                      {onRemoveRelationship && (
                        <button onClick={() => onRemoveRelationship(r)} className="text-ink-muted hover:text-danger transition-colors text-xs">
                          Retirer
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-subtle italic">Aucun</p>
              )}
            </div>
            <div>
              <p className="text-ink-muted mb-1">Conjoint(s)</p>
              {spouseRels.length ? (
                <ul className="space-y-1">
                  {spouseRels.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 text-ink-light">
                      <PersonName person={otherOf(r)} />
                      {onRemoveRelationship && (
                        <button onClick={() => onRemoveRelationship(r)} className="text-ink-muted hover:text-danger transition-colors text-xs">
                          Retirer
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-subtle italic">Aucun</p>
              )}
            </div>
            <div>
              <p className="text-ink-muted mb-1">Enfants</p>
              {childRels.length ? (
                <ul className="space-y-1">
                  {childRels.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 text-ink-light">
                      <PersonName person={otherOf(r)} />
                      {onRemoveRelationship && (
                        <button onClick={() => onRemoveRelationship(r)} className="text-ink-muted hover:text-danger transition-colors text-xs">
                          Retirer
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-subtle italic">Aucun</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 px-5 pb-4">
        {onViewFamily && (
          <button
            onClick={() => onViewFamily(person.id)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-md bg-accent text-panel font-medium hover:bg-accent-hover transition-colors"
          >
            <Users size={14} /> Voir la famille
          </button>
        )}
        <button
          onClick={() => onAddRelationship(person)}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-md border border-border text-ink-muted hover:text-ink-light transition-colors"
        >
          <Link2 size={14} /> Ajouter un lien
        </button>
        <button
          onClick={() => { onClose(); onEdit(person); }}
          className="text-sm px-4 py-2 rounded-md border border-border text-ink-muted hover:text-ink-light transition-colors"
        >
          Modifier
        </button>
        {onDelete && (
          <button
            onClick={() => { onClose(); onDelete(person.id); }}
            className="text-sm px-4 py-2 rounded-md bg-danger text-danger-text font-medium hover:bg-danger-hover transition-colors"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
