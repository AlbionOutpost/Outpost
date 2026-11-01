#!/usr/bin/env python3
"""Prepare the owner's dated PUBLIC content archive; never import accounts or run captured code."""
import hashlib
import json
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from PIL import Image
from bs4 import BeautifulSoup, NavigableString, Comment

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Scrape/albiononlinegrind.com/report"
DEST = ROOT / "public/library"
DEST.mkdir(parents=True, exist_ok=True)
ITEM = re.compile(r"^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$")
SLUG = re.compile(r"^[a-zA-Z0-9_-]{1,1024}$")
SPELL = re.compile(r"^[A-Z0-9_]{2,100}$")
hashes = {}
media = {}

def image_asset(src):
    parsed = urlparse(src)
    path = parse_qs(parsed.query).get("url", [""])[0] if parsed.path == "/_next/image" else parsed.path
    if not path.startswith("/images/guides/") or (parsed.hostname and parsed.hostname != "albiononlinegrind.com"):
        return None
    base = (SOURCE / "assets/site").resolve()
    asset = (base / path.lstrip("/")).resolve()
    if not asset.is_relative_to(base) or not asset.is_file() or asset.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"} or asset.stat().st_size > 10_000_000:
        return None
    digest = hashlib.sha256(asset.read_bytes()).hexdigest()
    with Image.open(asset) as image:
        width, height = image.size
        if image.format not in {"JPEG", "PNG", "WEBP"} or not 0 < width <= 10000 or not 0 < height <= 10000:
            raise ValueError("Invalid guide image")
        image.verify()
    name = digest[:12] + "-" + re.sub(r"[^a-zA-Z0-9_-]", "-", asset.stem)[:60] + asset.suffix.lower()
    target = DEST / "media" / name
    target.parent.mkdir(exist_ok=True)
    shutil.copy2(asset, target)
    output = {"src": "/library/media/" + name, "width": width, "height": height}
    media[path] = {**output, "source": str(asset.relative_to(ROOT)), "sha256": digest, "permission": "Owner-supplied old-page media; original game/artwork attribution retained, no unrelated rights certification"}
    return output

def read(name):
    raw = (SOURCE / name).read_bytes()
    hashes[name] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)

def text(value, limit=12000):
    return str(value or "").strip()[:limit]

def ids(values):
    values = [values] if isinstance(values, str) else values or []
    return list(dict.fromkeys(v for v in values if isinstance(v, str) and ITEM.fullmatch(v)))[:4]

def video_link(value):
    value = text(value, 2000)
    candidate = value.split("?", 1)[0]
    if re.fullmatch(r"[a-zA-Z0-9_-]{11}", candidate):
        return {"kind": "video", "id": candidate, "url": "https://www.youtube.com/watch?v=" + candidate}
    parsed = urlparse(value)
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port or parsed.hostname not in {"www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"}:
        return None
    if parsed.hostname == "youtu.be": candidate = parsed.path.strip("/")
    elif parsed.path == "/watch": candidate = parse_qs(parsed.query).get("v", [""])[0]
    elif re.fullmatch(r"/(?:shorts|embed|live)/[a-zA-Z0-9_-]{11}", parsed.path): candidate = parsed.path.rsplit("/", 1)[-1]
    elif re.fullmatch(r"/(?:@[a-zA-Z0-9_.-]{1,100}|(?:channel|user|c)/[a-zA-Z0-9_-]{1,100})", parsed.path):
        return {"kind": "channel", "id": parsed.path, "url": "https://www.youtube.com" + parsed.path}
    else: return None
    if re.fullmatch(r"[a-zA-Z0-9_-]{11}", candidate):
        return {"kind": "video", "id": candidate, "url": "https://www.youtube.com/watch?v=" + candidate}
    return None

traits = read("data/static-tables/weapon-attunement-traits-fd5046cdfb2b3995.json")[0]["value"]
if len(traits) != 19 or any(not re.fullmatch(r"[a-z-]+", row["id"]) for row in traits):
    raise ValueError("Unexpected awakening trait dictionary")

