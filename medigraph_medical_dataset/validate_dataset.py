import csv
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
FILES = {
    "patients.csv": ("patient_id",),
    "conditions.csv": ("condition_id",),
    "medications.csv": ("medication_id",),
    "allergies.csv": ("allergy_id",),
}

def rows(name):
    with (BASE / name).open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def main():
    errors = []
    patients = rows("patients.csv")
    conditions = rows("conditions.csv")
    meds = rows("medications.csv")
    allergies = rows("allergies.csv")
    patient_ids = {r["patient_id"] for r in patients}
    condition_ids = {r["condition_id"] for r in conditions}
    med_ids = {r["medication_id"] for r in meds}
    allergy_ids = [r["allergy_id"] for r in allergies]

    for filename, key in FILES.items():
        ids = [r[key[0]] for r in rows(filename)]
        if len(ids) != len(set(ids)):
            errors.append(f"{filename}: duplicate {key[0]} values")

    for r in rows("patient_conditions.csv"):
        if r["patient_id"] not in patient_ids: errors.append(f"patient_conditions.csv: missing patient {r['patient_id']}")
        if r["condition_id"] not in condition_ids: errors.append(f"patient_conditions.csv: missing condition {r['condition_id']}")
    for r in rows("patient_medications.csv"):
        if r["patient_id"] not in patient_ids: errors.append(f"patient_medications.csv: missing patient {r['patient_id']}")
        if r["medication_id"] not in med_ids: errors.append(f"patient_medications.csv: missing medication {r['medication_id']}")
    for r in allergies:
        if r["patient_id"] not in patient_ids: errors.append(f"allergies.csv: missing patient {r['patient_id']}")

    graph = json.loads((BASE / "graph_import.json").read_text(encoding="utf-8"))
    node_ids = {n["id"] for n in graph["nodes"]}
    for rel in graph["relationships"]:
        if rel["source"] not in node_ids: errors.append(f"graph_import.json: missing source node {rel['source']}")
        if rel["target"] not in node_ids: errors.append(f"graph_import.json: missing target node {rel['target']}")

    if errors:
        print("VALIDATION FAILED")
        print("\n".join(f"- {e}" for e in errors))
        raise SystemExit(1)
    print(f"VALIDATION PASSED: {len(graph['nodes'])} nodes, {len(graph['relationships'])} relationships")
    print("Synthetic demo data only; not for clinical use.")

if __name__ == "__main__":
    main()
