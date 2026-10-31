import { AdsenseLoader } from "@/components/adsense-loader";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { regionSchema } from "@/lib/albion/region-config";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { inter, barlowCondensed, barlowDisplay, geistMono } from "./fonts";
import "./globals.css";
import "./workspace.css";
import "./player-workspaces.css";
import "./product-shell.css";
import "./brand-interactions.css";
import "./playful-ui.css";
import "./task-ui.css";
import "./reference-system.css";
import "./workspace-fidelity.css";
import "./product-controls.css";
import "./workspace-depth.css";
import "./loadout-cards.css";
import "./motion-system.css";
import "./search-palette.css";
import "./build-grind-workspace.css";
import "./grind-rebuild.css";
import "./journal-workspace.css";
import "./fishing-workspace.css";
import "./build-archive-details.css";
import "./premium-system.css";
import "./outpost-workspaces.css";
import "./builds-discovery.css";
import "./library-tiles.css";
import "./builds-detail.css";
import "./builds-editor.css";
import "./teams-compositions.css";
import "./site-refinement.css";
import "./inventory-board.css";
import "./product-system.css";
import "./product-research.css";
import "./product-support.css";
import "./editor-workspaces.css";
export const metadata: Metadata = {
  title: { default: "Outpost | Albion tools", template: "%s | Outpost" },
  description:
    "Free Albion Online market research and planning tools. Clear data, transparent calculations, all three regions.",
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  const jar = await cookies();
  const session = await getServerSession(authOptions);
  const user = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { region: true, name: true, image: true },
      })
    : null;
  const initialRegion = regionSchema
    .catch("europe")
    .parse(jar.get("atlas-region")?.value || user?.region);
  const initialLight = jar.get("atlas-theme")?.value === "light";
  return (
    <html lang="en">
      <head>
        <AdsenseLoader />
      </head>
      <body
        className={`${inter.variable} ${barlowCondensed.variable} ${barlowDisplay.variable} ${geistMono.variable}`}
      >
        <Suspense fallback={<p>Loading Outpost…</p>}>
          <Shell
            key={`${initialRegion}:${initialLight}`}
            authenticated={!!session?.user?.id}
            account={user ? { name: user.name, image: user.image } : null}
            initialLight={initialLight}
            initialRegion={initialRegion}
          >
            {children}
          </Shell>
        </Suspense>
      </body>
    </html>
  );
}
