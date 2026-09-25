import { Fragment, useMemo, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { fullName, genderLabel } from "../utils/person";
import Avatar from "./Avatar";

function MemberRow({ person, selected, onClick }) {
  const name = fullName(person);
  const deceased = !!person.deceased;
  const gender = genderLabel(person.gender);
  return (
    <button
      onClick={() => onClick(person.id)}
      className={`w-full flex items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors ${
        selected ? "bg-accent/15" : "hover:bg-white/5"
      }`}
    >
      <Avatar person={person} />
      <span className="min-w-0 flex-1 text-left">
        <span className={`block text-sm truncate ${deceased ? "text-ink-muted line-through" : "text-ink-light"}`}>
          {name}
        </span>
        {gender && <span className="block text-[11px] uppercase tracking-wide text-ink-subtle">{gender}</span>}
      </span>
      {deceased && <span className="text-xs text-ink-subtle shrink-0">†</span>}
      {selected && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 ml-auto" />}
    </button>
  );
}

function ParentChip({ person, selected, onClick }) {
  const name = fullName(person);
  const deceased = !!person.deceased;
  const role = person.gender === "homme" ? "Père" : person.gender === "femme" ? "Mère" : "Parent";
  return (
    <button
      onClick={() => onClick(person.id)}
      className={`flex items-center gap-2.5 rounded-md px-2 py-1 -mx-1 transition-colors ${
        selected ? "bg-accent/15" : "hover:bg-white/5"
      }`}
    >
      <Avatar person={person} />
      <span className="min-w-0 text-left">
        <span className={`block text-sm font-medium truncate ${deceased ? "text-ink-muted line-through" : "text-ink-light"}`}>
          {name}
        </span>
        <span className="block text-[11px] uppercase tracking-wide text-ink-subtle">{role}</span>
      </span>
      {deceased && <span className="text-xs text-ink-subtle shrink-0">†</span>}
    </button>
  );
}

export default function FamilyCards({
  people,
  relationships,
  selectedId,
  onSelect,
  focusId,
  onOpenFamily,
  onBack,
}) {
  const { families, isolated } = useMemo(() => {
    const byId = new Map(people.map((p) => [p.id, p]));
    const parentsOf = new Map();
    for (const rel of relationships) {
      if (rel.relationshipType !== "parent") continue;
      if (!byId.has(rel.personId) || !byId.has(rel.relatedPersonId)) continue;
      if (!parentsOf.has(rel.relatedPersonId)) parentsOf.set(rel.relatedPersonId, []);
      parentsOf.get(rel.relatedPersonId).push(rel.personId);
    }

    const keyToFamily = new Map();
    const families = [];
    for (const [childId, parentIds] of parentsOf) {
      const key = parentIds.slice().sort().join("|");
      if (!keyToFamily.has(key)) {
        const fam = { key, parents: [...parentIds].sort(), children: [] };
        keyToFamily.set(key, fam);
        families.push(fam);
      }
      keyToFamily.get(key).children.push(childId);
    }

    const withParents = new Set(parentsOf.keys());
    const isParent = new Set();
    for (const list of parentsOf.values()) for (const p of list) isParent.add(p);
    const isolated = people.filter((p) => !withParents.has(p.id) && !isParent.has(p.id));

    families.sort((a, b) => {
      const nameA = a.parents.map((id) => fullName(byId.get(id))).join(" ");
      const nameB = b.parents.map((id) => fullName(byId.get(id))).join(" ");
      return nameA.localeCompare(nameB);
    });

    return { families, isolated };
  }, [people, relationships]);

  const selectedFamKey = useMemo(() => {
    if (!selectedId) return null;
    const fam = families.find(
      (f) => f.parents.includes(selectedId) || f.children.includes(selectedId)
    );
    return fam ? fam.key : null;
  }, [families, selectedId]);

  useEffect(() => {
    if (!selectedFamKey) return;
    const el = document.getElementById(`family-${selectedFamKey}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedFamKey]);

  const focused = focusId ? people.find((p) => p.id === focusId) : null;

  if (!people.length) {
    return (
      <div className="border border-dashed border-border rounded-lg py-16 text-center">
        <p className="font-display text-lg text-ink-muted">Aucun membre enregistré.</p>
        <p className="text-sm text-ink-subtle mt-1">Ajoutez d'abord des membres dans l'onglet Registre.</p>
      </div>
    );
  }

  if (focused) {
    const byId = new Map(people.map((p) => [p.id, p]));
    const name = fullName(focused);
    const sortByName = (a, b) => fullName(a).localeCompare(fullName(b));
    const byCreated = (a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "") || fullName(a).localeCompare(fullName(b));

    const parents = relationships
      .filter((r) => r.relationshipType === "parent" && r.relatedPersonId === focused.id)
      .map((r) => byId.get(r.personId))
      .filter(Boolean)
      .sort(sortByName);

    const spouses = relationships
      .filter(
        (r) =>
          r.relationshipType === "spouse" &&
          (r.personId === focused.id || r.relatedPersonId === focused.id)
      )
      .map((r) => (r.personId === focused.id ? byId.get(r.relatedPersonId) : byId.get(r.personId)))
      .filter(Boolean)
      .sort(sortByName);

    const siblingIds = new Set();
    for (const r of relationships) {
      if (r.relationshipType !== "parent" || r.relatedPersonId !== focused.id) continue;
      for (const s of relationships) {
        if (s.relationshipType === "parent" && s.personId === r.personId && s.relatedPersonId !== focused.id) {
          siblingIds.add(s.relatedPersonId);
        }
      }
    }
    const siblings = [...siblingIds].map((id) => byId.get(id)).filter(Boolean).sort(sortByName);

    const children = relationships
      .filter((r) => r.relationshipType === "parent" && r.personId === focused.id)
      .map((r) => byId.get(r.relatedPersonId))
      .filter(Boolean)
      .sort(byCreated);

    const groups = [];
    const groupMap = new Map();
    for (const child of children) {
      const otherParents = relationships
        .filter((r) => r.relationshipType === "parent" && r.relatedPersonId === child.id)
        .map((r) => r.personId)
        .filter((id) => id !== focused.id)
        .sort();
      const key = otherParents.join("|");
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          label: otherParents.length ? otherParents.map((id) => fullName(byId.get(id))).join(" & ") : null,
          children: [],
        });
        groups.push(groupMap.get(key));
      }
      groupMap.get(key).children.push(child);
    }

    const hasFamily = parents.length > 0 || siblings.length > 0 || spouses.length > 0 || children.length > 0;

    return (
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-light transition-colors mb-5"
        >
          <ArrowLeft size={15} /> Retour à toutes les familles
        </button>

        <div className="flex items-center gap-3 mb-5">
          <Avatar person={focused} size="w-10 h-10" />
          <h2 className="font-display text-xl text-ink">La famille de {name}</h2>
        </div>

        {!hasFamily ? (
          <div className="border border-dashed border-border rounded-lg py-16 text-center">
            <p className="font-display text-lg text-ink-muted">Aucun conjoint ni enfant pour le moment.</p>
            <p className="text-sm text-ink-subtle mt-1">Ajoutez un lien pour construire cette famille.</p>
          </div>
        ) : (
          <div className="bg-panel card-shadow border border-border rounded-lg overflow-hidden max-w-md">
            {parents.length > 0 && (
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">Ascendants</p>
                <div className="grid gap-0.5">
                  {parents.map((p) => (
                    <MemberRow key={p.id} person={p} selected={selectedId === p.id} onClick={onOpenFamily} />
                  ))}
                </div>
              </div>
            )}
            {siblings.length > 0 && (
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">Frères et sœurs</p>
                <div className="grid gap-0.5">
                  {siblings.map((p) => (
                    <MemberRow key={p.id} person={p} selected={selectedId === p.id} onClick={onOpenFamily} />
                  ))}
                </div>
              </div>
            )}
            {spouses.length > 0 && (
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">
                  Conjoint{spouses.length > 1 ? "s" : ""}
                </p>
                <div className="grid gap-0.5">
                  {spouses.map((p) => (
                    <MemberRow key={p.id} person={p} selected={selectedId === p.id} onClick={onOpenFamily} />
                  ))}
                </div>
              </div>
            )}
            {groups.length > 0 && (
              <div className="px-4 py-3">
                {groups.map((g) => (
                  <div key={g.key} className={groups.length > 1 ? "mb-3 last:mb-0" : ""}>
                    <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">
                      {g.label ? `Enfants avec ${g.label}` : "Enfants"}
                    </p>
                    <div className="grid gap-0.5">
                      {g.children.map((p) => (
                        <MemberRow key={p.id} person={p} selected={selectedId === p.id} onClick={onOpenFamily} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const byId = new Map(people.map((p) => [p.id, p]));
  const totalChildren = families.reduce((s, f) => s + f.children.length, 0);

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="font-display text-xl text-ink">Familles</h2>
        <p className="text-sm text-ink-muted">
          {families.length} famille{families.length > 1 ? "s" : ""} · {totalChildren} enfant
          {totalChildren > 1 ? "s" : ""}
        </p>
      </div>

      {families.length === 0 && isolated.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <p className="text-ink-muted">Aucune famille créée pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {families.map((fam, i) => {
            const parents = fam.parents.map((id) => byId.get(id)).filter(Boolean);
            const children = fam.children
              .map((id) => byId.get(id))
              .filter(Boolean)
              .sort((a, b) => fullName(a).localeCompare(fullName(b)));
            const highlighted =
              selectedId && (fam.parents.includes(selectedId) || fam.children.includes(selectedId));
            return (
              <div
                key={i}
                id={`family-${fam.key}`}
                className={`bg-panel card-shadow border rounded-lg overflow-hidden ${
                  highlighted ? "border-accent ring-1 ring-accent/40" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 border-b border-border">
                  {parents.map((person, idx) => (
                    <Fragment key={person.id}>
                      {idx > 0 && <span className="text-accent font-medium shrink-0">&</span>}
                      <ParentChip
                        person={person}
                        selected={selectedId === person.id}
                        onClick={onOpenFamily}
                      />
                    </Fragment>
                  ))}
                  {children.length > 0 && (
                    <span className="text-xs text-ink-subtle ml-auto shrink-0">
                      {children.length} enfant{children.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {children.length > 0 && (
                  <div className="px-3 py-2">
                    <div className="grid gap-0.5">
                      {children.map((child) => (
                        <MemberRow
                          key={child.id}
                          person={child}
                          selected={selectedId === child.id}
                          onClick={onOpenFamily}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isolated.length > 0 && (
        <div className="mt-10">
          <h3 className="font-display text-lg text-ink mb-4">Autres membres</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isolated.map((person) => (
              <button
                key={person.id}
                onClick={() => onOpenFamily(person.id)}
                className={`flex items-center gap-3 bg-panel card-shadow border rounded-lg px-4 py-3 text-left transition-colors ${
                  selectedId === person.id ? "border-accent" : "border-border hover:border-border-hover"
                }`}
              >
                <Avatar person={person} size="w-10 h-10" />
                <span
                  className={`text-sm font-medium min-w-0 truncate ${
                    person.deceased ? "text-ink-muted line-through" : "text-ink-light"
                  }`}
                >
                  {fullName(person)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
