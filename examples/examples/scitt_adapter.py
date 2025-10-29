#!/usr/bin/env python3
# scitt_adapter.py
# Minimal DBoM → SCITT shim: JWS(ES256) + optional Rekor-like receipt.

import argparse, base64, json, time, hashlib, sys
from pathlib import Path

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import (
    encode_dss_signature, decode_dss_signature
)
from cryptography.hazmat.backends import default_backend

# -------- helpers --------

def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')

def b64u_dec(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)

def jcs(obj: dict) -> bytes:
    """
    JSON Canonicalization (minimal): UTF-8, sorted keys, no spaces.
    NOTE: For production JCS, use a dedicated implementation.
    """
    return json.dumps(obj, sort_keys=True, separators=(',', ':')).encode('utf-8')

def load_privkey(pem_path: Path):
    with open(pem_path, 'rb') as f:
        return serialization.load_pem_private_key(f.read(), password=None, backend=default_backend())

def pubkey_from_priv(priv):
    return priv.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo
    )

def es256_sign(priv, data: bytes) -> bytes:
    der = priv.sign(data, ec.ECDSA(hashes.SHA256()))
    # Convert DER -> raw (r||s) then to JOSE signature (base64url of r||s)
    r, s = decode_dss_signature(der)
    size = 32
    return int.to_bytes(r, size, 'big') + int.to_bytes(s, size, 'big')

def es256_verify(pub_pem: bytes, data: bytes, sig_raw: bytes) -> bool:
    from cryptography.hazmat.primitives import serialization
    pub = serialization.load_pem_public_key(pub_pem, backend=default_backend())
    r = int.from_bytes(sig_raw[:32], 'big')
    s = int.from_bytes(sig_raw[32:], 'big')
    der = encode_dss_signature(r, s)
    try:
        pub.verify(der, data, ec.ECDSA(hashes.SHA256()))
        return True
    except Exception:
        return False

# -------- SCITT-ish JWS statement --------

def make_statement(attestation: dict, kid: str, privkey_pem: Path) -> dict:
    priv = load_privkey(privkey_pem)
    payload = jcs(attestation)
    protected = {"alg":"ES256","typ":"application/scitt+json","kid":kid}
    signing_input = b'.'.join([
        b64u(json.dumps(protected, separators=(',',':')).encode('utf-8')).encode('ascii'),
        b64u(payload).encode('ascii')
    ])
    sig = es256_sign(priv, signing_input)
    statement = {
        "protected": protected,
        "payload": b64u(payload),
        "signature": b64u(sig),
    }
    return statement

# -------- Transparency log (Rekor-like) --------

def submit_to_log(log_url: str, statement: dict) -> dict:
    """
    Minimal example: POST statement, expect a JSON receipt back.
    Adjust fields to your log’s API (e.g., Rekor’s Entry API).
    """
    if not log_url:
        # offline mode: synthesize a “receipt” using a content hash
        root = hashlib.sha256(json.dumps(statement, sort_keys=True).encode()).hexdigest()
        return {
            "log": {"uri":"offline://demo","tree_id":"demo","entry_id":f"sha256:{root}","integrated_time":time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())},
            "proof": {"hash_alg":"sha256","inclusion_path":[],"root_hash":root}
        }

    resp = requests.post(f"{log_url}/api/v1/log/entries", json=statement, timeout=30)
    resp.raise_for_status()
    return resp.json()  # adapt to actual API shape

# -------- Bundle I/O --------

def write_outputs(outdir: Path, base: str, statement: dict, receipt: dict, links: dict):
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / f"{base}.statement.jws.json").write_text(json.dumps(statement, indent=2))
    (outdir / f"{base}.receipt.json").write_text(json.dumps(receipt, indent=2))
    bundle = {"statement":statement, "receipt":receipt, "links":links}
    (outdir / f"{base}.bundle.json").write_text(json.dumps(bundle, indent=2))
    return bundle

# -------- CLI --------

def main():
    ap = argparse.ArgumentParser(description="Minimal DBoM → SCITT adapter")
    ap.add_argument("--attestation", required=True, help="Path to DBoM attestation JSON")
    ap.add_argument("--issuer-key", required=True, help="PEM EC private key (P-256)")
    ap.add_argument("--issuer-kid", required=True, help="Key ID (e.g., did:key … #keys-1)")
    ap.add_argument("--log-url", default="", help="Transparency log base URL (blank = offline receipt)")
    ap.add_argument("--canon-link", default="", help="Canon link to cite in bundle")
    ap.add_argument("--cap-link", default="", help="CAP evidence link to cite in bundle")
    ap.add_argument("--dbom-link", default="", help="DBoM attestation path to cite in bundle")
    ap.add_argument("--out", default="./out", help="Output directory")
    args = ap.parse_args()

    att = json.loads(Path(args.attestation).read_text())
    statement = make_statement(att, args.issuer_kid, Path(args.issuer_key))
    receipt = submit_to_log(args.log_url, statement)
    links = {"canon": args.canon_link, "cap": args.cap_link, "dbom": args.dbom_link}
    base = att.get("id","att").replace('/', '_')
    bundle = write_outputs(Path(args.out), base, statement, receipt, links)

    print("Wrote:")
    print("  statement:", Path(args.out)/f"{base}.statement.jws.json")
    print("  receipt  :", Path(args.out)/f"{base}.receipt.json")
    print("  bundle   :", Path(args.out)/f"{base}.bundle.json")

if __name__ == "__main__":
    sys.exit(main())
