import { createElement, type ReactNode } from "react";
import type { GuideNode } from "@/lib/grind-library-types";
import Image from "next/image";
import { ItemIcon } from "./item-icon";

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
export function GuideArticleContent({ nodes }: { nodes: GuideNode[] }) {
  function render(node: GuideNode, key: number): ReactNode {
    if (typeof node === "string")
      return node.replace(
        /(?:Albion\s*Online\s*Grind|AlbionOnlineGrind|AlbionUtil)(?:\.com)?/gi,
        "Outpost",
      );
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
          alt={node.alt || ""}
          width={node.width!}
          height={node.height!}
          className="guide-article-image"
        />
      );
    if (!allowed.has(node.tag)) return null;
    const children = node.children.map(render);
    const props: Record<string, unknown> = { key };
    if (node.tag === "a") {
      props.href = safeGuideHref(node.href);
      props.rel = "noopener noreferrer";
    }
    if (["h2", "h3", "h4"].includes(node.tag) && /^section-[a-z0-9-]+$/.test(node.id || ""))
      props.id = node.id;
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
  return <>{nodes.map(render)}</>;
}
