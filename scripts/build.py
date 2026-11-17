"""Builds everything ARK ships, from the files in this repository.

    python scripts/build.py              # app file + website folder + zips
    python scripts/build.py --app-only   # just rebuild ARK-CRISIS-SUITE.html from app/src/
    python scripts/build.py --check      # fail if ARK-CRISIS-SUITE.html is out of date (used by CI)
    python scripts/build.py --with-node  # also bundle Node.js for Windows into the hub kit
                                         # (downloads ~35 MB from nodejs.org; use for releases)

The app is written as small source files in app/src/ and joined, in the order listed in
app/parts.txt, into the single file ARK-CRISIS-SUITE.html at the repository root (committed, so
anyone can download and open it without building).

Output (in build/, which is not committed):

    build/public_html/       exactly what goes into the web host's public_html folder
    build/ARK-website.zip    the same, zipped — upload and extract in the host's File Manager
    build/ARK-hub-kit/       the offline hub kit (hub program + app + starter files)
    build/ARK-hub-kit.zip    the same, zipped — attached to each GitHub release
    build/ARK-CRISIS-SUITE.html   the app on its own

Standard library only. Nothing here changes the source files.
"""
from __future__ import annotations

import hashlib
import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
APP = ROOT / "ARK-CRISIS-SUITE.html"
NODE_LINE = "latest-v22.x"            # long-term-support line bundled for Windows hubs


def assemble_app() -> str:
    """Join the source parts listed in app/parts.txt into the single-file app."""
    src = ROOT / "app" / "src"
    names = [l.strip() for l in (ROOT / "app" / "parts.txt").read_text(encoding="utf-8").splitlines()
             if l.strip() and not l.startswith("#")]
    on_disk = {p.relative_to(src).as_posix() for p in src.rglob("*") if p.is_file()}
    missing, unused = [n for n in names if n not in on_disk], sorted(on_disk - set(names))
    if missing or unused:
        sys.exit(f"app/parts.txt does not match app/src/: missing {missing}, not listed {unused}")
    return "".join((src / n).read_text(encoding="utf-8") for n in names)


def build_app(check_only: bool = False) -> None:
    text = assemble_app()
    current = APP.read_text(encoding="utf-8") if APP.exists() else ""
    if check_only:
        if text != current:
            sys.exit("ARK-CRISIS-SUITE.html is out of date. Run: python scripts/build.py --app-only")
        print("ARK-CRISIS-SUITE.html matches app/src/")
        return
    if text != current:
        APP.write_text(text, encoding="utf-8", newline="")
    print(f"ARK-CRISIS-SUITE.html  {len(text.encode('utf-8')) / 1000:.0f} KB from app/src/")


def clean() -> None:
    if BUILD.exists():
        shutil.rmtree(BUILD)
    BUILD.mkdir()


def check_app() -> None:
    """Refuse to ship an app file that is obviously broken or still points at old addresses."""
    text = APP.read_text(encoding="utf-8")
    problems = []
    for needle in ("ARK_PRISTINE_MARKER", "https://arks.solutions/?patches", "</html>"):
        if needle not in text:
            problems.append(f"missing expected text: {needle}")
    for needle in ("ark.halosuite.ai", "ARK-admin-2024"):
        if needle in text:
            problems.append(f"contains forbidden text: {needle}")
    if len(text) < 400_000:
        problems.append("file is suspiciously small")
    if problems:
        sys.exit("ARK-CRISIS-SUITE.html failed checks:\n  - " + "\n  - ".join(problems))


def build_website() -> Path:
    out = BUILD / "public_html"
    # Files starting with "_" are build inputs (for example the link-preview source), not pages.
    shutil.copytree(ROOT / "web", out, ignore=shutil.ignore_patterns("_*"))
    shutil.copy2(APP, out / APP.name)
    return out


def build_hub_kit(with_node: bool) -> Path:
    out = BUILD / "ARK-hub-kit"
    out.mkdir()
    skip = shutil.ignore_patterns("hub-data", "inbox", "outbox", "node_modules", "*.log")
    shutil.copytree(ROOT / "src" / "hub", out / "hub", ignore=skip)
    shutil.copytree(ROOT / "src" / "toolkit", out / "toolkit", ignore=skip)
    shutil.copy2(APP, out / APP.name)
    for item in sorted((ROOT / "kit").iterdir()):
        shutil.copy2(item, out / item.name)
    shutil.copy2(ROOT / "PROTOCOL.md", out / "PROTOCOL.md")
    shutil.copy2(ROOT / "LICENSE", out / "LICENSE")
    (out / "library" / "files").mkdir(parents=True)
    (out / "library" / "files" / "README.txt").write_text(
        "Files placed in this folder are offered to everyone who joins the hub (maps, books, apps).\n"
        "The hub also looks here for a bundled copy of Node.js.\n", encoding="utf-8")
    if with_node:
        fetch_node_for_windows(out / "library" / "files")
    return out


def fetch_node_for_windows(dest: Path) -> None:
    base = f"https://nodejs.org/dist/{NODE_LINE}/"
    sums = urllib.request.urlopen(base + "SHASUMS256.txt", timeout=60).read().decode()
    line = next(l for l in sums.splitlines() if l.endswith("-win-x64.zip"))
    expected, name = line.split()
    print(f"downloading {name} …")
    data = urllib.request.urlopen(base + name, timeout=600).read()
    actual = hashlib.sha256(data).hexdigest()
    if actual != expected:
        sys.exit(f"Node.js download failed its checksum ({actual} != {expected})")
    (dest / name).write_bytes(data)
    print(f"bundled {name} ({len(data) // 1_000_000} MB, checksum verified)")


def zip_dir(folder: Path, target: Path, top: str | None = None) -> None:
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for path in sorted(folder.rglob("*")):
            if path.is_file():
                rel = path.relative_to(folder).as_posix()
                z.write(path, f"{top}/{rel}" if top else rel)


def main() -> None:
    with_node = "--with-node" in sys.argv
    if "--check" in sys.argv:
        build_app(check_only=True)
        check_app()
        return
    build_app()
    check_app()
    if "--app-only" in sys.argv:
        return
    clean()
    site = build_website()
    kit = build_hub_kit(with_node)
    shutil.copy2(APP, BUILD / APP.name)
    zip_dir(site, BUILD / "ARK-website.zip")
    zip_dir(kit, BUILD / "ARK-hub-kit.zip", top="ARK-hub-kit")
    print("\nBuilt:")
    for path in sorted(BUILD.iterdir()):
        size = path.stat().st_size if path.is_file() else sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
        print(f"  {path.name:<28} {size / 1_000_000:6.1f} MB")
    if not with_node:
        print("\nNote: the hub kit was built WITHOUT Node.js for Windows. Use --with-node for a release.")


if __name__ == "__main__":
    main()
