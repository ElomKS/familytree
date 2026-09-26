import { useState, useMemo, useEffect, useRef } from "react";
import { List, Trash2, Users, Download, Upload } from "lucide-react";
import { getAuthUser, logout } from "../api/userService";
import {
  fetchPeople,
  fetchRelationships,
  createPerson,
  updatePerson,
  deletePerson,
  createRelationship,
  deleteRelationship,
} from "../api/familyService";
import Header from "./Header";
import PersonForm from "./PersonForm";
import PersonList from "./PersonList";
import PersonDetailPanel from "./PersonDetailPanel";
import DeleteConfirmModal from "./DeleteConfirmModal";
import AdminPanel from "./AdminPanel";
import FamilyCards from "./FamilyCards";
import FamilyTree from "./FamilyTree";
import RelationshipPicker from "./RelationshipPicker";
import Toast from "./Toast";
import { fullName, normalizeName } from "../utils/person";
import { buildGedcom, downloadGedcom, parseGedcom } from "../utils/gedcom";

const emptyForm = { firstName: "", lastName: "", gender: "", photoUrl: "", fatherFirstName: "", fatherLastName: "", fatherDeceased: false, motherFirstName: "", motherLastName: "", motherDeceased: false, spouseFirstName: "", spouseLastName: "", spouseDeceased: false, notes: "" };

function findByName(people, name) {
  const normalized = normalizeName(name);
  return people.find((p) => normalizeName(fullName(p)) === normalized);
}

