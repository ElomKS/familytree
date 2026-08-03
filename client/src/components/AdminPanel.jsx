import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Key } from "lucide-react";
import { fetchAuthUsers, createAuthUser, deleteAuthUser, changePassword, resetUserPassword } from "../api/userService";

export default function AdminPanel({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchAuthUsers().then(setUsers).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleCreate(ev) {
    ev.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const created = await createAuthUser(username, password, role);
      setUsers((prev) => [created, ...prev]);
      setUsername("");
      setPassword("");
      setRole("staff");
      setSuccess("Compte créé.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    setSuccess("");
    try {
      await deleteAuthUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (resetTarget?.id === id) { setResetTarget(null); setResetPwd(""); }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleChangePassword(ev) {
    ev.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    setPwdLoading(true);
    try {
      await changePassword(currentPwd, newPwd);
      setPwdSuccess("Mot de passe modifié.");
      setCurrentPwd("");
      setNewPwd("");
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  }

  async function handleResetPassword(ev) {
    ev.preventDefault();
    setResetError("");
    setResetSuccess("");
    setResetLoading(true);
    try {
      await resetUserPassword(resetTarget.id, resetPwd);
      setResetSuccess(`Mot de passe de ${resetTarget.username} modifié.`);
      setResetPwd("");
      setTimeout(() => { setResetTarget(null); setResetSuccess(""); }, 1500);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50 animate-fade-in">
      <div className="bg-panel card-shadow-lg border border-border rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-accent" />
            <h3 className="font-display text-lg text-ink-light">Gérer les comptes</h3>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-light text-sm transition-colors">Fermer</button>
        </div>

        <form onSubmit={handleCreate} className="space-y-3 mb-5 border border-border rounded-md p-4">
          <p className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-2">Nouveau compte</p>
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-panel-input border border-border rounded-md px-3 py-2 text-ink-light text-sm outline-none focus:border-accent transition-colors"
          />
          <input
            type="password"
            placeholder="Mot de passe (min. 6 caractères)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-panel-input border border-border rounded-md px-3 py-2 text-ink-light text-sm outline-none focus:border-accent transition-colors"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-panel-input border border-border rounded-md px-3 py-2 text-ink-light text-sm outline-none focus:border-accent transition-colors"
          >
            <option value="staff">Staff (pas de suppression)</option>
            <option value="admin">Admin (accès complet)</option>
          </select>
          {error && <p className="text-danger text-sm animate-fade-in">{error}</p>}
          {success && <p className="text-success text-sm animate-fade-in">{success}</p>}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-md bg-accent text-panel font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            <Plus size={14} /> {loading ? "Création..." : "Créer le compte"}
          </button>
        </form>

        <div className="mb-5">
          <p className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-3">Comptes existants</p>
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between bg-panel-input border border-border rounded-md px-3 py-2">
                <div>
                  <span className="text-ink-light text-sm">{u.username}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded font-semibold ${u.role === "admin" ? "bg-accent/20 text-accent" : "bg-[#2D5A3E] text-white"}`}>
                    {u.role}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setResetTarget(u); setResetPwd(""); setResetError(""); setResetSuccess(""); }}
                    className="text-ink-muted hover:text-accent transition-colors"
                    aria-label={`Changer le mot de passe de ${u.username}`}
                  >
                    <Key size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-ink-muted hover:text-danger transition-colors"
                    aria-label={`Supprimer ${u.username}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {resetTarget && (
          <form onSubmit={handleResetPassword} className="space-y-3 border border-accent/30 rounded-md p-4 mb-5 animate-fade-in">
            <p className="text-xs font-mono text-accent uppercase tracking-wider mb-2">
              Nouveau mot de passe pour <span className="text-ink-light">{resetTarget.username}</span>
            </p>
            <input
              type="password"
              placeholder="Nouveau mot de passe (min. 6 caractères)"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              className="w-full bg-panel-input border border-border rounded-md px-3 py-2 text-ink-light text-sm outline-none focus:border-accent transition-colors"
              autoFocus
            />
            {resetError && <p className="text-danger text-sm animate-fade-in">{resetError}</p>}
            {resetSuccess && <p className="text-success text-sm animate-fade-in">{resetSuccess}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={resetLoading || !resetPwd}
                className="flex-1 text-sm px-4 py-2 rounded-md bg-accent text-panel font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {resetLoading ? "Modification..." : "Modifier"}
              </button>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="text-sm px-4 py-2 rounded-md border border-border text-ink-muted hover:text-ink-light transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 border border-border rounded-md p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key size={14} className="text-accent" />
            <p className="text-xs font-mono text-ink-muted uppercase tracking-wider">Changer mon mot de passe</p>
          </div>
          <input
            type="password"
            placeholder="Mot de passe actuel"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            className="w-full bg-panel-input border border-border rounded-md px-3 py-2 text-ink-light text-sm outline-none focus:border-accent transition-colors"
          />
          <input
            type="password"
            placeholder="Nouveau mot de passe (min. 6 caractères)"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className="w-full bg-panel-input border border-border rounded-md px-3 py-2 text-ink-light text-sm outline-none focus:border-accent transition-colors"
          />
          {pwdError && <p className="text-danger text-sm animate-fade-in">{pwdError}</p>}
          {pwdSuccess && <p className="text-success text-sm animate-fade-in">{pwdSuccess}</p>}
          <button
            type="submit"
            disabled={pwdLoading || !currentPwd || !newPwd}
            className="w-full text-sm px-4 py-2 rounded-md border border-border text-ink-muted hover:text-ink-light transition-colors disabled:opacity-50"
          >
            {pwdLoading ? "Modification..." : "Modifier le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
