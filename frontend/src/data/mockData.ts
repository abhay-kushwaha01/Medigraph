/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PatientRequest,
  PatientAnalysisResponse,
  GraphResponse,
  PatientProfile,
} from '../types/api';

/**
 * EXPLICIT SAMPLE / REFERENCE DATA
 * This file contains offline illustrative test fixtures strictly separated from real API traffic.
 * Real API failures NEVER fall back to this data silently.
 */

export const SAMPLE_PATIENT_REQUESTS: PatientRequest[] = [
  {
    patientId: 'P001',
    ageGroup: '30-40',
    conditions: ['Asthma', 'Hypertension'],
    allergies: ['Amoxicillin', 'Peanuts'],
    currentMedications: ['Albuterol', 'Lisinopril'],
  },
  {
    patientId: 'P002',
    ageGroup: '65-75',
    conditions: ['Type 2 Diabetes', 'Atrial Fibrillation', 'Chronic Kidney Disease'],
    allergies: ['Sulfa Drugs', 'Iodinated Contrast'],
    currentMedications: ['Metformin', 'Warfarin', 'Amiodarone'],
  },
  {
    patientId: 'P003',
    ageGroup: '50-60',
    conditions: ['Rheumatoid Arthritis', 'GERD'],
    allergies: ['NSAIDs (Aspirin, Ibuprofen)'],
    currentMedications: ['Methotrexate', 'Omeprazole', 'Prednisone'],
  },
];

export const SAMPLE_GRAPH_DATA: GraphResponse = {
  graphNodes: [
    {
      id: 'N-ALB',
      label: 'Medication',
      title: 'Albuterol',
      properties: { drugClass: 'Beta-2 Agonist', route: 'Inhalation', atcCode: 'R03AC02' },
    },
    {
      id: 'N-LIS',
      label: 'Medication',
      title: 'Lisinopril',
      properties: { drugClass: 'ACE Inhibitor', target: 'ACE', atcCode: 'C09AA03' },
    },
    {
      id: 'N-AST',
      label: 'Condition',
      title: 'Asthma',
      properties: { icd10: 'J45', chronic: true, system: 'Respiratory' },
    },
    {
      id: 'N-HYP',
      label: 'Condition',
      title: 'Hypertension',
      properties: { icd10: 'I10', chronic: true, system: 'Cardiovascular' },
    },
    {
      id: 'N-AMOX',
      label: 'Allergy',
      title: 'Amoxicillin',
      properties: { allergyClass: 'Penicillin-class beta-lactam', severityGroup: 'IgE-mediated' },
    },
    {
      id: 'N-WAR',
      label: 'Medication',
      title: 'Warfarin',
      properties: { drugClass: 'Vitamin K Antagonist', riskIndex: 'Narrow Therapeutic' },
    },
    {
      id: 'N-AMIO',
      label: 'Medication',
      title: 'Amiodarone',
      properties: { drugClass: 'Antiarrhythmic Class III', cypInhibitor: 'CYP2C9' },
    },
    {
      id: 'N-CKD',
      label: 'Condition',
      title: 'Chronic Kidney Disease',
      properties: { icd10: 'N18', stage: 'Stage 3b' },
    },
  ],
  graphRelationships: [
    {
      id: 'R-ALB-AST',
      type: 'TREATS',
      source: 'N-ALB',
      target: 'N-AST',
      properties: { indicationStrength: 'First-Line Rescue', evidenceLevel: 'Level A' },
    },
    {
      id: 'R-LIS-HYP',
      type: 'TREATS',
      source: 'N-LIS',
      target: 'N-HYP',
      properties: { guideline: 'AHA/ACC 2024 Guidelines', primaryRegimen: true },
    },
    {
      id: 'R-LIS-AST',
      type: 'POTENTIAL_ADVERSE_EFFECT',
      source: 'N-LIS',
      target: 'N-AST',
      properties: { mechanism: 'Bradykinin accumulation bronchial hypersensitivity / cough' },
    },
    {
      id: 'R-WAR-AMIO',
      type: 'INTERACTS_WITH',
      source: 'N-AMIO',
      target: 'N-WAR',
      properties: { severity: 'Major', consequence: 'Increased INR and bleeding risk via CYP2C9 inhibition' },
    },
    {
      id: 'R-MET-CKD',
      type: 'CONTRAINDICATED_WITH',
      source: 'N-CKD',
      target: 'N-WAR',
      properties: { reason: 'Renal clearance monitoring required' },
    },
  ],
};

