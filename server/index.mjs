import express from "express";
import bodyParser from "body-parser";
import fs from "fs/promises";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import meta2020 from "ajv/dist/refs/json-schema-2020-12.json" assert { type: "json" };

const SCHEMA_ID = "https://quietwire.ai/dbom/v0/schema";

const ajv = new Ajv({ strict: true, allowUnionTypes: true, allErrors: true });
addFormats(ajv);

let validateCompiled = null;

async function loadSchema() {
  const text = await fs.readFile("schema/dbom-v0.schema.json", "utf8");
  return JSON.parse(text);
}

async function getValidator() {
  if (validateCompiled) return validateCompiled;
  const schema = await loadSchema();
  // Add only once; reuse afterwards
  if (!ajv.getSchema(SCHEMA_ID)) {
    ajv.addSchema(schema, SCHEMA_ID);
  }
  validateCompiled = ajv.getSchema(SCHEMA_ID) || ajv.compile(schema);
  return validateCompiled;
}

async function validateDoc(doc) {
  const validate = await getValidator();
  const ok = validate(doc);
  return { ok, errors: validate.errors || [] };
}

// SPDX → DBoM minimal mapper
function spdxToDbom(spdx) {
  const pkgs = spdx.packages || [];
  const pkg = pkgs[0];
  const extRefs = pkg?.externalRefs || [];
  const purlRef = extRefs.find(
    (r) => (r.referenceType || "").toLowerCase() === "purl"
  );
  const subject = {
    artifact: {
      ...(purlRef ? { purl: purlRef.referenceLocator } : {}),
      ...(pkg?.checksums?.length
        ? { digest: Object.fromEntries(pkg.checksums.map(c => [c.algorithm.toLowerCase(), c.checksumValue])) }
        : {})
    }
  };
  const result = {
    type: "attestation",
    subject,
    claims: [],
    events: [],
    evidence: [],
    provenance: {
      source: "spdx",
      time: new Date().toISOString(),
      method: "convert",
      reviewer: "local"
    }
  };
  return result;
}

const app = express();
app.use(bodyParser.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.json({ service: "QuietWire Transparency Exchange API", endpoints: ["/validate", "/query", "/convert/spdx"] });
});

app.post("/validate", async (req, res) => {
  try {
    const { ok, errors } = await validateDoc(req.body);
    res.json({ valid: ok, errors });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

app.post("/query", async (req, res) => {
  const predicate = (req.query.predicate || "contains").toString();
  // trivial demo query: emit one claim back
  res.json({
    count: 1,
    claims: [
      {
        predicate,
        object: { purl: "pkg:npm/dep@2.0.0" },
        label: "Observed",
        confidence: 0.9
      }
    ]
  });
});

app.post("/convert/spdx", async (req, res) => {
  try {
    const out = spdxToDbom(req.body);
    const { ok, errors } = await validateDoc(out);
    res.json({ attestation: out, valid: ok, errors });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`🌐 Transparency Exchange API: http://localhost:${PORT}`);
});
