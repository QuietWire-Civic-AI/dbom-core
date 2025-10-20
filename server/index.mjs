import express from "express";
import bodyParser from "body-parser";
import fs from "fs/promises";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const SCHEMA_ID = "https://quietwire.ai/dbom/v0/schema";

// AJV: keep strict, but relax "required in anyOf/oneOf" complaints
const ajv = new Ajv({
  strict: true,
  strictRequired: false,
  allowUnionTypes: true,
  allErrors: true
});
addFormats(ajv);

// cache compiled validator across requests
let validateCompiled = null;

async function loadSchema() {
  const text = await fs.readFile("schema/dbom-v0.schema.json", "utf8");
  return JSON.parse(text);
}
async function getValidator() {
  if (validateCompiled) return validateCompiled;
  const schema = await loadSchema();
  // replace existing schema id if already added (idempotent)
  try { ajv.removeSchema(SCHEMA_ID); } catch {}
  validateCompiled = ajv.addSchema(schema, SCHEMA_ID).getSchema(SCHEMA_ID);
  return validateCompiled;
}

// SPDX → DBoM (minimal)
function spdxToDbom(spdx) {
  const pkg = (spdx.packages || [])[0] || {};
  const purlRef = (pkg.externalRefs || []).find(
    r => (r.referenceType || "").toLowerCase() === "purl"
  );
  const digest = {};
  (pkg.checksums || []).forEach(c => {
    const algo = (c.algorithm || "").toLowerCase();
    if (algo === "sha256") digest.sha256 = c.checksumValue;
    if (algo === "sha384") digest.sha384 = c.checksumValue;
    if (algo === "sha512") digest.sha512 = c.checksumValue;
  });
  const attestation = {
    type: "attestation",
    subject: {
      artifact: {
        ...(purlRef ? { purl: purlRef.referenceLocator } : {}),
        ...(Object.keys(digest).length ? { digest } : {})
      }
    },
    claims: [{
      predicate: "contains",
      object: { purl: purlRef?.referenceLocator || "pkg:unknown/unknown@0" },
      label: "Observed",
      confidence: 0.9
    }],
    provenance: {
      issuer: "QuietWire Transparency Exchange",
      issued: new Date().toISOString(),
      source: "spdx:2.3",
      time: new Date().toISOString(),
      method: "converter:spdx->dbom",
      reviewer: "auto",
      uncertainty: 0.0
    }
  };
  return attestation;
}

const app = express();
app.use(bodyParser.json({ limit: "5mb" }));

app.get("/version", async (_req, res) => {
  res.json({ name: "dbom-core", schema: SCHEMA_ID, ajv: Ajv.version });
});

app.post("/validate", async (req, res) => {
  try {
    const validate = await getValidator();
    const ok = validate(req.body);
    res.json({ valid: !!ok, errors: validate.errors || [] });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/query", async (req, res) => {
  const pred = String(req.query.predicate || "").trim();
  const doc = req.body || {};
  const claims = (doc.claims || []).filter(c => !pred || c.predicate === pred);
  res.json({ count: claims.length, claims });
});

app.post("/convert/spdx", async (req, res) => {
  try {
    const att = spdxToDbom(req.body || {});
    const validate = await getValidator();
    const ok = validate(att);
    res.json({ attestation: att, valid: !!ok, errors: validate.errors || [] });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`🌐 Transparency Exchange API: http://localhost:${PORT}`);
});
