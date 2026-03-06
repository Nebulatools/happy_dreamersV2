import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const localDbName = process.env.MONGODB_DB_FINAL || process.env.MONGODB_DATABASE || process.env.MONGODB_DB;
const PRD_DB = 'happy_dreamers_prd01';

if (!uri) { console.log('No MONGODB_URI found'); process.exit(1); }

// Parsear argumentos: filtrar flags de IDs
const args = process.argv.slice(2);
const usePrd = args.includes('--prd');
const searchId = args.find(a => !a.startsWith('--'));

const targetDb = usePrd ? PRD_DB : localDbName;
console.log(`DB: ${targetDb}${usePrd ? ' (produccion)' : ' (local)'}`);

const client = new MongoClient(uri);
await client.connect();
const db = client.db(targetDb);

// Construir query
let query = {};
if (searchId) {
  try {
    query = { _id: new ObjectId(searchId) };
  } catch {
    query = { requestTraceId: searchId };
  }
}

// Buscar reports
let reports = await db.collection('bug_reports').find(query).sort({ createdAt: -1 }).limit(20).toArray();

// Si no encontramos con ID especifico, buscar en todas las DBs
if (reports.length === 0 && searchId) {
  console.log(`No encontrado en ${targetDb}, buscando en todas las DBs...`);
  const { databases } = await client.db().admin().listDatabases();
  for (const dbInfo of databases) {
    if (['admin', 'local', targetDb].includes(dbInfo.name)) continue;
    const otherDb = client.db(dbInfo.name);
    const cols = await otherDb.listCollections({ name: 'bug_reports' }).toArray();
    if (cols.length > 0) {
      const found = await otherDb.collection('bug_reports').find(query).sort({ createdAt: -1 }).limit(20).toArray();
      if (found.length > 0) {
        console.log(`>>> ENCONTRADO en DB: ${dbInfo.name}`);
        reports = found;
        break;
      }
    }
  }
}

console.log(`Total: ${reports.length} bug reports`);
console.log('');

for (const r of reports) {
  console.log(`--- [${r.status?.toUpperCase() || 'OPEN'}] ${r.title} ---`);
  console.log(`  ID:       ${r._id.toString()}`);
  console.log(`  Fecha:    ${r.createdAt}`);
  console.log(`  Autor:    ${r.createdBy?.name || '?'} (${r.createdBy?.role || '?'})`);
  console.log(`  Ruta:     ${r.route || '-'}`);
  console.log(`  Desc:     ${r.description || '(sin descripcion)'}`);
  if (r.traceIds?.length) console.log(`  TraceIds: ${JSON.stringify(r.traceIds)}`);
  if (r.clientErrors?.length) console.log(`  Errores:  ${r.clientErrors.length} client errors`);
  console.log('');
}

await client.close();
