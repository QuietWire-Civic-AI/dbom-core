#!/usr/bin/env python3
# verify.py — tiny JWS(ES256) verifier for SCITT demo bundles
import json, base64, sys
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature

def b64u(b): return base64.urlsafe_b64encode(b).rstrip(b'=')
def b64d(s): return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))

bundle = json.load(open(sys.argv[1]))
stmt   = bundle["statement"]
prot   = json.dumps(stmt["protected"], separators=(',',':')).encode()
signing_input = b'.'.join([b64u(prot), stmt["payload"].encode()])
r = int.from_bytes(b64d(stmt["signature"])[:32], 'big')
s = int.from_bytes(b64d(stmt["signature"])[32:], 'big')
der = encode_dss_signature(r, s)

pub = serialization.load_pem_public_key(open(sys.argv[2], 'rb').read())
pub.verify(der, signing_input, ec.ECDSA(hashes.SHA256()))
print("OK: signature valid; payload hash =", hashes.Hash(hashes.SHA256()).copy().finalize().hex())
