"""Compatibility wrapper for the renamed CRQ assets scoring script."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from score_crq_assets_v1 import main


if __name__ == "__main__":
    raise SystemExit(main())
