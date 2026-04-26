up:
	docker compose up --build

down:
	docker compose down

score-crq:
	cd backend && python3 scripts/score_findings_crq_v1.py

score-crq-v4:
	cd backend && python3 scripts/score_findings_crq_v1.py

score-crq-preview:
	cd backend && python3 scripts/score_findings_crq_v1.py --dry-run
