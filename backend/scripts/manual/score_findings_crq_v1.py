"""Compatibility wrapper for the renamed CRQ findings scoring script."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.manual.score_crq_findings_v1 import main


if __name__ == "__main__":
    raise SystemExit(main())
