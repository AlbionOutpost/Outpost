import { createElement, type ReactNode } from "react";
import type { GuideNode } from "@/lib/grind-library-types";
import Image from "next/image";
import { ItemIcon } from "./item-icon";
import { brandCopy } from "@/lib/brand-copy";

const allowed = new Set([
  "p",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "a",
  "br",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "code",
  "pre",
]);
export function safeGuideHref(value?: string) {
  if (!value) return undefined;
  if (/^#[a-zA-Z0-9_-]+$/.test(value)) return value;
  // Outpost's own pages: tools, guides, builds, comps and item pages (item ids may hold %40).
  if (/^\/(?:tools|guides|builds|compositions|items)(?:\/(?:[A-Za-z0-9_-]|%40)+)*$/.test(value))
    return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    if (["albiononlinegrind.com", "www.albiononlinegrind.com"].includes(url.hostname)) {
      if (/^\/guides\/[a-z0-9-]+$/.test(url.pathname)) return url.pathname;
      if (/^\/build\/[a-z0-9-]+$/.test(url.pathname))
        return url.pathname.replace("/build/", "/builds/library/");
      const destination = [
        "craft",
        "refin",
        "enchant",
        "cook",
        "alchemy",
        "fish",
        "farm",
        "transport",
        "flip",
      ].find((kind) => url.pathname.includes(kind));
      const routes: Record<string, string> = {
        craft: "crafting",
        refin: "refining",
        enchant: "enchanting",
        cook: "cooking",
        alchemy: "alchemy",
        fish: "fishing",
        farm: "farming",
        transport: "transporting",
        flip: "flipping",
      };
      return destination ? `/tools/${routes[destination]}` : "/tools";
    }
    return url.href;
  } catch {
    return undefined;
  }
}
type Element = Exclude<GuideNode, string>;
const isElement = (node: GuideNode): node is Element => typeof node !== "string";
const text = (node: GuideNode): string =>
  typeof node === "string" ? node : node.children.map(text).join("");
const kids = (node: Element) =>
  node.children.filter((child) => isElement(child) || child.trim() !== "");
/** A figure the reader compares down a column: "15.25%", "+40", "1,200 IP", "22 hours". */
const figure = (value: string) =>
  /^[+−\-–~≈]?\s*[\d.,]+\s*(?:%|k|m|x|×|ip|silver|s|h|hours?|minutes?|seconds?|days?)?$/i.test(
    value.trim(),
  );
/** The columns of a table whose every body cell is a figure; they set in tabular numbers. */
function figureColumns(table: Element) {
  const rows: Element[] = [];
  const collect = (node: Element) =>
    node.children.forEach((child) => {
      if (!isElement(child)) return;
      if (child.tag === "tr") rows.push(child);
      else if (child.tag === "tbody") collect(child);
    });
  collect(table);
  const cells = rows.map((row) => row.children.filter(isElement).filter((c) => c.tag === "td"));
  const width = Math.max(0, ...cells.map((row) => row.length));
  const columns = new Set<number>();
  for (let i = 1; i < width; i++)
    if (cells.length && cells.every((row) => row[i] && figure(text(row[i])))) columns.add(i);
  return columns;
}
/** A list whose every item opens on a bold lead is a set of terms; when every lead is a short
 * figure ("+40", "T4:") it is a set of figures. */
function listKind(list: Element) {
  const leads = kids(list).map((li) => {
    const first = isElement(li) ? kids(li)[0] : undefined;
    return first && isElement(first) && ["strong", "b"].includes(first.tag) ? text(first) : null;
  });
  if (leads.length < 2 || leads.some((lead) => lead === null)) return undefined;
  return leads.every((lead) => /\d/.test(lead!) && lead!.length <= 24) ? "figures" : "terms";
}

export function GuideArticleContent({ nodes }: { nodes: GuideNode[] }) {
  const none = new Set<number>();
  /** `columns` are the figure columns of the table being drawn; `inFigureColumn` marks a cell. */
  function render(node: GuideNode, key: number, columns = none, inFigureColumn = false): ReactNode {
    if (typeof node === "string") return brandCopy(node);
    if (node.tag === "item" && /^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/.test(node.id || ""))
      return <ItemIcon key={key} id={node.id!} size={48} />;
    if (
      node.tag === "img" &&
      /^\/library\/media\/[a-zA-Z0-9_-]+\.(?:webp|png|jpeg|jpg)$/.test(node.src || "") &&
      Number.isInteger(node.width) &&
      Number.isInteger(node.height) &&
      node.width! > 0 &&
      node.height! > 0
    )
      return (
        <Image
          key={key}
          unoptimized
          src={node.src!}
          alt={brandCopy(node.alt || "")}
          width={node.width!}
          height={node.height!}
          className="guide-article-image"
        />
      );
    if (!allowed.has(node.tag)) return null;
    const figures = node.tag === "table" ? figureColumns(node) : columns;
    const children =
      node.tag === "tr"
        ? node.children.filter(isElement).map((cell, i) => render(cell, i, figures, figures.has(i)))
        : node.children.map((child, i) => render(child, i, figures));
    const props: Record<string, unknown> = { key };
    if (inFigureColumn) props.className = "is-figure";
    if (node.tag === "a") {
      props.href = safeGuideHref(node.href);
      props.rel = "noopener noreferrer";
      if (node.children.some((child) => isElement(child) && child.tag === "item"))
        props.className = "guide-item";
    }
    if (["h2", "h3", "h4"].includes(node.tag) && /^section-[a-z0-9-]+$/.test(node.id || ""))
      props.id = node.id;
    // A paragraph that is one bold statement (a formula, a rule) stands out as a callout.
    if (node.tag === "p") {
      const only = kids(node);
      if (only.length === 1 && isElement(only[0]) && ["strong", "b"].includes(only[0].tag))
        props.className = "guide-callout";
    }
    if (node.tag === "ul" || node.tag === "ol") {
      const kind = listKind(node);
      if (kind) props.className = `guide-${kind}`;
    }
    const element = createElement(node.tag, props, node.tag === "br" ? undefined : children);
    return node.tag === "table" ? (
      <div
        className="guide-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Guide reference table"
        key={key}
      >
        {element}
      </div>
    ) : (
      element
    );
  }
  return <>{nodes.map((node, i) => render(node, i))}</>;
}