export default function FamilyApp() {
  const [people, setPeople] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [view, setView] = useState("registre");
  const [pickerFor, setPickerFor] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [formHidden, setFormHidden] = useState(false);
  const [backState, setBackState] = useState(null);
  const [pendingTestCleanup, setPendingTestCleanup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [light, setLight] = useState(() => (localStorage.getItem("family-theme") || "dark") === "light");
  const fileInputRef = useRef(null);

  const authUser = getAuthUser();
  const isAdmin = authUser?.role === "admin";

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
    localStorage.setItem("family-theme", light ? "light" : "dark");
  }, [light]);

  useEffect(() => {
    Promise.all([fetchPeople(), fetchRelationships()])
      .then(([p, r]) => {
        setPeople(p);
        setRelationships(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => fullName(p).toLowerCase().includes(q));
  }, [people, query]);

  const testPeople = useMemo(
    () => people.filter((p) => (p.notes || "").startsWith("[TEST]")),
    [people]
  );

  const stats = useMemo(() => {
    const deceased = people.filter((p) => p.deceased).length;
    const families = new Map();
    for (const p of people) {
      const key = (p.lastName || "").trim();
      if (key) families.set(key, (families.get(key) || 0) + 1);
    }
    const top = [...families.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3);
    const byDay = new Map();
    for (const p of people) {
      const day = (p.createdAt || "").slice(0, 10);
      if (day) byDay.set(day, (byDay.get(day) || 0) + 1);
    }
    const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
    const parentLinks = relationships.filter((r) => r.relationshipType === "parent").length;
    const familyCount = people.length
      ? new Set(people.map((p) => (p.lastName || "").trim()).filter(Boolean)).size
      : 0;
    return { deceased, top, days, parentLinks, familyCount };
  }, [people, relationships]);

  function validate(values) {
    const e = {};
    if (!values.firstName.trim()) e.firstName = "Le prénom est requis.";
    if (!values.lastName.trim()) e.lastName = "Le nom est requis.";
    if (!values.gender) e.gender = "Le genre est requis.";
    const selfName = normalizeName(`${values.firstName} ${values.lastName}`);
    if (selfName && normalizeName(`${values.fatherFirstName} ${values.fatherLastName}`) === selfName) {
      e.fatherName = "Ne peut pas être la personne elle-même.";
    }
    if (selfName && normalizeName(`${values.motherFirstName} ${values.motherLastName}`) === selfName) {
      e.motherName = "Ne peut pas être la personne elle-même.";
    }
    if (selfName && normalizeName(`${values.spouseFirstName} ${values.spouseLastName}`) === selfName) {
      e.spouseName = "Ne peut pas être la personne elle-même.";
    }
    return e;
  }

  async function resolveParent(firstName, lastName, gender, deceased) {
    const f = firstName.trim();
    const l = lastName.trim();
    if (!f && !l) return null;
    let parent = findByName(people, `${f} ${l}`.trim());
    if (!parent) {
      parent = await createPerson({ firstName: f, lastName: l || null, deceased: !!deceased, gender, notes: "" });
      setPeople((prev) => [parent, ...prev]);
      return parent;
    }
    if (deceased && !parent.deceased) {
      const updated = await updatePerson(parent.id, { ...parent, deceased: true });
      setPeople((prev) => prev.map((p) => (p.id === parent.id ? updated : p)));
      parent = updated;
    }
    return parent;
  }

  function resetForm() {
    setForm(emptyForm);
    setErrors({});
    setEditingId(null);
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    setStatus(null);
    try {
      const existing = editingId ? people.find((p) => p.id === editingId) : null;
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        deceased: existing ? !!existing.deceased : false,
        deathDate: existing ? existing.deathDate : null,
        gender: form.gender,
        photoUrl: form.photoUrl || null,
        notes: form.notes,
      };
      const dad = await resolveParent(form.fatherFirstName, form.fatherLastName, "homme", form.fatherDeceased);
      const mom = await resolveParent(form.motherFirstName, form.motherLastName, "femme", form.motherDeceased);
      const spouseGender = form.gender === "femme" ? "homme" : form.gender === "homme" ? "femme" : "";
      const spouse = await resolveParent(form.spouseFirstName, form.spouseLastName, spouseGender, form.spouseDeceased);
      const desired = [dad, mom].filter(Boolean);

      if (editingId) {
        const updated = await updatePerson(editingId, body);
        setPeople((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        const currentParents = relationships.filter(
          (r) => r.relationshipType === "parent" && r.relatedPersonId === editingId
        );
        const currentIds = new Set(currentParents.map((r) => r.personId));
        const toRemove = currentParents.filter((r) => !desired.some((p) => p.id === r.personId));
        const toAdd = desired.filter((p) => !currentIds.has(p.id));
        await Promise.all(toRemove.map((r) => deleteRelationship(r.id)));
        const added = await Promise.all(
          toAdd.map((p) =>
            createRelationship({ personId: p.id, relatedPersonId: editingId, relationshipType: "parent" })
          )
        );
        setRelationships((prev) => [
          ...prev.filter((r) => !toRemove.some((x) => x.id === r.id)),
          ...added,
        ]);
        const currentSpouses = relationships.filter(
          (r) => r.relationshipType === "spouse" && (r.personId === editingId || r.relatedPersonId === editingId)
        );
        const spouseIds = new Set(
          currentSpouses.map((r) => (r.personId === editingId ? r.relatedPersonId : r.personId))
        );
        if (spouse) {
          const toRemoveSpouse = currentSpouses.filter(
            (r) => (r.personId === editingId ? r.relatedPersonId : r.personId) !== spouse.id
          );
          if (toRemoveSpouse.length) {
            await Promise.all(toRemoveSpouse.map((r) => deleteRelationship(r.id)));
            setRelationships((prev) => prev.filter((r) => !toRemoveSpouse.some((x) => x.id === r.id)));
          }
          if (!spouseIds.has(spouse.id)) {
            const sp = await createRelationship({
              personId: editingId,
              relatedPersonId: spouse.id,
              relationshipType: "spouse",
            });
            setRelationships((prev) => [...prev, sp]);
          }
        } else if (currentSpouses.length) {
          await Promise.all(currentSpouses.map((r) => deleteRelationship(r.id)));
          setRelationships((prev) => prev.filter((r) => !currentSpouses.some((x) => x.id === r.id)));
        }
        setStatus({ type: "success", text: "Membre mis à jour." });
      } else {
        const created = await createPerson(body);
        setPeople((prev) => [created, ...prev]);
        const rels = await Promise.all(
          desired.map((p) =>
            createRelationship({ personId: p.id, relatedPersonId: created.id, relationshipType: "parent" })
          )
        );
        if (rels.length) setRelationships((prev) => [...prev, ...rels]);
        if (spouse) {
          const sp = await createRelationship({
            personId: created.id,
            relatedPersonId: spouse.id,
            relationshipType: "spouse",
          });
          setRelationships((prev) => [...prev, sp]);
        }
        setStatus({ type: "success", text: "Membre ajouté." });
      }
      resetForm();
    } catch {
      setStatus({ type: "error", text: "Impossible d'enregistrer. Réessayez." });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(person) {
    setView("registre");
    setFormHidden(false);
    let fatherFirstName = "";
    let fatherLastName = "";
    let motherFirstName = "";
    let motherLastName = "";
    let fatherDeceased = false;
    let motherDeceased = false;
    let spouseFirstName = "";
    let spouseLastName = "";
    let spouseDeceased = false;
    for (const r of relationships) {
      if (r.relationshipType !== "parent" || r.relatedPersonId !== person.id) continue;
      const parent = people.find((p) => p.id === r.personId);
      if (!parent) continue;
      if (parent.gender === "femme" && !motherFirstName) {
        motherFirstName = parent.firstName;
        motherLastName = parent.lastName || "";
        motherDeceased = !!parent.deceased;
      } else if (parent.gender === "homme" && !fatherFirstName) {
        fatherFirstName = parent.firstName;
        fatherLastName = parent.lastName || "";
        fatherDeceased = !!parent.deceased;
      } else if (!fatherFirstName) {
        fatherFirstName = parent.firstName;
        fatherLastName = parent.lastName || "";
        fatherDeceased = !!parent.deceased;
      } else if (!motherFirstName) {
        motherFirstName = parent.firstName;
        motherLastName = parent.lastName || "";
        motherDeceased = !!parent.deceased;
      }
    }
    for (const r of relationships) {
      if (r.relationshipType !== "spouse" || (r.personId !== person.id && r.relatedPersonId !== person.id)) continue;
      const otherId = r.personId === person.id ? r.relatedPersonId : r.personId;
      const spouse = people.find((p) => p.id === otherId);
      if (spouse) {
        spouseFirstName = spouse.firstName;
        spouseLastName = spouse.lastName || "";
        spouseDeceased = !!spouse.deceased;
        break;
      }
    }
    setEditingId(person.id);
    setForm({
      firstName: person.firstName,
      lastName: person.lastName || "",
      gender: person.gender || "",
      photoUrl: person.photoUrl || "",
      fatherFirstName,
      fatherLastName,
      fatherDeceased,
      motherFirstName,
      motherLastName,
      motherDeceased,
      spouseFirstName,
      spouseLastName,
      spouseDeceased,
      notes: person.notes || "",
    });
    setErrors({});
    setStatus(null);
  }

  async function confirmDelete() {
    const id = pendingDelete;
    setPendingDelete(null);
    setSelectedPerson(null);
    try {
      await deletePerson(id);
      setPeople((prev) => prev.filter((p) => p.id !== id));
      setRelationships((prev) =>
        prev.filter((r) => r.personId !== id && r.relatedPersonId !== id)
      );
      if (editingId === id) resetForm();
      setStatus({ type: "success", text: "Membre supprimé." });
    } catch {
      setStatus({ type: "error", text: "Impossible de supprimer ce membre." });
    }
  }

  async function handleCreateRelationship(type, nameOrId) {
    const current = pickerFor;
    setPickerFor(null);
    if (!current) return;
    let otherId = nameOrId;
    if (!people.some((p) => p.id === nameOrId)) {
      const parts = nameOrId.trim().split(/\s+/);
      const resolved = await resolveParent(parts[0] || "", parts.slice(1).join(" "), "", false);
      if (!resolved) {
        setStatus({ type: "error", text: "Veuillez indiquer un membre valide." });
        return;
      }
      otherId = resolved.id;
    }
    const body =
      type === "parent"
        ? { personId: otherId, relatedPersonId: current.id, relationshipType: "parent" }
        : type === "child"
        ? { personId: current.id, relatedPersonId: otherId, relationshipType: "parent" }
        : { personId: current.id, relatedPersonId: otherId, relationshipType: "spouse" };
    try {
      const created = await createRelationship(body);
      setRelationships((prev) => [...prev, created]);
      setStatus({ type: "success", text: "Lien ajouté." });
    } catch {
      setStatus({ type: "error", text: "Impossible de créer le lien." });
    }
  }

  async function handleRemoveRelationship(rel) {
    try {
      await deleteRelationship(rel.id);
      setRelationships((prev) => prev.filter((r) => r.id !== rel.id));
      setStatus({ type: "success", text: "Lien retiré." });
    } catch {
      setStatus({ type: "error", text: "Impossible de retirer le lien." });
    }
  }

  async function handleCleanupTest() {
    const ids = testPeople.map((p) => p.id);
    setPendingTestCleanup(false);
    try {
      for (const id of ids) await deletePerson(id);
      setPeople((prev) => prev.filter((p) => !ids.includes(p.id)));
      setRelationships((prev) =>
        prev.filter((r) => !ids.includes(r.personId) && !ids.includes(r.relatedPersonId))
      );
      if (ids.includes(focusId)) setFocusId(null);
      if (editingId && ids.includes(editingId)) resetForm();
      setStatus({ type: "success", text: `${ids.length} membre(s) de test supprimé(s).` });
    } catch {
      setStatus({ type: "error", text: "Nettoyage impossible. Réessayez." });
    }
  }

  function handleLogout() {
    logout().finally(() => window.location.reload());
  }

  function selectPerson(id) {
    setSelectedPerson(people.find((p) => p.id === id) || null);
  }

  function viewFamily(id) {
    if (view === "arbre" && focusId === id) return;
    setBackState({ view, focusId });
    setFocusId(id);
    setSelectedPerson(null);
    setView("arbre");
  }

  function openFamily(id) {
    if (view === "arbre" && focusId === id) {
      const parents = relationships
        .filter((r) => r.relationshipType === "parent" && r.relatedPersonId === id)
        .map((r) => people.find((p) => p.id === r.personId))
        .filter(Boolean);
      const up = parents.find((p) => p.gender === "homme") || parents[0];
      if (up) {
        setFocusId(up.id);
        setSelectedPerson(up);
        setView("arbre");
        return;
      }
      const prev = backState;
      setBackState(null);
      if (prev && prev.view === "arbre") {
        setFocusId(prev.focusId);
        setSelectedPerson(people.find((p) => p.id === prev.focusId) || null);
        setView("arbre");
      } else {
        setFocusId(null);
        setView("registre");
        setSelectedPerson(null);
      }
      return;
    }
    setBackState({ view, focusId });
    setFocusId(id);
    setView("arbre");
    setSelectedPerson(people.find((p) => p.id === id) || null);
  }

  function handleExportGedcom() {
    const text = buildGedcom(people, relationships);
    downloadGedcom(text);
  }

  async function handleImportFile(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setStatus(null);
    try {
      const text = await file.text();
      const { people: parsed, fams } = parseGedcom(text);
      if (!parsed.length) {
        setStatus({ type: "error", text: "Fichier GEDCOM invalide." });
        return;
      }
      const idMap = new Map();
      for (const p of parsed) {
        if (!p.firstName && !p.lastName) continue;
        const created = await createPerson({
          firstName: p.firstName,
          lastName: p.lastName || null,
          gender: p.gender || "",
          deceased: p.deceased,
          notes: p.notes || "",
        });
        idMap.set(p.xref, created.id);
        setPeople((prev) => [created, ...prev]);
      }
      const createdRels = [];
      for (const fam of fams) {
        const parents = [fam.husb, fam.wife].map((x) => idMap.get(x)).filter(Boolean);
        for (const childXref of fam.chil) {
          const childId = idMap.get(childXref);
          if (!childId) continue;
          for (const parentId of parents) {
            try {
              const rel = await createRelationship({
                personId: parentId,
                relatedPersonId: childId,
                relationshipType: "parent",
              });
              createdRels.push(rel);
            } catch {}
          }
        }
      }
      if (createdRels.length) setRelationships((prev) => [...prev, ...createdRels]);
      setStatus({ type: "success", text: `Import terminé : ${idMap.size} membre(s) ajouté(s).` });
    } catch {
      setStatus({ type: "error", text: "Impossible d'importer ce fichier." });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-surface via-surface-dark to-surface-deep text-ink font-sans">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="animate-pulse">
            <div className="h-12 w-72 bg-panel rounded-lg mb-8" />
            <div className="flex gap-4 mb-8">
              <div className="h-9 w-24 bg-panel rounded-md" />
              <div className="h-9 w-24 bg-panel rounded-md" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
              <div className="h-[520px] bg-panel rounded-lg" />
              <div className="h-[520px] bg-panel rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-surface via-surface-dark to-surface-deep text-ink font-sans">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <Header
          personCount={people.length}
          role={authUser?.role}
          username={authUser?.username}
          onLogout={handleLogout}
          onOpenAdmin={() => setAdminOpen(true)}
          light={light}
          onToggleTheme={() => setLight((v) => !v)}
        />

        <div className="flex gap-1 mb-8 bg-panel card-shadow border border-border rounded-md p-1 w-fit">
          <button
            onClick={() => { setBackState(null); setView("registre"); }}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-md transition-colors ${
              view === "registre" ? "bg-accent text-panel font-medium" : "text-ink-muted hover:text-ink-light"
            }`}
          >
            <List size={14} /> Registre
          </button>
          <button
            onClick={() => { setBackState(null); setView("arbre"); setFocusId(null); }}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-md transition-colors ${
              view === "arbre" ? "bg-accent text-panel font-medium" : "text-ink-muted hover:text-ink-light"
            }`}
          >
            <Users size={14} /> Familles
          </button>
        </div>

        {view === "registre" ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {[
                { label: "Membres", value: people.length },
                { label: "Familles (noms)", value: stats.familyCount },
                { label: "Liens de parenté", value: stats.parentLinks },
                { label: "Défunts", value: stats.deceased },
              ].map((s) => (
                <div key={s.label} className="bg-panel card-shadow border border-border rounded-lg px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">{s.label}</p>
                  <p className="font-display text-2xl mt-1 text-ink-light">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="bg-panel card-shadow border border-border rounded-lg px-4 py-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted mb-3">Plus grandes familles</p>
                {stats.top.length === 0 ? (
                  <p className="text-sm text-ink-subtle">Aucune donnée.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.top.map(([name, count]) => {
                      const max = stats.top[0][1];
                      return (
                        <div key={name}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-ink-muted">Famille {name}</span>
                            <span className="text-ink-muted tabular-nums">{count}</span>
                          </div>
                          <div className="h-1.5 bg-ink/10 rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="bg-panel card-shadow border border-border rounded-lg px-4 py-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted mb-3">Ajouts par jour</p>
                {stats.days.length === 0 ? (
                  <p className="text-sm text-ink-subtle">Aucune donnée.</p>
                ) : (
                  <div className="flex items-end gap-2 h-28">
                    {stats.days.map(([day, count]) => {
                      const max = Math.max(...stats.days.map((d) => d[1]));
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-ink-muted tabular-nums">{count}</span>
                          <div className="w-full bg-accent rounded-t" style={{ height: `${(count / max) * 70}px` }} />
                          <span className="text-[10px] text-ink-subtle truncate">{day.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          <div className={formHidden ? "grid grid-cols-1" : "grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8"}>
            {!formHidden && (
              <PersonForm
                editingId={editingId}
                people={people}
                form={form}
                setForm={setForm}
                errors={errors}
                saving={saving}
                onSubmit={handleSubmit}
                onCancelEdit={resetForm}
              />
            )}
            <PersonList
              people={filtered}
              allPeople={people}
              query={query}
              setQuery={setQuery}
              selectedPerson={selectedPerson}
              relationships={relationships}
              onSelect={(person) => {
                setSelectedPerson(person);
                setFormHidden(true);
              }}
              onShowForm={formHidden ? () => setFormHidden(false) : null}
              onCloseDetail={() => setSelectedPerson(null)}
              onEdit={startEdit}
              onDelete={isAdmin ? setPendingDelete : null}
              isAdmin={isAdmin}
              onAddRelationship={setPickerFor}
              onRemoveRelationship={handleRemoveRelationship}
              onViewFamily={viewFamily}
            />
          </div>
          </div>
        ) : (
          <div>
            {!focusId && (
              <div className="flex gap-2 mb-5">
                <button
                  onClick={handleExportGedcom}
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md bg-panel card-shadow border border-border text-ink-muted hover:text-ink-light transition-colors"
                >
                  <Download size={14} /> Exporter GEDCOM
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md bg-panel card-shadow border border-border text-ink-muted hover:text-ink-light transition-colors"
                    >
                      <Upload size={14} /> Importer GEDCOM
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".ged,text/plain,application/x-gedcom"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                    {testPeople.length > 0 && (
                      <button
                        onClick={() => setPendingTestCleanup(true)}
                        className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md bg-panel card-shadow border border-border text-danger hover:text-danger-hover transition-colors"
                      >
                        <Trash2 size={14} /> Nettoyer les données de test ({testPeople.length})
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            {focusId && (
              <div className="mb-6">
                <FamilyTree
                  people={people}
                  relationships={relationships}
                  rootId={focusId}
                  onOpenFamily={openFamily}
                />
              </div>
            )}
            <FamilyCards
              people={people}
              relationships={relationships}
              selectedId={selectedPerson?.id}
              onSelect={selectPerson}
              focusId={focusId}
              onOpenFamily={openFamily}
              onBack={() => { setBackState(null); setFocusId(null); }}
            />
            <PersonDetailPanel
              person={selectedPerson}
              people={people}
              relationships={relationships}
              onClose={() => setSelectedPerson(null)}
              onEdit={startEdit}
              onDelete={isAdmin ? setPendingDelete : null}
              isAdmin={isAdmin}
              onAddRelationship={setPickerFor}
              onRemoveRelationship={handleRemoveRelationship}
              onViewFamily={viewFamily}
            />
          </div>
        )}
      </div>

      {pendingDelete && (
        <DeleteConfirmModal onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />
      )}

      {pendingTestCleanup && testPeople.length > 0 && (
        <DeleteConfirmModal
          title="Supprimer toutes les données de test ?"
          message={`Ceci supprime définitivement les ${testPeople.length} membres fictifs (marqués [TEST]) ainsi que tous leurs liens. Vos membres réels sont conservés.`}
          confirmLabel="Tout supprimer"
          onConfirm={handleCleanupTest}
          onCancel={() => setPendingTestCleanup(false)}
        />
      )}

      {pickerFor && (
        <RelationshipPicker
          person={pickerFor}
          people={people}
          onClose={() => setPickerFor(null)}
          onCreate={handleCreateRelationship}
        />
      )}

      <AdminPanel isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
      <Toast status={status} onDismiss={() => setStatus(null)} />
    </div>
  );
}
