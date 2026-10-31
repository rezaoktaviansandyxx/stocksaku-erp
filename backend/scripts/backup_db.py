"""Backup database StokSaku ke file pg_dump custom-format.

Usage (dari folder backend/):
    python scripts/backup_db.py                     # default ke backups/
    python scripts/backup_db.py --output-dir X
"""
import argparse
from pathlib import Path
import subprocess
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default="backups")
    args = parser.parse_args()

    db_url = settings.database_url
    if db_url.startswith("postgresql+psycopg://"):
        db_url = db_url.replace("postgresql+psycopg://", "postgresql://", 1)
    if not db_url.startswith(("postgresql://", "postgres://")):
        sys.exit("Backup hanya mendukung PostgreSQL. URL aktif: %s" % db_url.split("://")[0] + "://***")

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"stocksaku-backup-{datetime.now():%Y%m%d-%H%M%S}.dump"
    target = out_dir / filename

    subprocess.run(
        ["pg_dump", "--format=custom", "--file", str(target), db_url],
        check=True,
    )
    size_mb = target.stat().st_size / (1024 * 1024)
    print(f"Backup selesai: {target} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    from datetime import datetime
    main()
