import { Pencil, Trash2, Calendar } from "lucide-react";
import { fullName, formatDates } from "../utils/person";
import Avatar from "./Avatar";

export default function PersonCard({ person, onSelect, onEdit, onDelete }) {
  const name = fullName(person);
  const dates = formatDates(person.birthDate, person.deathDate, person.deceased);

  return (
    <li
      className="bg-panel card-shadow border border-border rounded-lg flex items-stretch overflow-hidden hover:-translate-y-0.5 hover:card-shadow-lg hover:border-border-hover transition-all duration-200 animate-fade-in cursor-pointer"
      onClick={() => onSelect(person)}
    >
      <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
        <Avatar person={person} size="w-10 h-10" textSize="text-sm" />
        <div className="min-w-0">
          <h3 className="font-display text-lg text-ink-light truncate">{name}</h3>
          <span className="flex items-center gap-1.5 text-sm text-ink-muted">
            <Calendar size={12} />
            {dates || "Dates inconnues"}
          </span>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-2 px-3 border-l border-border">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(person); }}
          className="text-ink-muted hover:text-accent transition-colors"
          aria-label={`Modifier ${name}`}
        >
          <Pencil size={16} />
        </button>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(person.id); }}
            className="text-ink-muted hover:text-danger transition-colors"
            aria-label={`Supprimer ${name}`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </li>
  );
}
