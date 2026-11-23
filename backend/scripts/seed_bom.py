"""Seed the operational BOM catalog from data/bom.csv into the database."""

import logging
import sys

from backend.db import SessionLocal, create_tables
from backend.services.bom_catalog import seed_default_bom

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_bom")


def main() -> None:
    create_tables()
    with SessionLocal() as db:
        catalog = seed_default_bom(db)
        if catalog:
            logger.info(
                "Successfully seeded BOM catalog: %d products, %d materials",
                len(catalog.products),
                len(catalog.materials),
            )
        else:
            logger.info("BOM catalog already seeded or exists in database.")


if __name__ == "__main__":
    main()
