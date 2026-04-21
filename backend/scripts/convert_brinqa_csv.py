#!/usr/bin/env python3
"""Convert Brinqa BQL export CSV to format compatible with VulnContext import."""

import pandas as pd
import sys

# Map Brinqa field names (camelCase) to VulnContext expected names (snake_case)
FIELD_MAPPINGS = {
    'uid': 'uid',
    'displayName': 'display_name',
    'riskRating': 'risk_rating',
    'sourceStatus': 'source_status',
    'cveIds': 'cve_ids',
    'cweIds': 'cwe_ids',
    'summary': 'summary',
    'description': 'description',
    'baseRiskScore': 'base_risk_score',
    'riskScore': 'risk_score',
    'severity': 'severity',
    'riskFactorOffset': 'risk_factor_offset',
    'firstDetected': 'first_found',
    'lastDetected': 'last_found',
    'dateCreated': 'date_created',
    'lastUpdated': 'last_updated',
    'targetNames': 'target_names',
    'targetIds': 'target_ids',
    'targetCount': 'target_count',
    'attackPatternNames': 'attack_pattern_names',
    'attackTechniqueNames': 'attack_technique_names',
    'attackTacticNames': 'attack_tactic_names',
    'complianceStatus': 'compliance_status',
    'cisaExpiryDueDate': 'cisa_due_date_expired',
    'categories': 'categories',
    'connectorNames': 'connector_names',
    'dataIntegrationTitles': 'data_integration_titles',
    'dataModelName': 'data_model_name',
    'source': 'source_connector_names',
    'sourceUids': 'source_uids',
    'riskFactorNames': 'risk_factor_names',
    'riskFactorValues': 'risk_factor_values',
    'recordLink': 'record_link',
    'typeDisplayName': 'type_display_name',
    'typeId': 'type_id',
    'slaDays': 'sla_days',
    'slaLevel': 'sla_level',
    'riskOwnerName': 'risk_owner_name',
    'remediationOwnerName': 'remediation_owner_name',
    'createdBy': 'created_by',
    'updatedBy': 'updated_by',
    'riskScoringModel': 'risk_scoring_model_name',
    'slaDefinitionName': 'sla_definition_name',
    'confidence': 'confidence',
}


def convert_brinqa_csv(input_path: str, output_path: str):
    """Convert Brinqa CSV to VulnContext import format."""
    
    print(f"📖 Reading {input_path}...")
    df = pd.read_csv(input_path)
    
    print(f"   Found {len(df)} rows with {len(df.columns)} columns")
    
    # Rename columns using mapping
    existing_mappings = {k: v for k, v in FIELD_MAPPINGS.items() if k in df.columns}
    df = df.rename(columns=existing_mappings)
    
    print(f"   Mapped {len(existing_mappings)} field names")
    
    # Add required fields with defaults if missing
    if 'status' not in df.columns:
        df['status'] = 'Confirmed active'
        print("   ✓ Added 'status' column")
    
    if 'status_category' not in df.columns:
        df['status_category'] = 'Open'
        print("   ✓ Added 'status_category' column")
    
    if 'source_status' not in df.columns:
        print("   ❌ Missing 'source_status' - check if 'sourceStatus' exists in Brinqa data")
        # Try to derive it
        df['source_status'] = 'Active'
        print("   ✓ Added default 'source_status' column")
    
    # Ensure 'id' column exists (use uid if id is missing)
    if 'id' not in df.columns:
        if 'uid' in df.columns:
            df['id'] = df['uid']
            print("   ✓ Mapped 'uid' to 'id'")
        else:
            print("   ❌ Error: CSV missing both 'id' and 'uid' columns")
            return False
    
    # Ensure required columns exist
    required = ['uid', 'status', 'status_category', 'source_status', 'risk_rating', 'id']
    missing = [col for col in required if col not in df.columns]
    
    if missing:
        print(f"   ❌ Still missing required columns: {', '.join(missing)}")
        return False
    
    print(f"\n💾 Writing {output_path}...")
    df.to_csv(output_path, index=False)
    
    print(f"✅ Conversion complete: {len(df)} rows with {len(df.columns)} columns\n")
    print("Now import with:")
    print(f'  curl -X POST "http://localhost:8000/imports/findings/csv" \\')
    print(f'    -F "source=Brinqa" \\')
    print(f'    -F "file=@{output_path}"')
    print("\nOr use the UI Integrations page to upload the file.")
    
    return True


if __name__ == "__main__":
    input_file = "../data/bql_export.csv"
    output_file = "../data/bql_export_converted.csv"
    
    success = convert_brinqa_csv(input_file, output_file)
    sys.exit(0 if success else 1)