builds = []
used_slugs = set()
normalizations = []
for row in read("public-builds.json"):
    if row.get("is_published") is not True or row.get("is_unlisted") is not False:
        raise ValueError("Archive contains a nonpublic record")
    original_slug = row["slug"]
    row["slug"] = original_slug.strip()
    if row["slug"] in used_slugs:
        row["slug"] += "-" + row["id"]
    used_slugs.add(row["slug"])
    if row["slug"] != original_slug:
        normalizations.append({"id": row["id"], "original": original_slug, "slug": row["slug"]})
    if not SLUG.fullmatch(row["slug"]):
        raise ValueError("Invalid build slug")
    equipment = []
    for field, slot in [("weapon", "Main hand"), ("offhand", "Off hand"), ("helmet", "Helmet"), ("chest", "Chest"), ("boots", "Boots"), ("cape", "Cape"), ("food", "Food"), ("potion", "Potion")]:
        item = row.get(field + "_id")
        if not item:
            continue
        if not ITEM.fullmatch(item):
            raise ValueError(f"Invalid item {item}")
        alt = row.get(field + "_alt", []) if field in ["food", "potion"] else [row.get(field + "_id_alt", "")]
        alternatives = ids(alt)
        alternate_skills = [s for s in row.get(field + "_alt_skills", []) or [] if isinstance(s, str) and SPELL.fullmatch(s)]
        equipment.append({"slot": slot, "itemId": item, "skills": [s for s in row.get(field + "_skills", []) or [] if isinstance(s, str) and SPELL.fullmatch(s)], "alternatives": alternatives, "alternativeSkills": {alternatives[0]: alternate_skills} if alternatives and alternate_skills else {}})
    videos = [video_link(v) for v in row.get("youtube_ids", []) or []]
    builds.append({"id": row["id"], "slug": row["slug"], "sourceSlug": original_slug, "title": text(row["title"], 200), "author": text(row.get("author"), 100) or "Unknown author", "category": text(row.get("category"), 100), "description": text(row.get("description"), 20000), "updatedAt": text(row.get("updated_at"), 50), "weaponName": text(row.get("weapon_name"), 100), "equipment": equipment, "tags": [text(v, 100) for v in row.get("tags", [])], "recommendedTraits": [v for v in row.get("recommended_traits", []) or [] if isinstance(v, str) and re.fullmatch(r"[a-z-]{1,100}", v)], "videos": [v for v in videos if v], "unresolvedVideoReferences": sum(v is None for v in videos)})

groups = []
for row in read("public-group-builds.json"):
    if row.get("is_published") is not True or row.get("is_unlisted") is not False or not SLUG.fullmatch(row["slug"]):
        raise ValueError("Nonpublic or invalid group build")
    groups.append({"slug": row["slug"], "title": text(row["title"], 200), "author": text(row.get("author"), 100) or "Unknown author", "category": text(row.get("category"), 100), "description": text(row.get("description"), 20000), "updatedAt": text(row.get("updated_at"), 50), "members": [text(v, 1024) for v in row.get("build_slugs", [])], "optional": [text(v, 1024) for v in row.get("optional_builds", [])]})

