"""Validate Outpost skill manifests and local references; this is not activation evidence."""
import argparse
import importlib.util
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

try:
    import yaml
except ImportError:
    raise SystemExit("PyYAML is required; use an environment with the skill-creator validator dependencies.")

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {"outpost-" + name for name in (
    "frontend", "visual-qa", "albion-data", "calculators", "security", "performance", "release"
)}


def validate(root, skills):
    errors = []
    # This contract governs the seven Outpost skills. Reviewed vendor skills have
    # their own pinned inventory and may share the canonical discovery directory.
    found = {p.name for p in skills.iterdir() if p.is_dir() and p.name.startswith("outpost-")} if skills.is_dir() else set()
    if found != EXPECTED:
        errors.append(f"Skill directory set differs: missing={sorted(EXPECTED-found)}, extra={sorted(found-EXPECTED)}")
    names = set()
    doc_spec = importlib.util.spec_from_file_location("outpost_docs", ROOT / "scripts/docs-validate.py")
    docs = importlib.util.module_from_spec(doc_spec)
    doc_spec.loader.exec_module(docs)
    for folder in sorted(found):
        directory = skills / folder
        manifest = directory / "SKILL.md"
        if not manifest.is_file():
            errors.append(f"{folder}: missing SKILL.md")
            continue
        raw = manifest.read_text()
        front = re.match(r"\A---\n(.*?)\n---(?:\n|$)", raw, re.S)
        if not front:
            errors.append(f"{folder}: invalid frontmatter delimiters")
            continue
        try:
            meta = yaml.safe_load(front[1])
        except yaml.YAMLError:
            errors.append(f"{folder}: invalid YAML")
            continue
        if not isinstance(meta, dict):
            errors.append(f"{folder}: metadata must be a mapping")
            continue
        name, description = meta.get("name"), meta.get("description")
        if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name) or len(name) > 64:
            errors.append(f"{folder}: invalid name")
        elif name in names:
            errors.append(f"{folder}: duplicate name {name}")
        else:
            names.add(name)
        if name != folder:
            errors.append(f"{folder}: directory and manifest name differ")
        if not isinstance(description, str) or not description.strip() or len(description) > 1024 or re.search(r"[<>]", description):
            errors.append(f"{folder}: invalid description")
        if set(meta) - {"name", "description", "license", "allowed-tools", "metadata"}:
            errors.append(f"{folder}: unsupported manifest properties")
        if not raw[front.end():].strip():
            errors.append(f"{folder}: empty instructions")
        for path in directory.rglob("*.md"):
            content = path.read_text()
            if re.search(r"\[TODO:|\b(?:TBD|PLACEHOLDER)\b", content):
                errors.append(f"{path.relative_to(root)}: unfinished scaffold")
            errors.extend(docs.validate_markdown(root, path))
        for path in directory.rglob("*.yaml"):
            try:
                data = yaml.safe_load(path.read_text())
                if not isinstance(data, dict):
                    errors.append(f"{path.relative_to(root)}: YAML must be a mapping")
            except yaml.YAMLError:
                errors.append(f"{path.relative_to(root)}: invalid YAML")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skills-root", default=".agents/skills", help="Root-relative or absolute skill directory")
    args = parser.parse_args()
    skills = (ROOT / args.skills_root).resolve()
    if not skills.is_relative_to(ROOT):
        parser.error("Skills must be inside this project")
    errors = validate(ROOT, skills)
    for error in errors:
        print("FAIL:", error)
    if errors:
        return 1
    print(f"PASS: {len(EXPECTED)} manifests, unique metadata, complete bodies and local links; root={skills.relative_to(ROOT)}")
    print("Discovery and automatic activation are NOT established by this validator.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
