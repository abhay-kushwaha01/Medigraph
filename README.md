MediGraph AI 🏥

Personalized Medical Knowledge Graph Platform

MediGraph AI is a medical knowledge graph platform designed to connect and organize medical information in a structured, meaningful way. It brings together patients, medical conditions, allergies, medications, and ingredients to help users explore relationships within healthcare data.

The project aims to make complex medical information easier to understand through graph-based visualization and patient-specific analysis.

🚀 Project Overview

Medical information is often stored in separate records, making it difficult to understand how different conditions, allergies, and medications relate to one another.

MediGraph AI addresses this challenge by representing medical entities as nodes and their connections as relationships in a knowledge graph. This structure allows users to explore connected information and understand relationships across medical records.

The platform is designed as a prototype for educational, research, and demonstration purposes.

✨ Key Features

- Medical Knowledge Graph: Represents medical entities and their relationships in a connected graph.
- Patient Lookup: Designed to retrieve and explore patient-related information.
- Patient Analysis: Supports exploring relevant medical information associated with a patient.
- Condition Mapping: Connects patients with recorded medical conditions.
- Allergy Tracking: Represents allergy information and its relationship to patient records.
- Medication Mapping: Connects medication records with their ingredients.
- Data Import: Supports a structured workflow for validating and importing medical datasets where implemented.
- API Integration: Uses a backend API to connect the frontend with the database.
- Data Validation: Helps identify missing references and inconsistencies in the dataset.

🧠 How Neo4j Is Used

Neo4j is a graph database that stores information as nodes, relationships, and properties.

In MediGraph AI, the intended graph model includes entities such as:

- Patient — a patient record.
- Condition — a medical condition.
- Allergy — an allergy record.
- Medication — a medication record.
- Ingredient — an ingredient associated with a medication.
- Source — information about a data source.

Example relationships include:

- "HAS_CONDITION" — connects a patient to a recorded condition.
- "HAS_ALLERGY" — connects a patient to an allergy record.
- "TAKES" — connects a patient to a medication record.
- "CONTAINS" — connects a medication to an ingredient.

These connections make it possible to explore relationships that may be harder to understand when data is stored only in separate tables.

🏗️ Technology Stack

Component| Technology
Frontend| React and TypeScript, if used by the existing frontend
Backend| Python and FastAPI
Graph Database| Neo4j Aura
Data Format| CSV and JSON
Testing| Python testing tools

The final technology configuration depends on the implementation in the project repository.

📂 Project Structure

A typical project structure is:

MEDIGRAPH/
├── frontend/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── ingestion/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   └── tests/
└── data/
    └── medical_dataset/
        ├── patients.csv
        ├── conditions.csv
        ├── medications.csv
        ├── allergies.csv
        ├── patient_conditions.csv
        ├── patient_medications.csv
        ├── medication_ingredients.csv
        ├── medical_sources.csv
        ├── graph_import.json
        ├── validate_dataset.py
        ├── import_to_neo4j.py
        └── README.md

The actual structure may vary depending on the files present in the repository.

📊 Dataset

The project includes a synthetic demonstration dataset designed to test graph relationships and application workflows.

The dataset may include:
