import fs from 'fs/promises';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));
if(!args._[0]) {
  console.error('Usage: spdx2dbom <spdx.json> [--pkg=<SPDXID>]  # default = first package/document');
  process.exit(2);
}

function purlFromExternalRefs(extRefs=[]) {
  for (const r of extRefs) if ((r.referenceType||'').toLowerCase()==='purl' && r.referenceLocator) return r.referenceLocator;
  return undefined;
}

(async () => {
  const spdx = JSON.parse(await fs.readFile(args._[0],'utf8'));

  // Choose a package (or document-level “subject”)
  const pkgs = spdx.packages || [];
  let pkg = pkgs[0];
  if(args.pkg) pkg = pkgs.find(p=>p.SPDXID===args.pkg) || pkg;

  const subject = {
    artifact: {
      ...(purlFromExternalRefs(pkg?.externalRefs) ? { purl: purlFromExternalRefs(pkg.externalRefs) } : {}),
      ...(pkg?.checksums?.length ? { digest: Object.fromEntries(pkg.checksums.map(c=>[c.algorithm?.toLowerCase().replace('-',''), c.checksumValue])) } : {})
    }
  };

  // Map relationships -> simple DBoM claims
  const claims = [];
  for (const rel of spdx.relationships || []) {
    // Only keep relations where this pkg is the source (or document root)
    if (pkg && rel.relatedSpdxElement && rel.spdxElement === pkg.SPDXID) {
      const target = pkgs.find(p=>p.SPDXID===rel.relatedSpdxElement);
      const obj = target ? { purl: purlFromExternalRefs(target.externalRefs) || target.packageName } : rel.relatedSpdxElement;
      const t = (rel.relationshipType||'').toUpperCase();
      const predicate = (t==='CONTAINS' || t==='CONTAINED_BY') ? 'contains'
                        : (t==='DEPENDS_ON') ? 'depends_on'
                        : (t==='ANCESTOR_OF' || t==='DESCENDANT_OF') ? 'derives_from'
                        : t.toLowerCase();
      claims.push({ predicate, object: obj, label: 'Reported', confidence: 0.8 });
    }
  }

  const issuer = spdx.creationInfo?.creators?.[0] || 'spdx:unknown';
  const issued = spdx.creationInfo?.created || new Date().toISOString();

  const dbom = {
    type: 'attestation',
    subject,
    claims,
    provenance: { issuer, issued }
  };

  console.log(JSON.stringify(dbom, null, 2));
})();
