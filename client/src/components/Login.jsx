import { useState } from "react";
import { Lock, User } from "lucide-react";
import { login } from "../api/userService";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(username, password);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-surface via-surface-dark to-surface-deep flex items-center justify-center px-6">
      <div className="bg-panel card-shadow border border-border rounded-lg p-8 max-w-sm w-full animate-slide-up">
        <div className="h-1 w-16 bg-accent rounded-full mb-6" />
        <h1 className="font-display text-2xl text-ink-light mb-1">Connexion</h1>
        <p className="text-sm text-ink-muted mb-6">Accédez au registre des utilisateurs.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1.5 font-mono uppercase tracking-wider">Nom d'utilisateur</label>
            <div className="flex items-center gap-2 bg-panel-input border border-border rounded-md px-3 py-2 focus-within:border-accent transition-colors">
              <User size={14} className="text-ink-subtle" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent text-ink-light text-sm outline-none"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink-muted mb-1.5 font-mono uppercase tracking-wider">Mot de passe</label>
            <div className="flex items-center gap-2 bg-panel-input border border-border rounded-md px-3 py-2 focus-within:border-accent transition-colors">
              <Lock size={14} className="text-ink-subtle" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-ink-light text-sm outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-danger text-sm animate-fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm px-4 py-2.5 rounded-md bg-accent text-panel font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
