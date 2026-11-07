import type { GuideNode, LibraryGuide } from "./grind-library-types";
import { toolEmblem } from "./search-emblems";
import { toolPaintings, tools } from "./tool-directory";

/** The reader's view of a guide: its text cut into sections at each h2, the standfirst, the
 * tools and items it names, and the guides it is closest to. Everything here is read from the
 * guide's own text; nothing is added to it. */

export const nodeText = (node: GuideNode): string =>
  typeof node === "string" ? node : node.tag === "br" ? " " : node.children.map(nodeText).join("");

/** Painted charges (public/albion/charges) for section headings, by what the heading is about.
 * First match wins; a heading that matches none gets no mark. */
const charges: [RegExp, string][] = [
  [/mistake|avoid|death|die\b|lose|gank|danger|risk/i, "skull"],
  [/safe|escape|exit|surviv|getting out/i, "shield"],
  [/silver|price|profit|cost|fee|tax|sell|buy|market|trade|flip|money|value|gold/i, "coins"],
  [/fish/i, "anchor"],
  [/farm|crop|plant|herb|island|animal|livestock/i, "wheat"],
  [/track|hunt/i, "paw"],
  [/gather|ore\b|resource/i, "pickaxe"],
  [/refin|craft|enchant|focus|return|recipe|foundry/i, "hammer"],
  [/mount|transport|haul|route|travel|road|portal|zone|city|cities|map|where/i, "compass"],
  [/fame|level|learn|journal|destiny|spec|point|board|achievement/i, "book"],
  [/chest|loot|reward|vault|altar/i, "chest"],
  [/party|role|comp\b|comps|zvz|guild|call|group|team/i, "flag"],
  [/build|gear|weapon|loadout|\bip\b|armor|item/i, "sword"],
  [/patch|change|update|season|week|day|timer|hour/i, "hourglass"],
  [/dungeon|mist|depth|hellgate|avalon|arena|fight|pvp|siege|invasion/i, "axes"],
  [/rule|check|step|how|start|first/i, "key"],
];
export const sectionCharge = (title: string) => charges.find(([test]) => test.test(title))?.[1];

/** Sections whose heading says they list mistakes are set as cautions; "Tips" as tips. */
export const sectionTone = (title: string) =>
  /^(?:common )?mistakes?\b/i.test(title) ? "caution" : /^tips?\b/i.test(title) ? "tip" : undefined;

export type GuideSection = {
  id?: string;
  title: string;
  nodes: GuideNode[];
  charge?: string;
  tone?: "caution" | "tip";
};

/** The opening text before the first h2, then one section per h2 (the heading itself is not in
 * `nodes`; the reader draws it with its mark). */
export function guideSections(content: GuideNode[]) {
  const intro: GuideNode[] = [];
  const sections: GuideSection[] = [];
  for (const node of content) {
    if (typeof node !== "string" && node.tag === "h2") {
      const title = nodeText(node).trim();
      sections.push({
        id: /^section-[a-z0-9-]+$/.test(node.id || "") ? node.id : undefined,
        title,
        nodes: [],
        charge: sectionCharge(title),
        tone: sectionTone(title),
      });
    } else if (sections.length) sections[sections.length - 1].nodes.push(node);
    else intro.push(node);
  }
  return { intro, sections };
}

/** The cover's standfirst: the guide's own `dek`, else the summary's opening clause. */
export function guideDek(guide: Pick<LibraryGuide, "summary" | "dek">) {
  if (guide.dek) return guide.dek;
  const sentence = guide.summary.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? guide.summary;
  const clause = sentence.split(":")[0].trim();
  return clause === sentence ? sentence : `${clause}.`;
}

const walk = (nodes: GuideNode[], visit: (node: Exclude<GuideNode, string>) => void) => {
  for (const node of nodes) {
    if (typeof node === "string") continue;
    visit(node);
    walk(node.children, visit);
  }
};

/** Slugs of the other guides this guide links to, in reading order. */
export function linkedGuides(content: GuideNode[]) {
  const slugs: string[] = [];
  walk(content, (node) => {
    const slug = node.tag === "a" && node.href?.match(/^\/guides\/([a-z0-9-]+)$/)?.[1];
    if (slug && !slugs.includes(slug)) slugs.push(slug);
  });
  return slugs;
}

/** The Outpost tools and the items the guide links to, once each, in reading order. */
export function guideReferences(content: GuideNode[]) {
  const toolLinks: { href: string; title: string; emblem: string }[] = [];
  const items: { id: string; name: string }[] = [];
  walk(content, (node) => {
    if (node.tag !== "a" || !node.href) return;
    const tool = tools.find((t) => t.href === node.href);
    if (tool && !toolLinks.some((t) => t.href === tool.href))
      toolLinks.push({
        href: tool.href,
        title: tool.title,
        emblem: toolPaintings[tool.href] ?? toolEmblem(tool.icon),
      });
    const item = node.children.find(
      (child): child is Exclude<GuideNode, string> =>
        typeof child !== "string" && child.tag === "item",
    );
    if (item?.id && !items.some((i) => i.id === item.id))
      items.push({ id: item.id, name: nodeText(node).trim() });
  });
  return { tools: toolLinks, items };
}

export type RelatedGuide = { guide: LibraryGuide; reason: string };

/** The guides closest to this one: those it links to first, then those that link to it, then
 * its own topic. Only guides with one of those ties are offered. */
export function relatedGuides(guide: LibraryGuide, all: LibraryGuide[], count = 3) {
  const out = linkedGuides(guide.content);
  return all
    .filter((other) => other.slug !== guide.slug)
    .map((other, order) => {
      const linked = out.indexOf(other.slug);
      const linksHere = linkedGuides(other.content).includes(guide.slug);
      const topic = other.category === guide.category;
      const score = (linked >= 0 ? 40 - linked : 0) + (linksHere ? 8 : 0) + (topic ? 4 : 0);
      const reason =
        linked >= 0
          ? "Linked in this guide"
          : linksHere
            ? "Links back here"
            : `More ${other.category}`;
      return { guide: other, reason, score, order };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, count)
    .map(({ guide, reason }): RelatedGuide => ({ guide, reason }));
}
