import { rootMetadata } from "@/lib/seo";
import { AdsenseLoader } from "@/components/adsense-loader";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { regionSchema } from "@/lib/albion/region-config";
import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shell";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbList, crumbsForPath, siteGraph } from "@/lib/structured-data";
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
export const metadata: Metadata = rootMetadata();
export const viewport: Viewport = { themeColor: "#101014", colorScheme: "dark light" };
export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  const jar = await cookies();
  const session = await getServerSession(authOptions);
  const user = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { region: true, name: true, image: true, role: true },
      })
    : null;
  const path = (await headers()).get("x-outpost-path") ?? "";
  const crumbs = crumbsForPath(path);
  const initialRegion = regionSchema
    .catch("europe")
    .parse(
      (await headers()).get("x-outpost-region") || jar.get("atlas-region")?.value || user?.region,
    );
  const initialLight = jar.get("atlas-theme")?.value === "light";
  return (
    <html lang="en">
      <head>
        <AdsenseLoader />
      </head>
      <body
        className={`${inter.variable} ${barlowCondensed.variable} ${barlowDisplay.variable} ${geistMono.variable}`}
      >
        {/* No boundary around the shell: the header renders with the first byte and pages
            stream into it behind their own loading state */}
        <Shell
          key={`${initialRegion}:${initialLight}`}
          authenticated={!!session?.user?.id}
          account={user ? { name: user.name, image: user.image, role: user.role } : null}
          initialLight={initialLight}
          initialRegion={initialRegion}
        >
          {children}
        </Shell>
        {path === "/" && <JsonLd data={siteGraph()} />}
        {crumbs && <JsonLd data={breadcrumbList(crumbs)} />}
      </body>
    </html>
  );
}
