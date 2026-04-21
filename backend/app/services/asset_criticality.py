from __future__ import annotations

from sqlalchemy.orm import Session

from app import models

PREDEFINED_TAGS: list[dict] = [
    {"name": "PCI", "score": 5, "description": "Asset handles PCI-related data."},
    {"name": "PII", "score": 4, "description": "Asset handles personally identifiable information."},
    {"name": "Production", "score": 5, "description": "Production environment asset."},
    {"name": "Test", "score": 2, "description": "Test environment asset."},
    {"name": "Development", "score": 1, "description": "Development environment asset."},
    {"name": "Internet Exposed", "score": 4, "description": "Asset is externally exposed."},
    {"name": "Internal Only", "score": 2, "description": "Asset is internal only."},
]


def calculate_asset_criticality(asset: models.Asset) -> int | None:
    scores: list[int] = []
    for assignment in getattr(asset, "tag_assignments", []) or []:
        tag = assignment.tag
        if tag and tag.score is not None:
            scores.append(int(tag.score))
    return max(scores) if scores else None


def refresh_asset_criticality(asset: models.Asset) -> int | None:
    asset.asset_criticality = calculate_asset_criticality(asset)
    return asset.asset_criticality


def infer_predefined_tag_names(asset: models.Asset) -> list[str]:
    names: list[str] = []

    if asset.pci:
        names.append("PCI")

    if asset.pii:
        names.append("PII")

    if asset.internal_or_external:
        normalized = asset.internal_or_external.strip().lower()
        if normalized == "external":
            names.append("Internet Exposed")
        elif normalized == "internal":
            names.append("Internal Only")

    # environment inference from existing text fields.
    text_candidates = [
        asset.business_service or "",
        asset.application or "",
        asset.category or "",
        asset.status or "",
        asset.hostname or "",
    ]
    combined = " ".join(text_candidates).lower()
    if "prod" in combined or "production" in combined:
        names.append("Production")
    elif "test" in combined or "qa" in combined or "uat" in combined:
        names.append("Test")
    elif "dev" in combined or "development" in combined:
        names.append("Development")

    # remove duplicates
    return list(dict.fromkeys(names))


def ensure_predefined_tags(db: Session) -> dict[str, models.AssetTagDefinition]:
    existing = {
        row.name: row
        for row in db.query(models.AssetTagDefinition).all()
    }

    for payload in PREDEFINED_TAGS:
        if payload["name"] in existing:
            continue
        tag = models.AssetTagDefinition(
            name=payload["name"],
            score=payload["score"],
            description=payload["description"],
            is_predefined=True,
        )
        db.add(tag)
        existing[payload["name"]] = tag

    db.flush()
    return existing


def replace_asset_tags(
    db: Session,
    asset: models.Asset,
    tag_ids: list[str],
    *,
    assigned_by: str | None = None,
) -> models.Asset:
    db.query(models.AssetTagAssignment).filter(
        models.AssetTagAssignment.asset_id == asset.asset_id
    ).delete(synchronize_session=False)

    if tag_ids:
        tags = (
            db.query(models.AssetTagDefinition)
            .filter(models.AssetTagDefinition.id.in_(tag_ids))
            .all()
        )
        found_ids = {tag.id for tag in tags}
        missing = [tag_id for tag_id in tag_ids if tag_id not in found_ids]
        if missing:
            raise ValueError(f"Unknown tag IDs: {', '.join(missing)}")

        for tag in tags:
            db.add(
                models.AssetTagAssignment(
                    asset_id=asset.asset_id,
                    tag_id=tag.id,
                    assigned_by=assigned_by,
                )
            )

    db.flush()
    return asset


def auto_assign_predefined_tags(db: Session, asset: models.Asset) -> models.Asset:
    predefined = ensure_predefined_tags(db)
    inferred_names = infer_predefined_tag_names(asset)
    inferred_ids = [predefined[name].id for name in inferred_names if name in predefined]
    replace_asset_tags(db, asset, inferred_ids, assigned_by="system")
    return asset