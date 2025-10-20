# DBoM Core Spec (v0)

## 1. Purpose
Evidence-carrying provenance and lifecycle for digital components and composed products.

## 2. Concepts
- **Entity**: person/org/automation with identity
- **Artifact**: thing with digestible identity (hash, purl, sbom id)
- **Claim**: statement about an artifact or relation
- **Evidence**: data supporting a claim (source, time, method, uncertainty, reviewer)
- **Attestation**: a signed bundle of claims/evidence
- **Event**: time-series change (release, rename, EOL/EOS, vuln, fix, support window)

## 3. Object Model
- Identity & identifiers (URIs, purl, digest, key ids)
- Versioning & time (valid_from/valid_to, event_id)
- Links (derives_from, contains, supersedes, same_as)
- Policy labels (Observed | Measured | Reported | Inferred, confidence 0–1)

## 4. Serialization
JSON (canonical), with JSON Schema in /schema.
YAML allowed for humans; must round-trip to JSON.

## 5. Signatures
Detached (DSSE/COSE/JWS). Canonical payload = normalized JSON.

## 6. Interop
Mappings for SPDX/CycloneDX/CSAF/OpenEOX + alignment w/ CLE time-series.

## 7. API Hints (non-normative)
Query by artifact, component tree, support status, EOL/EOS, rename history.

## 8. Conformance
- Must validate against schema.
- Must provide provenance fields in §2.
- Reference test corpus in /examples and gates in CI.

(Work-in-progress — iterate by PRs.)
