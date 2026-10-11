# MediGraph AI — Synthetic Medical Demo Dataset

## Important
All patient records and patient-to-condition/medication associations in this package are fictional and are for software demonstrations/testing only. They are not real patient data, prescriptions, diagnoses, or clinical recommendations. Do not use this dataset for clinical decisions.

Medication names are examples only. No interaction, contraindication, dose, treatment, or patient-specific clinical conclusion is asserted here. `medical_sources.csv` contains internal dataset metadata, not a verified clinical reference.

## Files
- `patients.csv`: synthetic patient IDs and age groups.
- `conditions.csv`: reference condition labels; not diagnoses.
- `medications.csv`: example generic medication labels; not prescriptions.
- `allergies.csv`: synthetic allergy records. “Not recorded” is not the same as “no allergy.”
- `patient_conditions.csv`: synthetic patient-condition links.
- `patient_medications.csv`: synthetic patient-medication links.
- `medication_ingredients.csv`: medication-to-ingredient links for demo purposes.
- `medical_sources.csv`: dataset metadata; no external clinical evidence is claimed.
- `graph_import.json`: combined graph payload.

## Expected graph model
Nodes: `Patient`, `Condition`, `Medication`, `Ingredient`, `Allergy`, `Source`.
Relationships: `HAS_CONDITION`, `TAKES`, `CONTAINS`, `HAS_ALLERGY`.

## Validate the dataset
From this folder, run:
```bash
python validate_dataset.py
```

## Import to Neo4j Aura
1. Configure `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and optionally `NEO4J_DATABASE` in your backend `.env` file.
2. Install the official driver in the backend environment:
   `pip install neo4j python-dotenv`
3. Copy `import_to_neo4j.py` into your backend folder or run it from this dataset folder after setting environment variables.
4. Run:
   `python import_to_neo4j.py`
5. The importer uses `MERGE` and will not intentionally delete existing graph data. Review your database and test in a development instance first.

This importer creates labels and relationship types from a fixed allowlist. It imports only the included synthetic demo data.
