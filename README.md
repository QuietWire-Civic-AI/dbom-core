# DBoM Core

Foundational spec, schemas, and minimal reference implementations for
**Distributed Bill of Materials** (DBoM): evidence-carrying provenance,
lifecycle attestations, and query interfaces.

## Scope
- Canonical terms & data model (spec/)
- JSON Schemas (schema/) with examples (examples/)
- Reference implementations (reference-impl/, cli/, server/)
- Interop bridges (SPDX, CSAF, OpenEOX, CLE)
- Test corpus (tests/) and conformance checks

## Design goals
- **Evidence-first**: every claim must cite source, time, method, uncertainty, reviewer
- **Format-agnostic interop** via adapters (SPDX, CycloneDX, CSAF, OpenEOX)
- **Query-ready**: align with Transparency/Attestation APIs (procurement & PLM)
- **Time-series** lifecycle: versioning, renames, EOL/EOS, support windows

## License
Apache-2.0 (see LICENSE)
