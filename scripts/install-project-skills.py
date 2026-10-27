"""Validate or copy the reviewed, pinned vendor skills. No network, hooks or package installers."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def validate():
    manifest = json.loads((ROOT / "skill-system/vendor-lock.json").read_text())
    names = set()
    for skill in manifest["skills"]:
        name = skill["name"]
        if name in names or not name.replace("-", "").isalnum():
            raise ValueError("Invalid or duplicate skill name")
        names.add(name)
        directory = ROOT / "skill-system/vendor" / name
        files = {str(p.relative_to(directory)): p for p in directory.rglob("*") if p.is_file()}
        if set(files) != set(skill["files"]):
            raise ValueError(f"Unreviewed file set: {name}")
        for path, file in files.items():
            if file.is_symlink() or hashlib.sha256(file.read_bytes()).hexdigest() != skill["files"][path]:
                raise ValueError(f"Integrity mismatch: {name}/{path}")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--dest", type=Path, default=ROOT / ".agents/skills")
    args = parser.parse_args()
    manifest = validate()
    if args.check:
        print(f"PASS: {len(manifest['skills'])} pinned vendor skills; activation/discovery is a separate check")
        return
    destination = args.dest.absolute()
    if destination.is_symlink():
        raise ValueError("Refusing a symlink destination")
    # Refuse any conflicting existing installation before creating a staging directory.
    pending = []
    for skill in manifest["skills"]:
        target = destination / skill["name"]
        if target.exists():
            actual = {str(p.relative_to(target)): hashlib.sha256(p.read_bytes()).hexdigest()
                      for p in target.rglob("*") if p.is_file() and not p.is_symlink()}
            if actual != skill["files"] or any(p.is_symlink() for p in target.rglob("*")):
                raise ValueError(f"Existing skill differs; refusing overwrite: {skill['name']}")
        else:
            pending.append(skill)
    destination.mkdir(parents=True, exist_ok=True)
    # This fails immediately on the protected project mount, before copying any skill.
    temporary = Path(tempfile.mkdtemp(prefix=".outpost-skills-", dir=destination))
    try:
        for skill in pending:
            shutil.copytree(ROOT / "skill-system/vendor" / skill["name"], temporary / skill["name"])
        for skill in pending:
            os.rename(temporary / skill["name"], destination / skill["name"])
    finally:
        shutil.rmtree(temporary)
    print(f"Installed {len(pending)} skills into {destination}; existing matching copies preserved")
    print("Open a fresh Codex skill catalog and verify names/paths before claiming discovery.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        raise SystemExit(f"BLOCKED: {error}")
