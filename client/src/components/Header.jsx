import { LogOut, Moon, Sun, Users } from "lucide-react";
import { todayStamp } from "../api/userService";

export default function Header({ personCount, role, username, onLogout, onOpenAdmin, light, onToggleTheme }) {
  return (
    <header className="mb-8">
      <div className="h-1 w-24 bg-accent rounded-full mb-6" />
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="font-mono text-xs tracking-widest text-accent uppercase mb-2">Famille / Généalogie</p>
          <h1 className="font-display text-4xl font-medium">Arbre généalogique</h1>
          <p className="text-ink-muted mt-2 text-sm">Gérez les membres de votre famille et leurs liens.</p>
        </div>
        <div className="font-mono text-right text-xs text-ink-muted hidden sm:flex sm:flex-col sm:items-end sm:gap-1">
          <p>{personCount} membres</p>
          <p>{todayStamp()}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium" style={{ backgroundColor: "rgba(199,154,86,0.2)", color: "#111827" }}>{role}</span>
            <span className="text-ink">{username}</span>
            {role === "admin" && (
              <button onClick={onOpenAdmin} className="text-ink-muted hover:text-accent transition-colors" aria-label="Gérer les comptes">
                <Users size={13} />
              </button>
            )}
            <button onClick={onToggleTheme} className="text-ink-muted hover:text-accent transition-colors" aria-label="Basculer le thème" title="Thème clair / sombre">
              {light ? <Moon size={13} /> : <Sun size={13} />}
            </button>
            <button onClick={onLogout} className="text-ink-muted hover:text-danger transition-colors" aria-label="Déconnexion">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
