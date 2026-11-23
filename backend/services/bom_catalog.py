import csv
import logging
from io import StringIO
from pathlib import Path
from uuid import uuid4

from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from backend.db import BomCatalog
from backend.schemas.materials import BomCatalogSummary, BomProduct

LOGGER = logging.getLogger(__name__)

BOM_COLUMNS = ("product_id", "product_name", "material_id", "material_name", "qty")
BOM_3_COLUMNS = ("product_id", "material_id", "qty")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"


def get_reference_names() -> tuple[dict[str, str], dict[str, str]]:
    known_products: dict[str, str] = {}
    known_materials: dict[str, str] = {}
    products_csv = DATA_DIR / "products.csv"
    if products_csv.exists():
        try:
            with open(products_csv, encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    if "product_id" in row and "product_name" in row:
                        known_products[row["product_id"].strip()] = row["product_name"].strip()
        except Exception as exc:
            LOGGER.warning("Could not read products.csv for BOM reference names: %s", exc)

    raw_materials_csv = DATA_DIR / "raw_materials.csv"
    if raw_materials_csv.exists():
        try:
            with open(raw_materials_csv, encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    if "material_id" in row and "material_name" in row:
                        known_materials[row["material_id"].strip()] = row["material_name"].strip()
        except Exception as exc:
            LOGGER.warning("Could not read raw_materials.csv for BOM reference names: %s", exc)

    return known_products, known_materials


def parse_bom_catalog(content: str) -> BomCatalog:
    reader = csv.DictReader(StringIO(content.lstrip("\ufeff")), strict=True)
    if reader.fieldnames is None:
        raise ValueError(f"Expected CSV columns: {', '.join(BOM_COLUMNS)} or {', '.join(BOM_3_COLUMNS)}")

    fieldnames = [f.strip() for f in reader.fieldnames]
    is_5_col = sorted(fieldnames) == sorted(BOM_COLUMNS)
    is_3_col = sorted(fieldnames) == sorted(BOM_3_COLUMNS)
    if not is_5_col and not is_3_col:
        raise ValueError(f"Expected CSV columns: {', '.join(BOM_COLUMNS)} or {', '.join(BOM_3_COLUMNS)}")

    known_products, known_materials = get_reference_names() if is_3_col else ({}, {})
    products, materials, recipes = {}, {}, {}
    try:
        for row in reader:
            if None in row or any(value is None for value in row.values()):
                raise ValueError(f"Invalid columns on line {reader.line_num}")
            if is_5_col:
                product, product_name, material, material_name, quantity = (row[key].strip() for key in BOM_COLUMNS)
            else:
                product, material, quantity = (row[key].strip() for key in BOM_3_COLUMNS)
                product_name = known_products.get(product, product.replace("_", " ").title())
                material_name = known_materials.get(material, material.replace("RM_", "").replace("_", " ").title())

            if (not all(0 < len(value) <= 50 and "/" not in value and "\\" not in value for value in (product, material))
                    or not all(0 < len(value) <= 120 for value in (product_name, material_name))):
                raise ValueError(f"Invalid product or material identifier or name on line {reader.line_num}")
            if not quantity.isascii() or not quantity.isdecimal() or len(quantity) > 6 or not 1 <= int(quantity) <= 100_000:
                raise ValueError(f"Quantity must be a whole number from 1 to 100000 on line {reader.line_num}")
            if products.setdefault(product, product_name) != product_name or materials.setdefault(material, material_name) != material_name:
                raise ValueError(f"Conflicting product or material name on line {reader.line_num}")
            recipe = recipes.setdefault(product, {})
            if material in recipe:
                raise ValueError(f"Duplicate product and material combination on line {reader.line_num}")
            recipe[material] = int(quantity)
    except csv.Error as exc:
        raise ValueError(f"Invalid CSV on line {reader.line_num}") from exc
    if not products:
        raise ValueError("The CSV must contain at least one recipe")
    return BomCatalog(id=1, version=str(uuid4()), products=products, materials=materials, recipes=recipes)


def load_default_bom_catalog() -> BomCatalog:
    bom_path = DATA_DIR / "bom.csv"
    if not bom_path.exists():
        raise FileNotFoundError(f"Default BOM CSV not found at {bom_path}")
    content = bom_path.read_text(encoding="utf-8")
    return parse_bom_catalog(content)


def seed_default_bom(db: Session) -> BomCatalog | None:
    if db.get(BomCatalog, 1) is not None:
        return None
    try:
        catalog = load_default_bom_catalog()
    except Exception as exc:
        LOGGER.warning("Could not load default BOM catalog from data/bom.csv: %s", exc)
        return None

    insert = postgres_insert if db.get_bind().dialect.name == "postgresql" else sqlite_insert
    values = {
        "version": catalog.version,
        "products": catalog.products,
        "materials": catalog.materials,
        "recipes": catalog.recipes,
    }
    stmt = insert(BomCatalog).values(id=1, **values)
    db.execute(stmt.on_conflict_do_update(index_elements=[BomCatalog.id], set_=values))
    db.commit()
    LOGGER.info(
        "Default BOM catalog seeded from data/bom.csv (%d products, %d materials)",
        len(catalog.products),
        len(catalog.materials),
    )
    return catalog


def load_bom_catalog(db: Session) -> BomCatalog:
    return db.get(BomCatalog, 1) or BomCatalog(id=1, products={}, materials={}, recipes={})


def summarize_bom_catalog(catalog: BomCatalog) -> BomCatalogSummary:
    return BomCatalogSummary(
        version=catalog.version,
        products=[BomProduct(product_id=key, product_name=value) for key, value in catalog.products.items()],
    )
