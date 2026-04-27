up:
	docker compose up --build

down:
	docker compose down

desktop:
	bash scripts/run-desktop.sh

score-crq:
	cd backend && python3 scripts/score_findings_crq_v1.py

score-crq-findings:
	cd backend && python3 scripts/score_crq_findings_v1.py

score-crq-v4:
	cd backend && python3 scripts/score_findings_crq_v1.py

score-crq-preview:
	cd backend && python3 scripts/score_findings_crq_v1.py --dry-run

score-assets:
	cd backend && python3 scripts/score_assets_crq_v1.py

score-crq-assets:
	cd backend && python3 scripts/score_crq_assets_v1.py
