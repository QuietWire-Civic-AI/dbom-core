# Why DBoM Exists

> **DBoM Core** turns software metadata into *verifiable truth*. It bridges inventory and attestation — so that provenance, evidence, and accountability move as fast as code itself.

Most formats (SPDX, CycloneDX, CSAF) describe **what** software is.
DBoM describes **how truth travels** about that software.

Each DBoM document is:

* **An attestation**, not a manifest — signed evidence that someone claims something true.
* **Cross-format** — accepts SPDX, CycloneDX, or anything structured, but normalizes it to one truth schema.
* **Cross-channel** — the same attestation can flow via APIs, registries, blockchains, or secure mail.
* **Self-verifiable** — all attestations can validate each other by schema and signature.

When you run:

```bash
curl -s -X POST http://localhost:8787/validate -d @examples/minimal.json
```

you’re not just checking JSON — you’re verifying that the *claim*, its *source*, and its *evidence* align.

When you run:

```bash
curl -s -X POST http://localhost:8787/convert/spdx -d @examples/spdx23.json
```

you’re seeing a traditional SBOM **transformed into an attestation** — a signed, evidence-carrying statement ready for procurement, certification, or handoff.

DBoM = **Software Provenance, Not Just Inventory.**

---

### DBoM Attestation Flow

```
 ┌──────────────┐      ┌──────────────┐
 │ SPDX / CDX / │      │ CSAF / EOX  │
 │ Other Input  │      │ Feeds       │
 └──────┬───────┘      └──────┬──────┘
        │                     │
        ▼                     ▼
       ┌──────────────────────────┐
       │ DBoM Transparency API   │
       │  - validate()           │
       │  - convert()            │
       │  - query()              │
       └──────────┬──────────────┘
                  │
        ┌─────────▼─────────┐
        │  Attestation JSON │
        │  + provenance     │
        │  + evidence       │
        └─────────┬─────────┘
                  │
       ┌──────────▼───────────┐
       │  Federation / Canon  │
       │  - cross-validation  │
       │  - signed lineage    │
       └──────────────────────┘
```

---

### Core Idea

DBoM Core turns every SBOM or report into an **attestable unit of trust**. It’s designed for:

* **Cross-validation** between parties
* **Cross-format** integration
* **Cross-governance** verification

In short: every artifact can now carry its own evidence — and speak for itself.

---

### Beyond Software

Although DBoM began in the world of information technology supply chains, its scope was never limited to computer hardware and code.

DBoM is a **universal attestation framework** — a way to express, verify, and share *truthful claims about anything that changes state*.

A DBoM record could describe:
- a **server** being assembled, tested, shipped, or decommissioned,  
- a **container of goods** with verified carbon offsets,  
- a **medical device** receiving firmware and safety certification,  
- or a **policy attestation** signed by an institution or government actor.

The software example matters because it’s the *clearest demonstration* — code already has digests, builds, and automation pipelines.  
But the architecture is intentionally **format-agnostic and domain-neutral**.

What DBoM provides is an *attestation ecosystem* — a shared grammar for evidence, provenance, and accountability across communities.

In short:
> DBoM is not about software.  
> It’s about **verifiable trust in motion**.

