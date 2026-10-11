"""
FHIR R4 JSON parser.

Parses common FHIR resources (Patient, Condition, MedicationRequest,
AllergyIntolerance) into the MediGraph node format.

This is a best-effort implementation covering common fields.
Full FHIR compliance requires a dedicated FHIR library such as fhirclient.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# Map FHIR resourceType → MediGraph node type
FHIR_TYPE_MAP: Dict[str, str] = {
    "Patient": "Patient",
    "Condition": "Condition",
    "MedicationRequest": "Medicine",
    "AllergyIntolerance": "Allergy",
    "Encounter": "Encounter",
    "Observation": "Observation",
    "Organization": "Organization",
}


def parse_fhir_resource(resource: Dict[str, Any]) -> Dict[str, Any] | None:
    """
    Map a single FHIR resource dict to a MediGraph node dict.
    Returns None for unsupported resource types.
    """
    rtype = resource.get("resourceType")
    if rtype not in FHIR_TYPE_MAP:
        logger.debug("Unsupported FHIR resourceType: %s", rtype)
        return None

    node_type = FHIR_TYPE_MAP[rtype]
    parsers = {
        "Patient": _parse_patient,
        "Condition": _parse_condition,
        "Medicine": _parse_medication_request,
        "Allergy": _parse_allergy,
        "Encounter": _parse_encounter,
        "Observation": _parse_observation,
        "Organization": _parse_organization,
    }
    parser = parsers.get(node_type)
    if parser is None:
        return None
    result = parser(resource)
    if result:
        result["_nodeType"] = node_type
        result["_fhirResourceType"] = rtype
    return result


def parse_fhir_bundle(bundle: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parse a FHIR Bundle and return a list of MediGraph node dicts."""
    if bundle.get("resourceType") != "Bundle":
        raise ValueError("Input is not a FHIR Bundle.")
    nodes = []
    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})
        node = parse_fhir_resource(resource)
        if node:
            nodes.append(node)
    return nodes


# ---------------------------------------------------------------------------
# Resource-specific parsers
# ---------------------------------------------------------------------------

def _parse_patient(r: Dict[str, Any]) -> Dict[str, Any]:
    name = ""
    names = r.get("name", [])
    if names:
        n = names[0]
        given = " ".join(n.get("given", []))
        family = n.get("family", "")
        name = f"{given} {family}".strip()

    return {
        "patientId": r.get("id", ""),
        "name": name,
        "gender": r.get("gender"),
        "birthDate": r.get("birthDate"),
        "active": r.get("active"),
    }


def _parse_condition(r: Dict[str, Any]) -> Dict[str, Any]:
    coding = _first_coding(r.get("code", {}))
    return {
        "code": coding.get("code", r.get("id", "")),
        "name": coding.get("display", ""),
        "system": coding.get("system"),
        "clinicalStatus": _first_coding(r.get("clinicalStatus", {})).get("code"),
        "patientRef": _ref_id(r.get("subject", {})),
    }


def _parse_medication_request(r: Dict[str, Any]) -> Dict[str, Any]:
    med = r.get("medicationCodeableConcept", {})
    coding = _first_coding(med)
    return {
        "code": coding.get("code", r.get("id", "")),
        "name": coding.get("display", ""),
        "system": coding.get("system"),
        "status": r.get("status"),
        "patientRef": _ref_id(r.get("subject", {})),
    }


def _parse_allergy(r: Dict[str, Any]) -> Dict[str, Any]:
    coding = _first_coding(r.get("code", {}))
    return {
        "allergyId": r.get("id", ""),
        "name": coding.get("display", ""),
        "code": coding.get("code"),
        "system": coding.get("system"),
        "clinicalStatus": _first_coding(r.get("clinicalStatus", {})).get("code"),
        "patientRef": _ref_id(r.get("patient", {})),
    }


def _parse_encounter(r: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "encounterId": r.get("id", ""),
        "status": r.get("status"),
        "patientRef": _ref_id(r.get("subject", {})),
        "periodStart": r.get("period", {}).get("start"),
        "periodEnd": r.get("period", {}).get("end"),
    }


def _parse_observation(r: Dict[str, Any]) -> Dict[str, Any]:
    coding = _first_coding(r.get("code", {}))
    val = r.get("valueQuantity", {})
    return {
        "observationId": r.get("id", ""),
        "code": coding.get("code"),
        "name": coding.get("display", ""),
        "value": val.get("value"),
        "unit": val.get("unit"),
        "patientRef": _ref_id(r.get("subject", {})),
    }


def _parse_organization(r: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "organizationId": r.get("id", ""),
        "name": r.get("name", ""),
        "active": r.get("active"),
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _first_coding(codeable: Dict[str, Any]) -> Dict[str, Any]:
    codings = codeable.get("coding", [])
    if codings:
        return codings[0]
    return {"code": codeable.get("text", ""), "display": codeable.get("text", "")}


def _ref_id(ref: Dict[str, Any]) -> str | None:
    reference = ref.get("reference", "")
    if "/" in reference:
        return reference.split("/")[-1]
    return reference or None
