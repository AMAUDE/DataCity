"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthForm({ mode }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Une erreur est survenue.");
      return;
    }
    router.refresh();
    router.push("/donnees");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">
          {isRegister ? "Créer un compte" : "Connexion"}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          L'identification est requise pour télécharger les données.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {isRegister && (
            <div>
              <label className="text-sm text-slate-300">Nom</label>
              <input className="input mt-1" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Votre nom" />
            </div>
          )}
          <div>
            <label className="text-sm text-slate-300">Email</label>
            <input type="email" required className="input mt-1" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vous@exemple.ci" />
          </div>
          <div>
            <label className="text-sm text-slate-300">Mot de passe</label>
            <input type="password" required className="input mt-1" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button disabled={loading} className="btn-primary w-full">
            {loading ? "…" : isRegister ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>
        <div className="mt-4 text-sm text-slate-400">
          {isRegister ? (
            <>Déjà un compte ? <Link href="/login" className="text-ci-orange hover:underline">Se connecter</Link></>
          ) : (
            <>Pas de compte ? <Link href="/register" className="text-ci-orange hover:underline">Créer un compte</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
