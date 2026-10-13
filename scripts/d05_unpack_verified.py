"""Verify and unpack the frozen, isolated v1.0.40 Python Gateway snapshot.

Safety: refuses unknown archive paths, tampered bytes, existing output directories
and symlink members. Extraction target must be a disposable synthetic workspace.
No network or credentials are used.
"""
import argparse
import hashlib
import pathlib
import stat
import zipfile

ARCHIVE = pathlib.Path(__file__).resolve().parents[1] / "tools" / "d05" / "synthetic-gateway-v1.0.40.zip"
ARCHIVE_SHA256 = "7b012325bb8fbd9da9464ade922989863aac201c3250f39070f12ae2e730c88f"
FILES = {
    "hydra_d05/__init__.py": "dc5982ef9dceab80e49bac23b8b66ea843c5455dcf7295e1ff82af6a88751939",
    "hydra_d05/api.py": "7e9d38c31cf8ddb0d023c0375070caf4fbf97cfdaae1dd881f759d1336305511",
    "hydra_d05/ledger.py": "ebcf54f1dc9ad0467e48bec6660241fa6b3a04296c6a87e06b291ee7b6abbba3",
    "requirements.txt": "103679bf047b822870f8fa2f87e81bb950b846ccff5e69b9eaa760acfd5e1f09",
    "requirements-dev.txt": "5b0d8b1296a5213053e5c6247f2163400d57b2ccd173d2b6c64dc847944ed67d",
}
def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dest", required=True, help="New, empty synthetic-only output directory")
    args = parser.parse_args()
    raw = ARCHIVE.read_bytes()
    if sha256(raw) != ARCHIVE_SHA256:
        raise SystemExit("HOLD: archive SHA-256 mismatch")
    target = pathlib.Path(args.dest).resolve()
    if target == pathlib.Path("/") or target == pathlib.Path.home().resolve():
        raise SystemExit("HOLD: refusing unsafe output directory")
    if target.exists():
        raise SystemExit("HOLD: output directory already exists; refusing overwrite")
    with zipfile.ZipFile(ARCHIVE) as package:
        listed = package.namelist()
        if set(listed) != set(FILES) or len(listed) != len(FILES):
            raise SystemExit("HOLD: unexpected or duplicate source files")
        verified = {}
        for item in package.infolist():
            if (pathlib.PurePosixPath(item.filename).is_absolute()
                or ".." in pathlib.PurePosixPath(item.filename).parts
                or stat.S_ISLNK((item.external_attr >> 16) & 0xFFFF)):
                raise SystemExit("HOLD: invalid archive path/type")
            data = package.read(item)
            if sha256(data) != FILES[item.filename]:
                raise SystemExit("HOLD: source SHA-256 mismatch for "+item.filename)
            verified[item.filename] = data
    target.mkdir(parents=True)
    for filename,data in verified.items():
        dest=target / filename
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_bytes(data)
    print("VERIFIED: v1.0.40 synthetic gateway source extracted: "+str(target))
    print("WARNING: offline single-host prototype; no production grant enforcement")

if __name__ == "__main__":
    main()
