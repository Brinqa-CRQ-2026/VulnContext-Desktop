from app.services.kev_enrichment import kev_record_for_cve, load_kev_catalog


def test_load_kev_catalog_parses_cves_and_dates(tmp_path):
    kev_csv = tmp_path / "kev.csv"
    kev_csv.write_text(
        "cveID,dateAdded,dueDate\n"
        "CVE-2023-0001,2024-01-02,2024-02-03\n"
        "CVE-2023-0002,2024-03-04,\n",
        encoding="utf-8",
    )

    catalog = load_kev_catalog(kev_csv)
    assert set(catalog.keys()) == {"CVE-2023-0001", "CVE-2023-0002"}
    assert catalog["CVE-2023-0001"].date_added is not None
    assert catalog["CVE-2023-0001"].due_date is not None
    assert catalog["CVE-2023-0002"].due_date is None


def test_kev_record_for_cve_returns_match_case_insensitive(tmp_path):
    kev_csv = tmp_path / "kev.csv"
    kev_csv.write_text("cveID,dateAdded\nCVE-2024-9999,2024-01-10\n", encoding="utf-8")
    catalog = load_kev_catalog(kev_csv)

    assert kev_record_for_cve(catalog, "cve-2024-9999") is not None
    assert kev_record_for_cve(catalog, "CVE-2024-0000") is None
