import csv
from io import StringIO
from uuid import uuid4

from sqlalchemy.orm import Session

from backend.db import BomCatalog
from backend.schemas.materials import BomCatalogSummary, BomProduct

BOM_COLUMNS = ("product_id", "product_name", "material_id", "material_name", "qty")


def parse_bom_catalog(content: str) -> BomCatalog:
    reader = csv.DictReader(StringIO(content.lstrip("\ufeff")), strict=True)
    products, materials, recipes = {}, {}, {}
    try:
        if reader.fieldnames is None or sorted(reader.fieldnames) != sorted(BOM_COLUMNS):
            raise ValueError(f"Expected CSV columns: {', '.join(BOM_COLUMNS)}")
        for row in reader:
            if None in row or any(value is None for value in row.values()):
                raise ValueError(f"Invalid columns on line {reader.line_num}")
            product, product_name, material, material_name, quantity = (row[key].strip() for key in BOM_COLUMNS)
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


def load_bom_catalog(db: Session) -> BomCatalog:
    return db.get(BomCatalog, 1) or BomCatalog(id=1, products={}, materials={}, recipes={})


def summarize_bom_catalog(catalog: BomCatalog) -> BomCatalogSummary:
    return BomCatalogSummary(
        version=catalog.version,
        products=[BomProduct(product_id=key, product_name=value) for key, value in catalog.products.items()],
    )
