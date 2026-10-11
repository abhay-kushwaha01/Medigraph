- Synthetic patient records.
- Medical condition labels.
- Example medication records.
- Allergy records.
- Patient-condition relationships.
- Patient-medication relationships.
- Medication-ingredient relationships.
- Dataset metadata.

All synthetic records are intended for software development and testing. They do not represent real patients or verified patient-specific clinical findings.

⚙️ Getting Started

1. Clone the Repository

git clone YOUR_GITHUB_REPOSITORY_URL
cd MEDIGRAPH

Replace "YOUR_GITHUB_REPOSITORY_URL" with the actual repository URL.

2. Configure the Backend

Open the backend directory and install the dependencies listed in its requirements file.

cd backend
pip install -r requirements.txt

The exact requirements filename should match the file in the repository.

3. Configure Neo4j Aura

Create a local ".env" file in the backend directory and configure the required database variables:

NEO4J_URI=your_neo4j_connection_uri
NEO4J_USERNAME=your_neo4j_username
NEO4J_PASSWORD=your_neo4j_password
NEO4J_DATABASE=neo4j

Use the actual values provided by your Neo4j Aura instance. Never commit real credentials to GitHub.

4. Start the Backend

From the backend directory, run:

uvicorn app.main:app --reload

If the application uses a different Python module path, adjust the command to match the implementation.

When the server starts successfully, the API documentation is typically available at:

http://127.0.0.1:8000/docs

5. Run the Frontend

Open a separate terminal, navigate to the frontend directory, install the dependencies, and start the development server using the scripts defined in "package.json".

For example:

cd frontend
npm install
npm run dev

The actual commands depend on the frontend framework and configuration.

6. Validate the Dataset

Run the dataset validation script before importing the records into Neo4j. Confirm the file path and Python environment first.

7. Import the Dataset

Configure the Neo4j credentials locally, then use the project's import script if it has been tested and configured for the existing database schema. Verify the imported nodes and relationships in Neo4j Aura.

🔐 Security and Privacy

- Never upload ".env" files or database passwords to GitHub.
- Keep database credentials on the backend.
- Do not connect the frontend directly to Neo4j using database credentials.
- Use synthetic records for public demonstrations.
- Protect real patient information and follow applicable privacy requirements.
- Validate uploaded files before importing them.

⚠️ Medical Disclaimer

MediGraph AI is an educational and demonstration prototype. It is not a medical device and does not replace qualified healthcare professionals.

The presence of a relationship in a graph does not automatically establish a clinical conclusion. Medical findings and medication interactions must be supported by reliable clinical evidence and appropriate review.

Do not use synthetic demonstration data to make real healthcare decisions.

🔮 Future Improvements

- Expand validated medical knowledge sources.
- Improve graph exploration and filtering.
- Add stronger dataset validation and import reports.
- Improve evidence traceability for medical relationships.
- Add authentication and access controls where needed.
- Expand automated tests and integration monitoring.
- Improve error handling and deployment documentation.

👨‍💻 Project Purpose

MediGraph AI explores how graph databases can organize connected medical information and make relationships easier to navigate. The project combines a frontend interface, a backend API, and a graph-based data model to demonstrate a possible approach to medical knowledge exploration.

---

MediGraph AI — Connecting Medical Knowledge Through Graphs.
