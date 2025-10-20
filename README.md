# DBoM Core (Transparency Exchange)

Minimal, format-neutral API for evidence-carrying attestations.
It validates and answers questions regardless of input format (SPDX, CycloneDX, CSAF, etc.).

## Quickstart

```bash
npm i
npm run start             # -> 🌐 http://localhost:8787
```

## CLI (optional)

```bash
npm run dbom:validate     # validates examples/*.json
```

## API

* `GET /version` → `{ name, schema }`
* `POST /validate` body: DBoM JSON → `{ valid, errors }`
* `POST /query?predicate=...` body: DBoM JSON → `{ count, claims:[...] }`
* `POST /convert/spdx` body: SPDX 2.3 JSON → `{ attestation, valid, errors }`

### Demo

```bash
curl -s http://localhost:8787/version | jq
curl -s -X POST http://localhost:8787/validate -H 'content-type: application/json' --data-binary @examples/minimal.json | jq
curl -s -X POST "http://localhost:8787/query?predicate=contains" -H 'content-type: application/json' --data-binary @examples/minimal.json | jq
curl -s -X POST http://localhost:8787/convert/spdx -H 'content-type: application/json' --data-binary @examples/spdx23.json | jq
```

## Spec & Schema

* Spec: [`spec/00-index.md`](spec/00-index.md)
* Schema: [`schema/dbom-v0.schema.json`](schema/dbom-v0.schema.json)

## License

Apache-2.0
