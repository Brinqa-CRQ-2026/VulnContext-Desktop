from pathlib import Path


def test_active_api_modules_are_thin_wrappers():
    backend_root = Path(__file__).resolve().parents[1]
    api_dir = backend_root / "app" / "api"
    files = [
        api_dir / "findings.py",
        api_dir / "sources.py",
        *sorted((api_dir / "topology").glob("*.py")),
    ]
    for path in files:
        content = path.read_text()
        assert "db.query(" not in content
        assert "joinedload(" not in content
        assert "func.count(" not in content
