"""Compatibility wrapper for CRQ asset scoring v2."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.manual.score_crq_assets_v2 import main


if __name__ == "__main__":
    raise SystemExit(main())
