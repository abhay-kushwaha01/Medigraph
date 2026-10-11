"""Import the included synthetic demo graph into Neo4j Aura using MERGE."""
import json
import os
from pathlib import Path
from neo4j import GraphDatabase

BASE = Path(__file__).resolve().parent
ALLOWED_LABELS = {"Patient", "Condition", "Medication", "Ingredient", "Allergy", "Source"}
ALLOWED_RELATIONSHIPS = {"HAS_CONDITION", "TAKES", "CONTAINS", "HAS_ALLERGY", "SUPPORTED_BY"}

def main():
    uri = os.getenv("NEO4J_URI")
    username = os.getenv("NEO4J_USERNAME")
    password = os.getenv("NEO4J_PASSWORD")
    database = os.getenv("NEO4J_DATABASE", "neo4j")
    if not all([uri, username, password]):
        raise SystemExit("Missing NEO4J_URI, NEO4J_USERNAME, or NEO4J_PASSWORD environment variables. Set them in your backend .env; do not commit or share secrets.")

    payload = json.loads((BASE / "graph_import.json").read_text(encoding="utf-8"))
    with GraphDatabase.driver(uri, auth=(username, password)) as driver:
        driver.verify_connectivity()
        with driver.session(database=database) as session:
            for node in payload["nodes"]:
                label = node["type"]
                if label not in ALLOWED_LABELS:
                    raise ValueError(f"Unsupported node label: {label}")
                session.run(
                    f"MERGE (n:{label} {{id: $id}}) SET n.name = $name, n.label = $label, n += $properties",
                    id=node["id"], name=node["label"], label=node["label"], properties=node.get("properties", {})
                ).consume()

            for rel in payload["relationships"]:
                rel_type = rel["label"]
                if rel_type not in ALLOWED_RELATIONSHIPS:
                    raise ValueError(f"Unsupported relationship type: {rel_type}")
                session.run(
                    "MATCH (s {id: $source}), (t {id: $target}) "
                    f"MERGE (s)-[r:{rel_type} {{id: $id}}]->(t) SET r += $properties",
                    source=rel["source"], target=rel["target"], id=rel["id"], properties=rel.get("properties", {})
                ).consume()
            counts = session.run(
                "MATCH (n) WHERE n.id IN $ids RETURN count(n) AS nodeCount",
                ids=[n["id"] for n in payload["nodes"]]
            ).single()
            print(f"Import completed. Matched dataset nodes: {counts['nodeCount']}.")
            print("Only synthetic demo data was imported. Review the database to verify relationships.")

if __name__ == "__main__":
    main()
