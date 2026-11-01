#!/usr/bin/env python3
"""Extract factual spell relationships from pinned owner archive, without executing its JavaScript."""
import ast
import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / "Scrape/albiononlinegrind.com/report"
dictionary = source / "assets/_next/static/chunks/1015-20150b4a5c8aefc7.js"
definitions = source / "data/game-item-definitions.json"
literal = re.search(r"JSON\.parse\('((?:\\.|[^'\\])*)'\)", dictionary.read_text()).group(1)
names = json.loads(ast.literal_eval("'" + literal + "'"))
alias_literal = re.search(r"let R=(\{[^{}]+\}),i=", dictionary.read_text()).group(1)
aliases = dict(re.findall(r'([A-Z0-9_]+):"([A-Z0-9_]+)"', alias_literal))
for original, canonical in aliases.items():
    if canonical in names and original not in names: names[original] = names[canonical]
records = {r["@uniquename"]: r for r in json.loads(definitions.read_text())}

def many(value):
    return value if isinstance(value, list) else [value] if value else []

def spells(item, visiting=()):
    if item in visiting: raise ValueError("Spell reference cycle")
    record = records.get(item)
    if not record: return {}
    listing = record.get("craftingspelllist", {})
    ref = listing.get("@reference")
    resolved = spells(ref, (*visiting, item)) if ref else {}
    for remove in many(listing.get("removespell")):
        resolved.pop(remove["@uniquename"], None)
    for spell in many(listing.get("craftspell")):
        resolved[spell["@uniquename"]] = spell
    return resolved

result = {}
for item, record in records.items():
    if not re.fullmatch(r"T[4-8]_[A-Z0-9_]+", item): continue
    rows = []
    for spell, fields in spells(item).items():
        if spell not in names: continue  # Never generate a name by transforming an ID.
        key = "Passive" if spell.startswith("PASSIVE_") else {"1": "Q", "2": "W", "3": "E"}.get(fields.get("@slots")) if record.get("@slottype") == "mainhand" else "Active" if record.get("@slottype") in {"head", "armor", "shoes"} and record.get("@activespellslots") == "1" else None
        if key: rows.append({"key": key, "id": spell, "name": names[spell]})
    if rows: result[item] = rows

target = root / "src/lib/albion/archived-item-spells.json"
target.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")
(root / "public/library/grind-spell-names.json").write_text(json.dumps(names, ensure_ascii=False, separators=(",", ":")) + "\n")
manifest = {"permission": "Owner authorized reuse of old pages in 2026-10-28 session", "capturedAt": "2026-10-27", "method": "Parse only the explicit JSON spell dictionary; resolve exact per-item craftingspelllist references/removals/slot fields. No scraped code execution, inferred spell names, statistics or unlocks.", "sourceSha256": {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [dictionary, definitions]}, "items": len(result), "options": sum(map(len, result.values())), "outputSha256": hashlib.sha256(target.read_bytes()).hexdigest(), "currentPatchVerified": False, "characterAndTierUnlocksVerified": False}
(root / "docs/data/archived-item-spells-source.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({"items": manifest["items"], "options": manifest["options"]}))
