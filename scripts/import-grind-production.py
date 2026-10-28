#!/usr/bin/env python3
"""Exact historical food/potion recipes from the owner's captured game definitions."""
import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / "Scrape/albiononlinegrind.com/report/data"
definitions = source / "game-item-definitions.json"
names_file = source / "item-names.json"
names = json.loads(names_file.read_text())
recipes = []
skipped = []
def many(v): return v if isinstance(v,list) else [v] if v else []
for item in json.loads(definitions.read_text()):
    category = {"food": "cooking", "potion": "alchemy"}.get(item.get("@craftingcategory"))
    if not category: continue
    base = item["@uniquename"]
    variants = [(base, item.get("craftingrequirements"))]
    for enchantment in many(item.get("enchantments",{}).get("enchantment")):
        variants.append((base + "@" + enchantment["@enchantmentlevel"], enchantment.get("craftingrequirements")))
    for output, requirements in variants:
        if not isinstance(requirements,dict) or not requirements.get("craftresource") or float(requirements.get("@silver",0)) != 0:
            skipped.append(output); continue
        count = float(requirements.get("@amountcrafted",1))
        ingredients = []
        for material in many(requirements["craftresource"]):
            enchant = material.get("@enchantmentlevel","0")
            id = material["@uniquename"] + ("@" + enchant if enchant != "0" else "")
            quantity = float(material["@count"])
            if not re.fullmatch(r"[A-Z0-9_@]{3,100}",id) or quantity <= 0: raise ValueError("Invalid material")
            ingredients.append({"id": id, "name": names.get(id, names.get(material["@uniquename"],id)), "quantity": quantity, "quality": "normal"})
        if not 0 < count <= 1000: raise ValueError("Invalid output quantity")
        recipes.append({"id": "grind-" + output.lower().replace("@","-e"), "name": names.get(base,base) + (" · ." + output.split("@")[1] if "@" in output else ""), "kind": "crafting", "category": category, "output": output, "outputCount": count, "ingredients": ingredients, "baseFocus": float(requirements.get("@craftingfocus",0)), "source": "https://albiononlinegrind.com/" + ("cooking-profit-calculator" if category == "cooking" else "alchemy-profit-calculator"), "historical": True})
dest = root / "src/lib/albion/archived-production-recipes.json"
dest.write_text(json.dumps(recipes,ensure_ascii=False,separators=(",",":")) + "\n")
manifest = {"scope": "Exact food/potion base and explicit enchantment recipes only; no inferred return eligibility, station fees, focus mastery coefficients or current-patch claims", "capturedAt": "2026-10-27", "permission": "Owner authorized old-page reuse in the 2026-10-28 session", "sourceSha256": {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [definitions,names_file]}, "recipeCount":len(recipes), "skipped":skipped, "outputSha256":hashlib.sha256(dest.read_bytes()).hexdigest(), "currentPatchVerified":False}
(root / "docs/data/archived-production-source.json").write_text(json.dumps(manifest,indent=2) + "\n")
print(json.dumps({"recipes":len(recipes),"skipped":len(skipped)}))
