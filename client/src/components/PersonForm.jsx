import { X, User as UserIcon, Flag, MessageSquare } from "lucide-react";
import Field from "./Field";
import Avatar from "./Avatar";
import { fileToDataUrl } from "../utils/image";

const inputClass = (hasError) =>
  `w-full bg-panel-input text-ink-light border rounded-md px-3 py-2 text-sm outline-none focus:border-accent transition-colors ${
    hasError ? "border-danger" : "border-border"
  }`;

function ParentRow({ label, firstName, lastName, deceased, onFirstName, onLastName, onDeceased, error }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-muted mb-1.5">
        <UserIcon size={14} />
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={firstName}
          onChange={(e) => onFirstName(e.target.value)}
          placeholder="Prénom"
          className={inputClass(error)}
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => onLastName(e.target.value)}
          placeholder="Nom"
          className={inputClass(error)}
        />
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

export default function PersonForm({
  editingId,
  form,
  setForm,
  errors,
  status,
  saving,
  onSubmit,
  onCancelEdit,
}) {
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

        {status && (
          <p className={`text-xs font-mono animate-fade-in ${status.type === "success" ? "text-success" : "text-danger"}`}>
            {status.text}
          </p>
        )}
      </form>
    </div>
  );
}
