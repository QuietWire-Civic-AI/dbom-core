# SCITT Adapter (DBoM → SCITT)

> Minimal adapter to mint **SCITT-style signed statements** and obtain a **transparency receipt** from a log, using an existing **DBoM attestation** as input.

## 0. TL;DR

* **Input:** your existing DBoM JSON attestation (event, artifact, etc.).
* **Output:**

  1. **Signed Statement** (`.scitt.json` or `.scitt.cose`)
  2. **Transparency Receipt** (proof the statement was logged)
  3. **Bundle** tying Statement ↔ Receipt ↔ Canon/CAP links

Run:

```bash
# create signed statement + submit to log + save receipt
scitt-adapter issue \
  --attestations ./attestations/att-2025-10-27-lf-sbom.json \
  --issuer-key ./keys/issuer.key \
  --log-url https://log.example.org \
  --out ./out/
```

---

## 1. Scope

* **Do:** Convert a DBoM attestation to a **SCITT Signed Statement** and obtain a **Receipt** from a transparency service (Rekor-like or CAP-backed log).
* **Don’t:** Replace DBoM, CAP, or Canon. This is a **plumbing shim** so your attestations travel in SCITT pipelines.

---

## 2. Architecture (minimal)

```
 DBoM Attestation (JSON)
           │
           ▼
   Canonicalize (JCS)
           │
           ▼
   Sign (JWS or COSE)
           │
           ▼
 Submit to Transparency Log  ──▶  Get Receipt (inclusion proof)
           │                                 │
           └───────────────┬─────────────────┘
                           ▼
                SCITT Bundle (statement + receipt + links)
```

* **Canonicalization:** JSON Canonicalization Scheme (JCS)
* **Signature:** JWS (ES256) or COSE_Sign1 (ES256)
* **Transparency:**

  * Option A: Rekor-compatible API (`/api/v1/log/entries`)
  * Option B: CAP-backed endpoint exposing an inclusion proof

---

## 3. Data Model

### 3.1 Input (DBoM Attestation)

Example (abridged):

```json
{
  "type": "event-attestation",
  "id": "att-2025-10-27-lf-sbom",
  "subject": "LF S-BOM Coffee Call presentation",
  "timestamp": "2025-10-27T14:00:00Z",
  "presenter": "Chris Blask",
  "materials": {
    "slides_sha256": "<SLIDES_SHA256>",
    "repos": ["dbom-core-main","sbom-attestation-demo"]
  },
  "links": {
    "canon": "Attestations/Events/2025-10-27_LF_SBOM_Talk.md",
    "cap": "evidence://EV-2025-XXX"
  }
}
```

### 3.2 SCITT Signed Statement (JWS form)

```json
{
  "payload": "<base64url(JCS(attestation JSON))>",
  "protected": {
    "alg": "ES256",
    "typ": "application/scitt+json",
    "kid": "did:key:z6Mkh...#keys-1"
  },
  "signature": "<base64url(sig)>"
}
```

*(COSE variant allowed by setting `--format cose`.)*

### 3.3 Transparency Receipt (example)

```json
{
  "log": {
    "uri": "https://log.example.org",
    "tree_id": "XYZ",
    "entry_id": "sha256:abcdef...",
    "integrated_time": "2025-10-27T14:01:12Z"
  },
  "proof": {
    "hash_alg": "sha256",
    "inclusion_path": ["...","..."],
    "root_hash": "deadbeef..."
  }
}
```

### 3.4 SCITT Bundle

```json
{
  "statement": { ...JWS or COSE... },
  "receipt": { ...inclusion proof... },
  "links": {
    "canon": "Attestations/Events/2025-10-27_LF_SBOM_Talk.md",
    "cap": "evidence://EV-2025-XXX",
    "dbom": "attestations/att-2025-10-27-lf-sbom.json"
  }
}
```

---

## 4. Mapping (DBoM → SCITT)

| DBoM field           | SCITT element                         |
| --------------------- | ------------------------------------- |
| `id`, `type`          | inside **payload** (signed content)   |
| `timestamp`           | payload + appears in **receipt.time** |
| `materials.*`         | payload                               |
| `links.canon` / `cap` | payload (verifiable pointers)         |
| Attestation hash      | **entry_id** / **proof.root_hash**    |
| Issuer identity       | **kid** (JWS) or COSE header          |

---

## 5. CLI

```bash
# 1) Generate keys (demo; use your HSM/PKI in prod)
scitt-adapter keygen --out ./keys

# 2) Issue: sign + submit + save artifacts
scitt-adapter issue \
  --attestations ./attestations/att.json \
  --issuer-key ./keys/issuer.key \
  --issuer-kid did:key:z6Mkh...#keys-1 \
  --log-url https://log.example.org \
  --format jws \
  --out ./out/

# 3) Verify: check signature + verify receipt
scitt-adapter verify \
  --bundle ./out/att.scitt.bundle.json \
  --log-url https://log.example.org \
  --issuer-pub ./keys/issuer.pub
```

Outputs:

```
./out/
  att.scitt.statement.jws.json
  att.scitt.receipt.json
  att.scitt.bundle.json
```

---

## 6. API Targets

* **Rekor-like (suggested)**

  * `POST /api/v1/log/entries` → returns UUID + inclusion proof
  * `GET /api/v1/log/entries/{uuid}`
* **CAP gateway (optional)**

  * `POST /attestations` → stores evidence + forwards to log
  * `GET /attestations/{id}/receipt`

Configure with:

```bash
export SCITT_LOG_URL=https://log.example.org
export SCITT_CAP_URL=http://localhost:4000
```

---

## 7. Security & Keys

* Default: **ES256** (P-256) JWS or COSE.
* **Key storage:** prefer HSM or OS keychain; for demo, PEM files in `./keys`.
* **Canonicalization:** JCS *before* signing; never sign “pretty-printed” JSON.
* **Clock:** ensure NTP synced; receipts include integration time.
* **Trust roots:** pin log public key / root hash when verifying.

---

## 8. Validation & Tests

```bash
# unit tests: canonicalization, signature, receipt parse
npm test            # or: pytest / go test, depending on your stack
# end-to-end against a test log
scitt-adapter e2e --log-url https://rekor.tlog.dev --demo
```

Verification steps:

1. Recompute payload hash from JCS JSON.
2. Verify JWS/COSE signature with `kid` lookup.
3. Validate inclusion proof → root hash from log checkpoint.
4. Cross-check timestamps with CAP evidence entry.

---

## 9. Integration Notes

* **DBoM node:** keep producing your current JSON; the adapter **wraps** it.
* **Canon:** link the emitted `*.bundle.json` in the event page.
* **CAP:** store statement + receipt under the evidence record.

Wire-Lite to trigger a run:

```
[WIRE-LITE]
From: @Chris
To: @Ashraf
Intent: ASK
Subject: SCITT shim for LF talk
Context: Wrap att-2025-10-27-lf-sbom.json as a SCITT statement and log it.
Question: Run scitt-adapter issue and PR the bundle link into Canon?
When: EOW
Privacy: TEAM
```

---

## 10. Roadmap

* [ ] Rekor API autodetect + CAP fallback
* [ ] COSE default with detached payload option
* [ ] Multiple logs / witness cosigning
* [ ] GitHub Action to mint receipts on commit

---

## 11. License

Apache-2.0 (to align with LF and broader ecosystem).
