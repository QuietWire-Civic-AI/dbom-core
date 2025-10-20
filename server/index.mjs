import express from "express";
import bodyParser from "body-parser";
import fs from "fs/promises";
import Ajv from "ajv";
import addFormats from "ajv-formats";

// shared validator
const ajv = new Ajv({ strict: true, allowUnionTypes: true, allErrors: true });
addFormats(ajv);

async function loadSchema() {
  const text = await fs.readFile("schema/dbom-v0.schema.json", "utf8");
  return JSON.parse(text);
}

async function validateDoc(doc) {
  const schema = await loadSchema();
  const validate = ajv.compile(schema);
  const ok = validate(doc);
  return { ok, errors: validate.errors || [] };
}

// SPDX → DBoM minimal mapper (same logic as CLI)
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
        ? {
            digest: Object.fromEntries(
              pkg.checksums.map((c) => [
                c.algorithm?.toLowerCase().replace("-", ""),
                c.checksumValue,
              ])
            ),
          }
        : {}),
    },
  };
  const claims = (spdx.relationships || []).map((rel) => ({
    predicate: rel.relationshipType?.toLowerCase() || "related",
    object: rel.relatedSpdxElement,
    label: "Reported",
    confidence: 0.8,
  }));
  const issuer = spdx.creationInfo?.creators?.[0] || "spdx:unknown";
  const issued = spdx.creationInfo?.created || new Date().toISOString();
  return { type: "attestation", subject, claims, provenance: { issuer, issued } };
}

// ----------------------------
// Express app
// ----------------------------
const app = express();
app.use(bodyParser.json({ limit: "5mb" }));

app.get("/", (_, res) => {
  res.json({
    service: "QuietWire Transparency Exchange API",
    endpoints: ["/validate", "/query", "/convert/spdx"],
  });
});

// Validate a DBoM document
app.post("/validate", async (req, res) => {
  try {
    const result = await validateDoc(req.body);
    if (result.ok) res.json({ valid: true });
    else res.status(400).json({ valid: false, errors: result.errors });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Query claims
app.post("/query", async (req, res) => {
  try {
    const { predicate, purl } = req.query;
    const doc = req.body;
    const claims = (doc.claims || []).filter((c) => {
      if (predicate && c.predicate !== predicate) return false;
      if (purl && c.object?.purl !== purl) return false;
      return true;
    });
    res.json({ count: claims.length, claims });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SPDX → DBoM conversion
app.post("/convert/spdx", async (req, res) => {
  try {
    const dbom = spdxToDbom(req.body);
    res.json(dbom);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () =>
  console.log(`🌐 Transparency Exchange API running on http://localhost:${PORT}`)
);
