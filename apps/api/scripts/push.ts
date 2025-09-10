/* tsx scripts/push.ts teams|outlook|calendar "BODY_JSON" */
import crypto from 'crypto';

const source = process.argv[2];
const bodyArg = process.argv[3];
if (!source || !bodyArg) {
  console.error('Usage: tsx scripts/push.ts teams|outlook|calendar \'{"..."}\'');
  process.exit(1);
}

const env = process.env;
const secret = env.INGEST_HMAC_SECRET || 'change-me-dev';
const body = bodyArg;

const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');

fetch(`http://localhost:4000/ingest/${source}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Signature': sig },
  body,
})
  .then(async (r) => {
    console.log(r.status, await r.text());
  })
  .catch((e) => {
    console.error(e);
  });
