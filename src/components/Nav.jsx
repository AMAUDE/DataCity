"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/themes", label: "Thématiques" },
  { href: "/donnees", label: "Explorer" },
  { href: "/carte", label: "Cartographie" },
  { href: "/sources", label: "Sources" },
];

export default function Nav({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  const active = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-[500] backdrop-blur bg-ci-dark/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="w-3 h-6 rounded-sm bg-ci-orange" />
          <span className="w-3 h-6 -ml-1.5 rounded-sm bg-white/90" />
          <span className="w-3 h-6 -ml-1.5 rounded-sm bg-ci-green" />
          <span className="ml-1">DataCity<span className="text-ci-orange">.ci</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-lg text-sm ${
                active(l.href) ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link href="/admin/import" className="btn-ghost text-xs">Importer</Link>
              )}
              <span className="text-sm text-slate-300">{user.name || user.email}</span>
              <button onClick={logout} className="btn-ghost text-xs">Déconnexion</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-xs">Connexion</Link>
              <Link href="/register" className="btn-primary text-xs">Créer un compte</Link>
            </>
          )}
        </div>

        <button
          className="md:hidden btn-ghost px-2 py-1"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 px-4 py-3 space-y-1 bg-ci-dark">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${
                active(l.href) ? "bg-white/10 text-white" : "text-slate-300"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
            {user ? (
              <>
                {user.role === "admin" && (
                  <Link href="/admin/import" onClick={() => setOpen(false)} className="btn-ghost">Importer des données</Link>
                )}
                <span className="text-sm text-slate-400 px-1">{user.name || user.email}</span>
                <button onClick={logout} className="btn-ghost">Déconnexion</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="btn-ghost">Connexion</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn-primary">Créer un compte</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
