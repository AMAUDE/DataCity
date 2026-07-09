import "./globals.css";
import "leaflet/dist/leaflet.css";
import Nav from "@/components/Nav";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "DataCity — Bibliothèque géographique de Côte d'Ivoire",
  description:
    "Base de référence multi-sources des données géographiques vérifiées de Côte d'Ivoire : infrastructures, limites administratives, cartographie et téléchargement.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1220",
};

export default async function RootLayout({ children }) {
  const session = await getSession();
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        <Nav user={session} />
        <main className="flex-1 w-full">{children}</main>
        <footer className="border-t border-white/5 py-6 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-sm text-slate-400 flex flex-col sm:flex-row gap-2 justify-between">
            <span>DataCity — Bibliothèque de référence des données géographiques de Côte d'Ivoire</span>
            <span>Données multi-sources · vérifiées · téléchargeables</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
