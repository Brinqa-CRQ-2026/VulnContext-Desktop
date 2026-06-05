from datetime import datetime, timezone

from app import models


def seed_topology(db_session):
    virtucon = models.Company(name="Virtucon")
    cyberdyne = models.Company(name="Cyberdyne Systems")
    db_session.add_all([virtucon, cyberdyne])
    db_session.flush()

    online_store = models.BusinessUnit(
        company_id=virtucon.id,
        source_id="9876545",
        name="Online Store",
        slug="online-store",
        description=(
            "All online presence and operation including storefront and inventory "
            "systems as well as customer facing interactions."
        ),
        owner="martin.carley",
    )
    manufacturing = models.BusinessUnit(
        company_id=cyberdyne.id,
        source_id="4378456",
        name="Manufacturing",
        slug="manufacturing",
        description=(
            "All development procedures and device manufacturing related services "
            "from warehouses to automated robotics."
        ),
        owner="karen.zombo",
    )
    db_session.add_all([online_store, manufacturing])
    db_session.flush()

    business_services = [
        models.BusinessService(
            business_unit_id=online_store.id,
            source_id="ds08f97867",
            name="Digital Media",
            slug="digital-media",
            description="Consumer access of Digital media.",
            criticality_label="3-medium",
            division="Consumer Services",
            manager="beth.anglin",
        ),
        models.BusinessService(
            business_unit_id=online_store.id,
            source_id="df089sd7867",
            name="Shipping and Tracking",
            slug="shipping-and-tracking",
            description="Maintains the shipping and tracking information on online consumer purchases.",
            criticality_label="2-low",
            division="Consumer Services",
            manager="avinash.yenduri",
        ),
        models.BusinessService(
            business_unit_id=online_store.id,
            name="Digital Storefront",
            slug="digital-storefront",
            description="This is the experience for our online store.",
        ),
        models.BusinessService(
            business_unit_id=manufacturing.id,
            source_id="gf6ds879sdf34",
            name="Logistics",
            slug="logistics",
            description="Logistics for device manufacturing",
            criticality_label="3-medium",
            division="Corporate Services",
            manager="carol.coughlin",
        ),
        models.BusinessService(
            business_unit_id=manufacturing.id,
            source_id="afsg67df89sf",
            name="Manufacturing Shop",
            slug="manufacturing-shop",
            description="Infrastructure directly relating to manufacturing shop operation.",
            criticality_label="5-critical",
            division="Corporate Services",
            manager="geoff.smiles",
        ),
    ]
    db_session.add_all(business_services)
    db_session.flush()

    service_by_name = {service.name: service for service in business_services}
    applications = [
        models.Application(
            business_service_id=service_by_name["Digital Storefront"].id,
            name="Identity Verify",
            slug="identity-verify",
            first_seen_at=datetime(2025, 2, 18, 11, 35, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Digital Storefront"].id,
            name="Virtucon.com",
            slug="virtucon-com",
            first_seen_at=datetime(2025, 2, 18, 11, 34, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Digital Storefront"].id,
            name="Science Lab",
            slug="science-lab",
            first_seen_at=datetime(2025, 2, 18, 11, 34, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Logistics"].id,
            name="Order Placement",
            slug="order-placement",
            first_seen_at=datetime(2025, 2, 18, 11, 34, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Manufacturing Shop"].id,
            name="File Sharing",
            slug="file-sharing",
            first_seen_at=datetime(2025, 2, 18, 11, 34, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Shipping and Tracking"].id,
            name="Cyberdyne.com",
            slug="cyberdyne-com",
            first_seen_at=datetime(2025, 2, 18, 11, 35, tzinfo=timezone.utc),
        ),
        models.Application(
            business_service_id=service_by_name["Digital Media"].id,
            name="Inventory Manager",
            slug="inventory-manager",
            first_seen_at=datetime(2025, 2, 18, 11, 34, tzinfo=timezone.utc),
        ),
    ]
    db_session.add_all(applications)
    db_session.commit()

    return {
        "companies": {"Virtucon": virtucon, "Cyberdyne Systems": cyberdyne},
        "business_units": {"Online Store": online_store, "Manufacturing": manufacturing},
        "business_services": service_by_name,
        "applications": {application.name: application for application in applications},
    }


def seed_asset(
    db_session,
    *,
    asset_id: str,
    hostname: str,
    business_service: str,
    application: str | None = None,
    finding_risks: list[float] | None = None,
    environment: str = "test",
    status: str = "Confirmed active",
    pci: bool | None = None,
    pii: bool | None = None,
    compliance_flags: str | None = None,
    device_type: str | None = None,
    category: str | None = None,
):
    asset = models.Asset(
        asset_id=asset_id,
        hostname=hostname,
        business_service=business_service,
        application=application,
        environment=environment,
        status=status,
        pci=pci,
        pii=pii,
        compliance_flags=compliance_flags,
        device_type=device_type,
        category=category,
    )
    db_session.add(asset)
    db_session.flush()

    for idx, risk in enumerate(finding_risks or [], start=1):
        db_session.add(
            models.Finding(
                asset_id=asset_id,
                finding_id=f"{asset_id}-finding-{idx}",
                finding_uid=f"{asset_id}-uid-{idx}",
                finding_name=f"Finding {asset_id}-{idx}",
                status="Confirmed active",
                cve_id=f"CVE-2024-{idx:04d}",
                brinqa_base_risk_score=max(0.0, risk - 1),
                brinqa_risk_score=risk,
                first_found=datetime(2024, 1, 1, tzinfo=timezone.utc),
                last_found=datetime(2024, 1, 15, tzinfo=timezone.utc),
                age_in_days=14.0,
                date_created=datetime(2024, 1, 1, tzinfo=timezone.utc),
                last_updated=datetime(2024, 1, 20, tzinfo=timezone.utc),
            )
        )

    db_session.commit()
    return asset
