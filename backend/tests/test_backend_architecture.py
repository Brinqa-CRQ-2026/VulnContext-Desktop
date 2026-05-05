from pathlib import Path


def test_active_api_modules_are_thin_wrappers():
    backend_root = Path(__file__).resolve().parents[1]
    api_dir = backend_root / "app" / "api"
    for filename in ("findings.py", "sources.py", "topology.py"):
        content = (api_dir / filename).read_text()
        assert "db.query(" not in content
        assert "joinedload(" not in content
        assert "func.count(" not in content