# Structural allowlist. Script, style, forms, embeds, attributes and event handlers never enter output.
ALLOWED = {"p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "a", "br", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "code", "pre"}
DROP = {"script", "style", "iframe", "svg", "button", "input", "select", "option", "form", "noscript"}

def tree(node):
    if isinstance(node, Comment): return []
    if isinstance(node, NavigableString): return [str(node)]
    if node.name in DROP: return []
    if node.name == "img":
        image = image_asset(node.get("src", ""))
        if image: return [{"tag": "img", "alt": node.get("alt", "")[:500], "children": [], **image}]
        parsed = urlparse(node.get("src", ""))
        match = re.fullmatch(r"/v1/item/(T[1-8]_[A-Z0-9_]+(?:@[1-4])?)\.png", parsed.path)
        if parsed.scheme == "https" and parsed.hostname == "render.albiononline.com" and match:
            return [{"tag": "item", "id": match.group(1), "children": []}]
        return []
    children = [part for child in node.children for part in tree(child)]
    if node.name not in ALLOWED: return children
    if node.name == "a" and not node.get_text(strip=True): return children
    result = {"tag": node.name, "children": children}
    if node.name == "a":
        href = node.get("href", "")
        if href.startswith("/") and not href.startswith("//"): href = "https://albiononlinegrind.com" + href
        parsed = urlparse(href)
        if (parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password) or href.startswith("#"):
            result["href"] = href[:2000]
    if node.name in {"h2", "h3", "h4"}:
        result["id"] = "section-" + re.sub(r"[^a-z0-9]+", "-", node.get_text(" ", strip=True).lower()).strip("-")[:100]
    return [result]

guides = []
for path in sorted((SOURCE / "evidence/pages").glob("guides__*.html")):
    soup = BeautifulSoup(path.read_text(), "html.parser")
    article = soup.select_one("article#guide-content")
    if not article: continue
    hashes[str(path.relative_to(SOURCE))] = hashlib.sha256(path.read_bytes()).hexdigest()
    slug = path.stem.removeprefix("guides__")
    # Captured calculator controls/no-data result tables are not article prose.
    if slug == "fishing-leveling-guide":
        for widget in article.select(".card-group, table"):
            widget.decompose()
    header = soup.find("h1").parent
    category = header.select_one('[class*="categoryLabel"]')
    author = header.select_one('[class*="authorByline"]')
    times = header.find_all("time")
    intro = article.find("p")
    toc = [{"title": h.get_text(" ", strip=True), "id": "section-" + re.sub(r"[^a-z0-9]+", "-", h.get_text(" ", strip=True).lower()).strip("-")[:100]} for h in article.find_all("h2")]
    cover_path = {"market-flipping-guide": "cards/market-flipping-guide.webp", "fishing-leveling-guide": "cards/fishing-leveling-guide-v2.webp", "albion-journal-guide": "cards/albion-journal-guide.webp", "achievements": "cards/achievements.webp", "black-zone-gathering-guide": "featured/black-zone-gathering-guide.jpeg", "ancient-lands": "featured/ancient-lands.webp", "corrupted-dungeon-ratting": "featured/corrupted-dungeon-ratting-guide.jpeg", "dragonfire-items": "og/dragonfire-items.jpg"}.get(slug)
    cover = image_asset("/images/guides/" + cover_path) if cover_path else None
    guides.append({"slug": slug, "title": soup.find("h1").get_text(" ", strip=True), "category": category.get_text(" ", strip=True).removesuffix(" guide") if category else "Reference", "author": author.get_text(" ", strip=True).removeprefix("by ") if author else "Albion Online Grind", "updatedAt": times[-1].get("datetime", "") if times else "", "summary": intro.get_text(" ", strip=True)[:300] if intro else "Recovered guide from your Albion Online Grind library.", "toc": toc, "cover": cover, "content": tree(article), "interactiveContentRestored": slug in ("albion-journal-guide", "fishing-leveling-guide")})

for name, data in [("builds", builds), ("compositions", groups), ("guides", guides), ("guide-media", media), ("traits", traits)]:
    raw = (json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    (DEST / f"grind-{name}.json").write_bytes(raw)

manifest = {"source": "Owner-supplied Albion Online Grind public archive", "capturedAt": "2026-10-27", "permission": "Owner confirmed ownership and authorized republication in the 2026-10-28 development session", "scope": "Published, listed records and static guide prose/tables only. No accounts, private drafts, payments, sessions, votes or external code.", "counts": {"builds": len(builds), "compositions": len(groups), "guides": len(guides)}, "sourceSha256": hashes, "outputSha256": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(DEST.glob("grind-*.json")) if p.name != "grind-manifest.json"}, "currentPatchVerified": False, "guideWidgetsRestored": False}
manifest["slugNormalizations"] = normalizations
(DEST / "grind-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest["counts"]))
