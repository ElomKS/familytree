import { useEffect, useState } from "react";
import { X, User as UserIcon, Flag, MessageSquare } from "lucide-react";
import Field from "./Field";
import Avatar from "./Avatar";
import { fullName } from "../utils/person";
import { fileToDataUrl } from "../utils/image";

const inputClass = (hasError) =>
  `w-full bg-panel-input text-ink-light border rounded-md px-3 py-2 text-sm outline-none focus:border-accent transition-colors ${
    hasError ? "border-danger" : "border-border"
  }`;

function ParentRow({ label, firstName, lastName, deceased, onFirstName, onLastName, onDeceased, error, suggestions, active, onActivate, onPick }) {
  return (
    <div data-picker>
      <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-muted mb-1.5">
        <UserIcon size={14} />
        {label}
      </label>
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={firstName}
            onFocus={onActivate}
            onChange={(e) => onFirstName(e.target.value)}
            placeholder="Prénom"
            className={inputClass(error)}
          />
          <input
            type="text"
            value={lastName}
            onFocus={onActivate}
            onChange={(e) => onLastName(e.target.value)}
            placeholder="Nom"
            className={inputClass(error)}
          />
        </div>
        {active && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 z-20 mt-1 bg-panel border border-border rounded-md shadow-lg overflow-auto max-h-52">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onPick(p)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ink/10 transition-colors"
                >
                  <Avatar person={p} size="w-6 h-6" />
                  <span className="min-w-0 flex-1 truncate">{fullName(p)}</span>
                  {p.deceased && <span className="text-xs text-ink-subtle shrink-0">†</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <label className="mt-2 flex items-center gap-1.5 text-xs text-ink-light cursor-pointer select-none">
        <input
          type="checkbox"
          checked={deceased}
          onChange={(e) => onDeceased(e.target.checked)}
          className="w-3.5 h-3.5 accent-[#C79A56]"
        />
        Décédé(e)
      </label>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

const OTHER = { father: ["mother", "spouse"], mother: ["father", "spouse"], spouse: ["father", "mother"] };

export default function PersonForm({
  editingId,
  people,
  form,
  setForm,
  errors,
  saving,
  onSubmit,
  onCancelEdit,
}) {
  const [activePicker, setActivePicker] = useState(null);

  useEffect(() => {
    function handle(e) {
      if (!e.target.closest("[data-picker]")) setActivePicker(null);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const nameOf = (fn, ln) => `${fn || ""} ${ln || ""}`.trim().toLowerCase();
  const typed = {
    father: nameOf(form.fatherFirstName, form.fatherLastName),
    mother: nameOf(form.motherFirstName, form.motherLastName),
    spouse: nameOf(form.spouseFirstName, form.spouseLastName),
  };

  function suggest(key) {
    const q = typed[key];
    if (!q) return [];
    const seen = OTHER[key].map((k) => typed[k]).filter(Boolean);
    const genderOk = (p) => {
      if (key === "father") return p.gender !== "femme";
      if (key === "mother") return p.gender !== "homme";
      if (form.gender === "femme") return p.gender !== "femme";
      if (form.gender === "homme") return p.gender !== "homme";
      return true;
    };
    return people
      .filter((p) => p.id !== editingId)
      .filter((p) => fullName(p).toLowerCase().includes(q))
      .filter((p) => !seen.includes(fullName(p).toLowerCase()))
      .filter(genderOk)
      .slice(0, 6);
  }

  function pick(key) {
    return (p) => {
      if (key === "father") {
        setForm({ ...form, fatherFirstName: p.firstName, fatherLastName: p.lastName || "", fatherDeceased: !!p.deceased });
      } else if (key === "mother") {
        setForm({ ...form, motherFirstName: p.firstName, motherLastName: p.lastName || "", motherDeceased: !!p.deceased });
      } else {
        setForm({ ...form, spouseFirstName: p.firstName, spouseLastName: p.lastName || "", spouseDeceased: !!p.deceased });
      }
      setActivePicker(null);
    };
  }

  async function handlePhoto(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm({ ...form, photoUrl: dataUrl });
    } catch {
      setForm({ ...form, photoUrl: "" });
    }
  }

  return (
    <div className="bg-panel card-shadow border border-border rounded-lg overflow-hidden h-fit">
      <div className="stub-line px-5 py-3 border-b border-border flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-accent">
          {editingId ? "Modifier le membre" : "Nouveau membre"}
        </span>
        {editingId && (
          <button
            onClick={onCancelEdit}
            className="text-ink-muted hover:text-ink-light transition-colors"
            aria-label="Annuler la modification"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar
            person={{ firstName: form.firstName, lastName: form.lastName, photoUrl: form.photoUrl, deceased: false }}
            size="w-14 h-14"
            textSize="text-base"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm px-3 py-1.5 rounded-md border border-border text-ink-muted hover:text-ink-light transition-colors cursor-pointer w-fit">
              {form.photoUrl ? "Changer la photo" : "Ajouter une photo"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
            {form.photoUrl && (
              <button
                type="button"
                onClick={() => setForm({ ...form, photoUrl: "" })}
                className="text-xs text-ink-muted hover:text-danger transition-colors w-fit"
              >
                Retirer la photo
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Prénom"
            icon={<UserIcon size={14} />}
            error={errors.firstName}
            input={
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="Prénom"
                className={inputClass(errors.firstName)}
              />
            }
          />
          <Field
            label="Nom"
            icon={<UserIcon size={14} />}
            error={errors.lastName}
            input={
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Nom"
                className={inputClass(errors.lastName)}
              />
            }
          />
        </div>

        <Field
          label="Genre"
          icon={<Flag size={14} />}
          error={errors.gender}
          input={
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className={inputClass(errors.gender)}
            >
              <option value="">—</option>
              <option value="femme">Femme</option>
              <option value="homme">Homme</option>
              <option value="autre">Autre</option>
            </select>
          }
        />

        <ParentRow
          label="Père"
          firstName={form.fatherFirstName}
          lastName={form.fatherLastName}
          deceased={form.fatherDeceased}
          error={errors.fatherName}
          onFirstName={(v) => setForm({ ...form, fatherFirstName: v })}
          onLastName={(v) => setForm({ ...form, fatherLastName: v })}
          onDeceased={(v) => setForm({ ...form, fatherDeceased: v })}
          suggestions={activePicker === "father" ? suggest("father") : []}
          active={activePicker === "father"}
          onActivate={() => setActivePicker("father")}
          onPick={pick("father")}
        />
        <ParentRow
          label="Mère"
          firstName={form.motherFirstName}
          lastName={form.motherLastName}
          deceased={form.motherDeceased}
          error={errors.motherName}
          onFirstName={(v) => setForm({ ...form, motherFirstName: v })}
          onLastName={(v) => setForm({ ...form, motherLastName: v })}
          onDeceased={(v) => setForm({ ...form, motherDeceased: v })}
          suggestions={activePicker === "mother" ? suggest("mother") : []}
          active={activePicker === "mother"}
          onActivate={() => setActivePicker("mother")}
          onPick={pick("mother")}
        />
        <ParentRow
          label={form.gender === "femme" ? "Conjoint" : form.gender === "homme" ? "Conjointe" : "Conjoint(e)"}
          firstName={form.spouseFirstName}
          lastName={form.spouseLastName}
          deceased={form.spouseDeceased}
          error={errors.spouseName}
          onFirstName={(v) => setForm({ ...form, spouseFirstName: v })}
          onLastName={(v) => setForm({ ...form, spouseLastName: v })}
          onDeceased={(v) => setForm({ ...form, spouseDeceased: v })}
          suggestions={activePicker === "spouse" ? suggest("spouse") : []}
          active={activePicker === "spouse"}
          onActivate={() => setActivePicker("spouse")}
          onPick={pick("spouse")}
        />
        <p className="text-xs text-ink-subtle -mt-2">
          Les frères et sœurs sont déduits automatiquement : deux membres partageant les mêmes parents.
        </p>

        <Field
          label="Notes (facultatif)"
          icon={<MessageSquare size={14} />}
          input={
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes (facultatif)"
              rows={3}
              className="w-full bg-panel-input text-ink-light border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent transition-colors resize-none"
            />
          }
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-accent text-panel-input font-medium text-sm rounded-md py-2.5 hover:bg-accent-hover transition-colors disabled:opacity-60"
        >
          {editingId ? "Enregistrer" : "Ajouter le membre"}
        </button>
      </form>
    </div>
  );
}