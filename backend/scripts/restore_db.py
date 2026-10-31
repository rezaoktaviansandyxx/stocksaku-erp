"""Restore database StokSaku dari file pg_dump custom-format.

PERINGATAN: opsi --clean akan menghapus objek database target sebelum restore.
Usage (dari folder backend/):
    python scripts/restore_db.py backups/stocksaku-backup-YYYYMMDD-HHMMSS.dump
    python scripts/restore_db.py --clean backups/xxx.dump
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
    parser.add_argument("dump_file")
    parser.add_argument("--clean", action="store_true", help="hapus objek target sebelum restore")
    args = parser.parse_args()

    dump_path = Path(args.dump_file)
    if not dump_path.exists():
        sys.exit(f"File dump tidak ditemukan: {dump_path}")

    db_url = settings.database_url
    if db_url.startswith("postgresql+psycopg://"):
        db_url = db_url.replace("postgresql+psycopg://", "postgresql://", 1)
    if not db_url.startswith(("postgresql://", "postgres://")):
        sys.exit("Restore hanya mendukung PostgreSQL.")

    confirm = input(f"Restore {dump_path} ke database aktif (.env). Lanjut? (ketik YA): ")
    if confirm != "YA":
        sys.exit("Dibatalkan.")

    cmd = ["pg_restore", "--no-owner"]
    if args.clean:
        cmd += ["--clean", "--if-exists"]
    cmd += ["--dbname", db_url, str(dump_path)]
    subprocess.run(cmd, check=True)
    print("Restore selesai.")


if __name__ == "__main__":
    main()
