#!/usr/bin/env python3
"""Import factual game data from the owner's albiononlinegrind.com archive.

Reads the local, untracked `Scrape/` capture and writes compact JSON into
`src/lib/albion/game/`, plus a provenance ledger in `docs/data/`. Captured
JavaScript is read as text only: literal tables are transcribed here and
never executed.

Usage: python3 scripts/import-grind-game-data.py
"""
import hashlib
import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "Scrape/albiononlinegrind.com/report"
DATA = REPORT / "data"
PAGES = REPORT / "evidence/pages"
OUT = ROOT / "src/lib/albion/game"
LEDGER = ROOT / "docs/data/grind-game-data-source.json"
CAPTURED = "2026-10-27"
OUT.mkdir(parents=True, exist_ok=True)
sources: dict[str, str] = {}
outputs: dict[str, dict] = {}


def load(path: Path):
    raw = path.read_bytes()
    sources[str(path.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)


def soup(name: str) -> BeautifulSoup:
    path = PAGES / name
    raw = path.read_bytes()
    sources[str(path.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
    return BeautifulSoup(raw.decode("utf-8"), "html.parser")


def write(name: str, value, rows: int, note: str):
    text = json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    path = OUT / name
    path.write_text(text + "\n", encoding="utf-8")
    outputs[str(path.relative_to(ROOT))] = {
        "sha256": hashlib.sha256((text + "\n").encode()).hexdigest(),
        "bytes": len(text) + 1,
        "rows": rows,
        "content": note,
    }


def as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


ITEM_ID = re.compile(r"^(T[1-8]_[A-Z0-9_]+|UNIQUE_[A-Z0-9_]+|QUESTITEM_[A-Z0-9_]+)(@[1-4])?$")


def market_id(name: str, enchant: int = 0) -> str:
    """Market identity used by AODP: `_LEVELn` resources get `@n`; extracts/sauces keep their names."""
    if "@" in name:
        return name
    if "FISHSAUCE_LEVEL" in name or "ALCHEMY_EXTRACT_LEVEL" in name:
        return name
    level = re.match(r"^(T\d+_.+)_LEVEL(\d)$", name)
    if level:
        return f"{name}@{level.group(2)}"
    return f"{name}@{enchant}" if enchant > 0 else name


def tier_of(item_id: str) -> int | None:
    m = re.match(r"^T(\d)_", item_id)
    return int(m.group(1)) if m else None


# ---------------------------------------------------------------- names
names: dict[str, str] = load(DATA / "item-names.json")
transport = load(DATA / "transport-item-definitions.json")
for row in transport:
    names.setdefault(row["itemId"], row["name"])


def name_of(item_id: str) -> str:
    base = item_id.split("@")[0]
    if item_id in names:
        return names[item_id]
    if base in names:
        level = item_id.split("@")[1] if "@" in item_id else ""
        return f"{names[base]}{f' .{level}' if level else ''}"
    return item_id


# ---------------------------------------------------------------- recipes
definitions = load(DATA / "game-item-definitions.json")
SKIP_SHOP = {"furniture", "other", "artefacts"}
recipes = []
upgrades: dict[str, list] = {}
item_values: dict[str, int] = {}


def recipe_kind(defn) -> tuple[str, str | None]:
    shop, sub = defn.get("@shopcategory"), defn.get("@shopsubcategory1")
    if shop == "crafting" and sub == "refinedresources":
        return "refining", None
    category = defn.get("@craftingcategory")
    if category == "food" or (shop == "consumables" and sub in {"cooked", "fish", "food"}):
        return "crafting", "cooking"
    if category == "potion" or (shop == "consumables" and sub == "potions"):
        return "crafting", "alchemy"
    if category and category.startswith("meat_"):
        return "crafting", "cooking"
    return "crafting", None


def add_recipes(defn, output: str, enchant: int, requirements):
    kind, category = recipe_kind(defn)
    alternatives = [r for r in as_list(requirements) if as_list(r.get("craftresource"))]
    for index, req in enumerate(alternatives):
        ingredients = []
        for res in as_list(req.get("craftresource")):
            rid = market_id(res["@uniquename"], int(res.get("@enchantmentlevel", 0) or 0))
            if not ITEM_ID.match(rid):
                raise ValueError(f"Unexpected resource id {rid} in {output}")
            ingredients.append(
                {
                    "id": rid,
                    "count": int(res["@count"]),
                    **({"returnable": False} if res.get("@maxreturnamount") == "0" else {}),
                }
            )
        recipes.append(
            {
                "id": output if index == 0 else f"{output}~{index + 1}",
                "output": output,
                "kind": kind,
                **({"category": category} if category else {}),
                "craftingCategory": defn.get("@craftingcategory"),
                "tier": int(defn["@tier"]),
                "enchantment": enchant,
                "outputCount": int(req.get("@amountcrafted", 1) or 1),
                "focus": int(float(req.get("@craftingfocus", 0) or 0)),
                "silver": int(float(req.get("@silver", 0) or 0)),
                "ingredients": ingredients,
            }
        )


for defn in definitions:
    if defn.get("@shopcategory") in SKIP_SHOP:
        continue
    base = defn["@uniquename"]
    if defn.get("@itemvalue"):
        item_values[base] = float(defn["@itemvalue"])
    base_enchant = int(defn.get("@enchantmentlevel", 0) or 0)
    add_recipes(defn, market_id(base, base_enchant), base_enchant, defn.get("craftingrequirements"))
    for ench in as_list((defn.get("enchantments") or {}).get("enchantment")):
        level = int(ench["@enchantmentlevel"])
        add_recipes(defn, market_id(base, level), level, ench.get("craftingrequirements"))
        upgrade = (ench.get("upgraderequirements") or {}).get("upgraderesource")
        if upgrade:
            # Upgrading the previous level into this one.
            upgrades[f"{base}:{level}"] = [market_id(upgrade["@uniquename"]), int(upgrade["@count"])]

ids = [r["id"] for r in recipes]
assert len(ids) == len(set(ids)), "duplicate recipe ids"
used = {r["output"] for r in recipes} | {i["id"] for r in recipes for i in r["ingredients"]}
used |= {v[0] for v in upgrades.values()}
write(
    "recipes.json",
    recipes,
    len(recipes),
    "Crafting, refining, cooking and alchemy recipes with every alternative (artifact/token/faction), "
    "enchanted variants .1–.4, focus, silver, output count and non-returnable flags",
)
upgrade_names = {v[0]: name_of(v[0]) for v in upgrades.values()}
write(
    "upgrades.json",
    {"upgrades": upgrades, "names": upgrade_names},
    len(upgrades),
    "Artifact Foundry upgrades: '<base item>:<target level>' → [rune/soul/relic id, count] for the previous level",
)

# ---------------------------------------------------------------- items (names, weights, values)
weights: dict[str, float] = {}
for row in transport:
    weights[row["itemId"]] = row["weight"]
for row in load(DATA / "crafting-weight-values.json"):
    weights.setdefault(row["uniqueName"], row["weight"])
    if row.get("itemValue"):
        item_values.setdefault(row["uniqueName"], row["itemValue"])
for defn in definitions:
    if defn.get("@weight"):
        weights.setdefault(defn["@uniquename"], float(defn["@weight"]))
items = {}
for item_id in sorted(used | set(weights)):
    base = item_id.split("@")[0]
    entry = [name_of(item_id), weights.get(item_id, weights.get(base)), item_values.get(base)]
    items[item_id] = entry
write(
    "items.json",
    items,
    len(items),
    "id → [English name, weight kg per unit or null, base item value or null] for every recipe, upgrade and transport item",
)

# ---------------------------------------------------------------- city production bonuses
table = soup("table__local-production-bonuses.html").find("table")
CRAFT = {
    "Hammer": ["hammer"],
    "Spear": ["spear"],
    "Holy Staff": ["holystaff"],
    "Plate Helmet": ["plate_helmet"],
    "Cloth Armor": ["cloth_armor"],
    "Sword": ["sword"],
    "Bow": ["bow"],
    "Arcane Staff": ["arcanestaff"],
    "Leather Helmet": ["leather_helmet"],
    "Leather Shoes": ["leather_shoes"],
    "Crossbow": ["crossbow"],
    "Dagger": ["dagger"],
    "Cursed Staff": ["cursestaff"],
    "Plate Armor": ["plate_armor"],
    "Cloth Shoes": ["cloth_shoes"],
    "Axe": ["axe"],
    "Quarterstaff": ["quarterstaff"],
    "Frost Staff": ["froststaff"],
    "Plate Shoes": ["plate_shoes"],
    "Off-hand": ["offhand"],
    "Mace": ["mace"],
    "Nature Staff": ["naturestaff"],
    "Fire Staff": ["firestaff"],
    "Leather Armor": ["leather_armor"],
    "Cloth Helmet": ["cloth_helmet"],
    "Gathering Gear": ["gatherergear"],
    "Tool": ["tools"],
    "Food": ["food"],
    "War Gloves": ["knuckles"],
    "Shapeshifter Staff": ["shapeshifterstaff"],
    "Cape": ["cape"],
    "Bag": ["bag"],
    "Potion": ["potion"],
}
REFINE = {"Wood": "wood", "Fiber": "fiber", "Stone": "rock", "Hide": "hide", "Ore": "ore"}
BUTCHER = {
    "Raw Chicken": "meat_chicken",
    "Raw Mutton": "meat_sheep",
    "Raw Goose": "meat_goose",
    "Raw Goat": "meat_goat",
    "Raw Beef": "meat_cow",
    "Raw Pork": "meat_pig",
}
bonuses = {"crafting": {}, "refining": {}, "butchering": {}, "farming": {}}
for row in table.find_all("tr")[1:]:
    cells = [list(c.stripped_strings) for c in row.find_all(["td", "th"])]
    city = cells[0][0]
    bonuses["farming"][city] = cells[1]
    for label in cells[2]:
        bonuses["butchering"][BUTCHER[label]] = city
    for label in cells[3]:
        bonuses["refining"][REFINE[label]] = city
    for label in cells[4]:
        for key in CRAFT[label]:
            bonuses["crafting"][key] = city
bonuses["efficiency"] = {
    "base": 18,
    "crafting": 15,
    "refining": 40,
    "butchering": 10,
    "focus": 59,
    "daily": [0, 10, 20],
}
write(
    "production-bonuses.json",
    bonuses,
    sum(len(v) for k, v in bonuses.items() if k != "efficiency"),
    "Royal-city local production specialties (crafting +15, refining +40, butchering +10 efficiency, farming +10% yield) "
    "keyed by crafting category; base city 18, focus 59",
)

# ---------------------------------------------------------------- mounts
mounts_full = load(DATA / "mount-data-full.json")
speed_rows = soup("table__riding-mount-speed.html").find("table").find_all("tr")[1:]
speeds = {}
for row in speed_rows:
    cells = [" ".join(c.stripped_strings) for c in row.find_all("td")]
    pct = re.search(r"(\d+)%", cells[1])
    speeds[cells[0]] = {"speed": int(pct.group(1)) if pct else None, "speedLabel": cells[1], "category": cells[2]}
mounts = []
for m in mounts_full["Lk"]:
    mounts.append(
        {
            "id": m["id"],
            "name": m["name"],
            "tier": m.get("tier"),
            "itemWeight": m.get("itemWeight"),
            "capacity": {str(q["quality"]): round(q["carryWeight"], 3) for q in m["qualities"]},
            **speeds.get(m["name"], {}),
        }
    )
write(
    "mounts.json",
    {"source": mounts_full["sP"], "mounts": mounts},
    len(mounts),
    "Mount carry weight per quality (1–5), item weight, riding speed % and category",
)

# ---------------------------------------------------------------- mastery and focus efficiency
categories = load(DATA / "mastery-categories.json")["K"]
spec_meta = load(next((DATA / "static-tables").glob("1051-*.json")))[0]["value"]
focus_bonuses = load(next((DATA / "static-tables").glob("2540.*.json")))
efficiency = next(b["value"]["aO"] for b in focus_bonuses if isinstance(b["value"], dict) and "aO" in b["value"])
fame = next(b["value"] for b in focus_bonuses if b["variable"] == "T")
station_groups = next(b["value"] for b in focus_bonuses if b["variable"] == "l")
write(
    "mastery.json",
    {
        "groups": categories,
        "categories": spec_meta,
        "efficiency": efficiency,
        "craftingFamePerResource": fame,
        "laborerStation": station_groups,
    },
    len(efficiency),
    "Destiny-board crafting groups, 48 categories with their specs, focus-efficiency bonuses per spec level "
    "(item patterns and tier ranges), and crafting fame per resource unit by tier/enchantment",
)

# ---------------------------------------------------------------- laborers
# Transcribed from laborers-profit-calculator page source (lines 1442–1704); not executed.
LOOT_CRAFT = {4: 16, 5: 8, 6: 5.3333, 7: 4.4, 8: 4.2}
LOOT_GATHER = {4: 48, 5: 32, 6: 32, 7: 38.4, 8: 38.4}
FLAT, L1, L2, L3 = 1889, 100, 10, 1


def weighted(suffix: str, multiplier: int):
    return {"": FLAT * multiplier, "_LEVEL1": L1 * multiplier, "_LEVEL2": L2 * multiplier, "_LEVEL3": L3 * multiplier}


def loot(amounts, parts):
    out = {}
    for tier, amount in amounts.items():
        rows = {}
        for suffix, multiplier, enchanted in parts:
            if not enchanted:
                rows[market_id(f"T{tier}_{suffix}")] = FLAT
                continue
            for level, weight in weighted(suffix, multiplier).items():
                rows[market_id(f"T{tier}_{suffix}{level}")] = weight
        out[str(tier)] = {"lootAmount": amount, "loot": rows}
    return out


FISH = {
    4: (13.9112, 29, [2, 3, 4], 50, [3]),
    5: (17.0301, 46, [3, 4, 5], 100, [3, 5]),
    6: (20.0528, 39, [4, 5, 6], 100, [3, 5]),
    7: (22.3876, 52, [5, 6, 7], 150, [3, 5, 7]),
    8: (25.119, 46, [6, 7, 8], 150, [3, 5, 7]),
}
RARE = ["FRESHWATER_FOREST", "FRESHWATER_MOUNTAIN", "FRESHWATER_HIGHLANDS", "FRESHWATER_STEPPE", "FRESHWATER_SWAMP", "FRESHWATER_AVALON", "SALTWATER_ALL"]
fishing = {}
for tier, (amount, seaweed, common_tiers, common_weight, rare_tiers) in FISH.items():
    rows = {"T1_SEAWEED": seaweed}
    for water in ["FRESHWATER", "SALTWATER"]:
        for t in common_tiers:
            rows[f"T{t}_FISH_{water}_ALL_COMMON"] = common_weight
    for kind in RARE:
        for t in rare_tiers:
            rows[f"T{t}_FISH_{kind}_RARE"] = 10
    fishing[str(tier)] = {"lootAmount": amount, "loot": rows}
laborers = {
    "names": {
        "WARRIOR": "Blacksmith",
        "HUNTER": "Fletcher",
        "MAGE": "Imbuer",
        "TOOLMAKER": "Tinker",
        "WOOD": "Lumberjack",
        "STONE": "Stonecutter",
        "ORE": "Prospector",
        "FIBER": "Cropper",
        "HIDE": "Gamekeeper",
        "FISHING": "Fisherman",
    },
    "tiers": {
        "WARRIOR": loot(LOOT_CRAFT, [("METALBAR", 7, True), ("PLANKS", 2, True), ("CLOTH", 1, True)]),
        "HUNTER": loot(LOOT_CRAFT, [("LEATHER", 5, True), ("PLANKS", 3, True), ("METALBAR", 3, True)]),
        "MAGE": loot(LOOT_CRAFT, [("CLOTH", 5, True), ("PLANKS", 4, True), ("METALBAR", 1, True)]),
        "TOOLMAKER": loot(LOOT_CRAFT, [("PLANKS", 4, True), ("METALBAR", 2, True), ("CLOTH", 2, True), ("LEATHER", 1, True)]),
        "WOOD": loot(LOOT_GATHER, [("WOOD", 1, True)]),
        "STONE": loot(LOOT_GATHER, [("ROCK", 1, False)]),
        "ORE": loot(LOOT_GATHER, [("ORE", 1, True)]),
        "FIBER": loot(LOOT_GATHER, [("FIBER", 1, True)]),
        "HIDE": loot(LOOT_GATHER, [("HIDE", 1, True)]),
        "FISHING": fishing,
    },
    # house tier → (journal tier − house tier) → happiness/return factor
    "returnFactor": {
        "2": {"0": 1.025, "1": 0.6833, "2": 0.5125},
        "3": {"-1": 1.5, "0": 1.05, "1": 0.775, "2": 0.62},
        "4": {"-1": 1.5, "0": 1.075, "1": 0.83, "2": 0.6917},
        "5": {"-1": 1.5, "0": 1.1, "1": 0.8667, "2": 0.7429},
        "6": {"-1": 1.5, "0": 1.125, "1": 0.8929, "2": 0.7813},
        "7": {"-3": 1.5, "-2": 1.5, "-1": 1.5, "0": 1.15, "1": 0.9125},
        "8": {"-4": 1.5, "-3": 1.5, "-2": 1.5, "-1": 1.5, "0": 1.2},
    },
}
# Cross-check the transcription against the extracted literal block.
labor_block = load(next((DATA / "static-tables").glob("laborers-profit-calculator-*.json")))
assert next(b for b in labor_block if b["variable"] == "V")["value"] == laborers["returnFactor"]
assert next(b for b in labor_block if b["variable"] == "H")["value"] == laborers["names"]
for kind, tiers in laborers["tiers"].items():
    for tier in tiers.values():
        for item_id in tier["loot"]:
            items.setdefault(item_id, [name_of(item_id), weights.get(item_id), None])
write("laborers.json", laborers, len(laborers["tiers"]), "Laborer loot amount per journal tier, weighted loot tables and house/journal return factors")

# ---------------------------------------------------------------- reference tables
REFERENCE = [
    ("animals-favorite-food", "Animal favorite food"),
    ("biomes", "Resources and biomes"),
    ("buildings-favorite-food", "Building favorite food"),
    ("island-farming-bonuses", "Island farming bonuses"),
    ("island-upgrade-cost", "Island upgrade cost"),
    ("item-crafting-fame", "Item crafting fame"),
    ("laborers-return-rate-vs-happiness", "Laborer return rate vs happiness"),
    ("local-production-bonuses", "Local production bonuses"),
    ("player-bank-prices", "Player bank prices"),
    ("riding-mount-speed", "Riding mount speed"),
    ("royal-sigil-drop-rate", "Royal sigil drop rate"),
    ("transport-mount-capacity", "Transport mount capacity"),
    ("weapon-attunement-traits", "Weapon attunement traits"),
]
HEADINGS = {
    "island-upgrade-cost": ["First personal island", "Personal island", "Guild island"],
    "player-bank-prices": ["Player bank (towns, guild islands and hideouts)", "Guild vault"],
}
# Obvious transcription errors in the source page, corrected and listed in the ledger.
CORRECTIONS = {("island-upgrade-cost", 0, 1, 4): ("520,00", "520,000")}
corrections_applied = []
reference = []
for slug, title in REFERENCE:
    page = soup(f"table__{slug}.html")
    blocks = []
    for t in page.find_all("table"):
        heading = t.find_previous(["h2", "h3"])
        rows = [[" · ".join(c.stripped_strings) for c in r.find_all(["th", "td"])] for r in t.find_all("tr")]
        rows = [r for r in rows if any(r)]
        if slug == "transport-mount-capacity" and len(rows) > 100:
            continue  # the cargo table is generated from item weights instead
        if slug == "transport-mount-capacity":
            rows = [r[:3] for r in rows]
        if slug == "biomes":
            rows = [r[:5] for r in rows]  # drop the external "Learn more" link column
        index = len(blocks)
        for (cslug, cindex, crow, ccol), (old, new) in CORRECTIONS.items():
            if cslug == slug and cindex == index and rows[crow + 1][ccol] == old:
                rows[crow + 1][ccol] = new
                corrections_applied.append(f"{slug} table {cindex + 1} row {crow + 1}: {old} → {new}")
        label = HEADINGS.get(slug, [None] * 9)[index] or (heading.get_text(" ", strip=True) if heading else None)
        blocks.append({"heading": label, "header": rows[0], "rows": rows[1:]})
    reference.append({"slug": slug, "title": title, "tables": blocks})
write("reference-tables.json", reference, len(reference), "Thirteen reference tables as displayed on the archived table pages")

# ---------------------------------------------------------------- Avalon mapper
mapper_block = load(next((DATA / "static-tables").glob("avalon-mapper-*.json")))
locations = next(b["value"] for b in mapper_block if b["variable"] == "S")
roads = next(b["value"] for b in mapper_block if b["variable"] == "C")
write(
    "avalon-locations.json",
    {"locations": locations, "roads": roads},
    len(locations),
    "857 Royal/Outlands/Roads location names and 322 Roads zones with tier and resource/dungeon icons",
)

# write items last so laborer loot names are included
write(
    "items.json",
    items,
    len(items),
    "id → [English name, weight kg per unit or null, base item value or null] for every recipe, upgrade, transport and laborer-loot item",
)

LEDGER.write_text(
    json.dumps(
        {
            "source": "Owner-supplied albiononlinegrind.com public archive",
            "captured": CAPTURED,
            "importer": "scripts/import-grind-game-data.py",
            "inputs": dict(sorted(sources.items())),
            "outputs": dict(sorted(outputs.items())),
            "verification": {
                "imported": True,
                "transcriptionCrossChecked": True,
                "inGameManuallyVerified": False,
                "currentPatchVerified": False,
            },
            "corrections": corrections_applied,
            "rightsBoundary": "Owner identifies the archived site as theirs. Factual game fields only; captured code is never executed or shipped.",
        },
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
for path, meta in outputs.items():
    print(f"{path}: {meta['rows']} rows, {meta['bytes'] / 1024:.0f} KiB")
