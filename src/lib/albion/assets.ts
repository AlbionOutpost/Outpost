/** Reviewed Albion art references. A public URL alone does not approve scene redistribution. */
export type SceneKey = "homepageHero" | "marketPreview" | "buildPreview" | "compositionPreview";
export type AlbionScene =
  | { status: "missing"; title: string; required: string; source: null; permission: null }
  | {
      status: "approved";
      title: string;
      src: `/albion/${string}`;
      source: string;
      permission: string;
      alt: string;
      width: number;
      height: number;
      focalPoint: string;
    };
type GeneratedScene = {
  status: "generated";
  title: string;
  src: `/albion/${string}`;
  source: string;
  permission: string;
  alt: string;
  width: number;
  height: number;
  focalPoint: string;
};
export const albionScenes: Record<SceneKey, AlbionScene | GeneratedScene> = {
  homepageHero: {
    status: "generated",
    title: "Market courtyard illustration",
    src: "/albion/illustrations/hero-v1.webp",
    source:
      "Built-in image_gen; original retained at assets/source/homepage-illustrations-v1/hero-v1.png",
    permission:
      "User expressly authorised generated Albion-like scenes on2026-10-26; not authentic gameplay or official artwork.",
    alt: "Generated isometric illustration of a torch-lit medieval market courtyard",
    width: 1600,
    height: 900,
    focalPoint: "65% 48%",
  },
  marketPreview: {
    status: "generated",
    title: "Market illustration",
    src: "/albion/illustrations/market-v1.webp",
    source: "Built-in image_gen; assets/source/homepage-illustrations-v1/market-v1.png",
    permission: "User-authorised generated illustration; not an authentic game screenshot.",
    alt: "Generated isometric illustration of merchant stalls and a trading square",
    width: 900,
    height: 507,
    focalPoint: "50% 50%",
  },
  buildPreview: {
    status: "generated",
    title: "Equipment party illustration",
    src: "/albion/illustrations/build-v1.webp",
    source: "Built-in image_gen; assets/source/homepage-illustrations-v1/build-v1.png",
    permission:
      "User-authorised generated illustration; not game equipment artwork or a meta loadout.",
    alt: "Generated isometric illustration of five equipped adventurers in a courtyard",
    width: 900,
    height: 507,
    focalPoint: "50% 47%",
  },
  compositionPreview: {
    status: "generated",
    title: "Party illustration",
    src: "/albion/illustrations/composition-v1.webp",
    source: "Built-in image_gen; assets/source/homepage-illustrations-v1/composition-v1.png",
    permission: "User-authorised generated illustration; not an authentic game screenshot.",
    alt: "Generated isometric illustration of an adventuring party entering a torch-lit gate",
    width: 900,
    height: 507,
    focalPoint: "50% 58%",
  },
};
export const albionArtSources = {
  items: {
    host: "https://render.albiononline.com",
    source: "https://forum.albiononline.com/index.php/Thread/131017-Update-on-API-New-Endpoints/",
    delivery:
      "Existing validated renderer URLs with bounded same-origin fallback; official artwork remains owned by Sandbox Interactive.",
  },
  scenes: {
    source: "https://albiononline.com/presskit",
    status: "blocked",
    review:
      "2026-10-26: direct page403; linked presskit.albiononline.com/en.zip unresolved. No retrieved screenshot-specific reuse terms. No concept artwork may be substituted.",
  },
  abilities: {
    status: "missing",
    review:
      "No approved ability artwork catalog; do not substitute item icons or invented spell illustrations.",
  },
} as const;
