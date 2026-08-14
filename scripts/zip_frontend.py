"""Create an Amplify-compatible zip with POSIX paths (forward slashes)."""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: zip_frontend.py <dist-dir> <zip-path>")
    root = Path(sys.argv[1]).resolve()
    zip_path = Path(sys.argv[2]).resolve()
    if zip_path.exists():
        zip_path.unlink()
    count = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in root.rglob("*"):
            if path.is_file():
                archive.write(path, path.relative_to(root).as_posix())
                count += 1
    names = zipfile.ZipFile(zip_path).namelist()
    print(f"Wrote {count} files to {zip_path}")
    print("\n".join(names))


if __name__ == "__main__":
    main()
