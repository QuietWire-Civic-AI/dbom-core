import fs from 'fs/promises';
import minimist from 'minimist';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ strict: true, allowUnionTypes: true, allErrors: true });
addFormats(ajv);

async function loadJSON(p){ return JSON.parse(await fs.readFile(p,'utf8')); }

async function cmdValidate(args){
  const schema = await loadJSON('schema/dbom-v0.schema.json');
  const validate = ajv.compile(schema);
  const files = args._.length ? args._ : (await fs.readdir('examples')).filter(f=>f.endsWith('.json')).map(f=>'examples/'+f);
  let ok = true;
  for (const f of files){
    const data = await loadJSON(f);
    const valid = validate(data);
    if(valid) console.log('✓', f, 'valid');
    else { ok=false; console.error('✗', f, ajv.errorsText(validate.errors,{separator:' | '})); }
  }
  process.exit(ok?0:1);
}

function fmt(v){ return typeof v==='string'?v:JSON.stringify(v); }

async function cmdQuery(args){
  if(!args._[0]) { console.error('Usage: dbom query <file> [--predicate=contains] [--purl=pkg:npm/x]'); process.exit(2); }
  const doc = await loadJSON(args._[0]);
  const pred = args.predicate;
  const purl = args.purl;
  const claims = (doc.claims||[]).filter(c => (!pred || c.predicate===pred));
  const rows = claims.filter(c => !purl || (doc.subject?.artifact?.purl===purl || c.object?.purl===purl));
  if(!rows.length){ console.log('(no matches)'); return; }
  for(const c of rows){
    console.log(`- predicate: ${c.predicate} | object: ${fmt(c.object)} | label: ${c.label??''} | conf: ${c.confidence??''}`);
  }
}

const args = minimist(process.argv.slice(2));
const sub = args._.shift();
if(sub==='validate') cmdValidate(args);
else if(sub==='query') cmdQuery(args);
else { console.error('Usage: dbom <validate|query> ...'); process.exit(2); }