export const SAMPLE_ANALYSIS_RESPONSES: Record<string, PatientAnalysisResponse> = {
  P001: {
    patientId: 'P001',
    findings: [
      {
        id: 'F-001',
        title: 'ACE-Inhibitor induced bronchospasm risk with concurrent Asthma',
        description: 'Lisinopril causes accumulation of bradykinin and substance P in airway tissue, which can aggravate bronchial hyperreactivity and provoke severe refractory cough in asthmatic patients.',
        severity: 'moderate',
        evidenceStatus: 'established',
        sourceIds: ['SRC-01', 'SRC-02'],
        properties: { recommendation: 'Consider switching from ACE inhibitor to Angiotensin II Receptor Blocker (ARB) such as Losartan.' },
      },
      {
        id: 'F-002',
        title: 'Documented Beta-Lactam allergy cross-reactivity surveillance',
        description: 'Amoxicillin allergy noted. Cephalosporin and carbapenem prescriptions require screening for shared R1 side-chain cross-reactivity.',
        severity: 'high',
        evidenceStatus: 'established',
        sourceIds: ['SRC-03'],
        properties: { allergyGroup: 'Penicillin-class beta-lactam' },
      },
      {
        id: 'F-003',
        title: 'Potassium monitoring indicated for Lisinopril',
        description: 'Concomitant renal and cardiac evaluation recommended during acute asthma flares where systemic corticosteroids may alter electrolyte balance.',
        severity: 'low',
        evidenceStatus: 'emerging',
        sourceIds: ['SRC-02'],
      },
    ],
    graphNodes: [
      { id: 'N-ALB', label: 'Medication', title: 'Albuterol', properties: { drugClass: 'Beta-2 Agonist' } },
      { id: 'N-LIS', label: 'Medication', title: 'Lisinopril', properties: { drugClass: 'ACE Inhibitor' } },
      { id: 'N-AST', label: 'Condition', title: 'Asthma', properties: { icd10: 'J45' } },
      { id: 'N-HYP', label: 'Condition', title: 'Hypertension', properties: { icd10: 'I10' } },
      { id: 'N-AMOX', label: 'Allergy', title: 'Amoxicillin', properties: { type: 'IgE' } },
    ],
    graphRelationships: [
      { id: 'R1', type: 'TREATS', source: 'N-ALB', target: 'N-AST' },
      { id: 'R2', type: 'TREATS', source: 'N-LIS', target: 'N-HYP' },
      { id: 'R3', type: 'ADVERSE_INTERACTION', source: 'N-LIS', target: 'N-AST', properties: { pathway: 'Bradykinin' } },
    ],
    sources: [
      {
        id: 'SRC-01',
        title: 'Global Initiative for Asthma (GINA) 2024 Strategy Report',
        publisher: 'GINA Medical Executive Committee',
        url: 'https://ginasthma.org/reports/',
        evidenceStatus: 'established',
      },
      {
        id: 'SRC-02',
        title: 'AHA/ACC Clinical Practice Guideline for the Prevention and Management of High Blood Pressure',
        publisher: 'American Heart Association & American College of Cardiology',
        url: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065',
        evidenceStatus: 'established',
      },
      {
        id: 'SRC-03',
        title: 'Penicillin Allergy: Clinical Evaluation, Cross-Reactivity, and Management',
        publisher: 'The New England Journal of Medicine',
        url: 'https://www.nejm.org/doi/full/10.1056/NEJMra1807761',
        evidenceStatus: 'established',
      },
    ],
    limitations: [
      'Knowledge graph analysis relies on reported medications; over-the-counter supplements and homeopathic agents were not evaluated.',
      'Genetic pharmacogenomic polymorphisms (e.g. CYP enzyme phenotypes) are unsequenced for this patient.',
      'Clinical decisions must be validated by an authorized healthcare professional.',
    ],
  },
};

export const SAMPLE_PATIENT_PROFILES: Record<string, PatientProfile> = {
  P001: {
    patientId: 'P001',
    ageGroup: '30-40',
    conditions: ['Asthma', 'Hypertension'],
    allergies: ['Amoxicillin', 'Peanuts'],
    currentMedications: ['Albuterol', 'Lisinopril'],
    properties: { bloodPressure: '138/86 mmHg', lastVisit: '2026-08-14' },
  },
  P002: {
    patientId: 'P002',
    ageGroup: '65-75',
    conditions: ['Type 2 Diabetes', 'Atrial Fibrillation', 'Chronic Kidney Disease'],
    allergies: ['Sulfa Drugs', 'Iodinated Contrast'],
    currentMedications: ['Metformin', 'Warfarin', 'Amiodarone'],
    properties: { eGFR: '42 mL/min/1.73m2', inrTarget: '2.0-3.0' },
  },
  P003: {
    patientId: 'P003',
    ageGroup: '50-60',
    conditions: ['Rheumatoid Arthritis', 'GERD'],
    allergies: ['NSAIDs (Aspirin, Ibuprofen)'],
    currentMedications: ['Methotrexate', 'Omeprazole', 'Prednisone'],
    properties: { lftStatus: 'Normal', boneDensity: 'T-score -1.8' },
  },
};
