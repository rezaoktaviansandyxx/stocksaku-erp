from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models.organization import Organization


def main() -> None:
    with SessionLocal() as db:
        db.add(Organization(name="Toko Maju", slug="toko-maju"))
        db.commit()

        org = db.query(Organization).filter_by(slug="toko-maju").one()
        print("Tersimpan:", org.id, org.name, org.status, org.created_at)

        db.add(Organization(name="Toko Lain", slug="toko-maju"))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            print("OK: slug duplikat ditolak")

        db.query(Organization).filter_by(slug="toko-maju").delete()
        db.commit()


if __name__ == "__main__":
    main()
