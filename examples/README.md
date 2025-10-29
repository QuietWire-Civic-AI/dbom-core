# DBoM ↔ SCITT Examples

Minimal, runnable shims that show how an existing **DBoM attestation** can be wrapped as a **SCITT-style signed statement** and (optionally) logged to get a transparency **receipt**.

```
examples/
├── SCITT_Adapter.md        # Concept, mapping, CLI
├── scitt_adapter.py        # DBoM → JWS(ES256) + optional receipt
├── verify.py               # Tiny signature checker for demo bundles
└── minimal.json            # Example DBoM attestation body
```

## Quick start

```bash
# 0) deps
python3 -m pip install cryptography requests

# 1) demo keys (P-256) — use HSM/PKI in production
openssl ecparam -genkey -name prime256v1 -noout -out keys/issuer.key
openssl ec -in keys/issuer.key -pubout -out keys/issuer.pub

# 2) issue a SCITT-style statement (offline receipt if --log-url omitted)
python3 examples/scitt_adapter.py \
  --attestation examples/minimal.json \
  --issuer-key keys/issuer.key \
  --issuer-kid did:key:zDemo#keys-1 \
  --canon-link Attestations/Events/2025-10-27_LF_SBOM_Talk.md \
  --cap-link evidence://EV-2025-XXX \
  --dbom-link examples/minimal.json \
  --out out/

# 3) verify signature on the emitted bundle
python3 examples/verify.py out/minimal.bundle.json keys/issuer.pub
```

### Files emitted (under `out/`)

* `*.statement.jws.json` — protected header, base64url-payload (JCS), ES256 signature
* `*.receipt.json` — transparency log receipt (offline demo or real Rekor-like proof)
* `*.bundle.json` — `{ statement, receipt, links }` ready to publish/link in Canon & CAP

### Notes

* **Canonicalization:** The adapter uses a minimal JCS (sorted keys, tight separators).
* **Receipts:** For a real inclusion proof, point `--log-url` at a Rekor-compatible endpoint.
* **Interop:** This demo keeps JWS simple; switching to COSE/DSSE is straightforward.
