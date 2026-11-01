import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { pipeRedacted } from "./cloudflare-client.mjs";

// Explicit test-only wrapper, generated outside source/deployment artifacts. Neither the
// fixture transport nor fault injection is part of either production Worker bundle/config.
if (process.env.E2E_CLOUDFLARE !== "1")
  throw new Error("Only the explicit local Cloudflare test runtime may start this harness");
const folder = resolve(".qa/cloudflare-web-test");
mkdirSync(folder, { recursive: true });
const key = randomBytes(32).toString("hex");
writeFileSync(`${folder}/fixture-key`, key, { mode: 0o600 });
chmodSync(`${folder}/fixture-key`, 0o600);
try {
  process.loadEnvFile(".env");
} catch {}
const vars = {
  OUTPOST_RUNTIME: "cloudflare",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: randomBytes(48).toString("hex"),
  OUTPOST_RENDER_SESSION_SECRET: randomBytes(48).toString("hex"),
};
if (process.env.DISCORD_CLIENT_ID) {
  vars.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  vars.DISCORD_CLIENT_SECRET = "outpost-local-qa-not-a-real-secret";
}
const root = JSON.parse(readFileSync("wrangler.jsonc", "utf8").replace(/,\s*([}\]])/g, "$1"));
const data = JSON.parse(
  readFileSync("cloudflare/database/wrangler.jsonc", "utf8").replace(/,\s*([}\]])/g, "$1"),
);
const webConfig = {
  ...root,
  name: "albionoutpost-web-local-qa",
  main: `${folder}/web-entry.ts`,
  assets: { ...root.assets, directory: resolve(".open-next/assets") },
  vars,
  services: [{ binding: "OUTPOST_DATA", service: "albionoutpost-data" }],
  durable_objects: {
    bindings: [
      ...(root.durable_objects?.bindings ?? []),
      {
        name: "FIXTURE_DATABASE",
        class_name: "OutpostDatabase",
        script_name: "albionoutpost-data",
      },
    ],
  },
};
const dataConfig = {
  ...data,
  main: `${folder}/data-entry.ts`,
  alias: Object.fromEntries(
    Object.entries(data.alias).map(([name, path]) => [name, resolve("cloudflare/database", path)]),
  ),
};
writeFileSync(`${folder}/web.jsonc`, JSON.stringify(webConfig, null, 2), { mode: 0o600 });
chmodSync(`${folder}/web.jsonc`, 0o600);
writeFileSync(`${folder}/data.jsonc`, JSON.stringify(dataConfig, null, 2));
writeFileSync(
  `${folder}/web-entry.ts`,
  `import app from ${JSON.stringify(resolve("cloudflare/web/worker.ts"))};export {OutpostSession} from ${JSON.stringify(resolve("cloudflare/web/worker.ts"))};import {encode,decode} from ${JSON.stringify(resolve("e2e/support/wire.ts"))};export default {async fetch(request,env,ctx){if(new URL(request.url).pathname!=='/__local_qa/fixture')return app.fetch(request,env,ctx);const actual=new TextEncoder().encode(request.headers.get('X-Outpost-QA-Key')??''),expected=new TextEncoder().encode(${JSON.stringify(key)});if(request.method!=='POST'||actual.length!==expected.length||!crypto.subtle.timingSafeEqual(actual,expected))return new Response('Not found',{status:404});const {method,args:frame}=await request.json();const args=decode(frame);let value;if(method==='query')value=await env.OUTPOST_DATA.fixtureQuery(...args);else if(method==='fault')value={ok:true,value:await env.FIXTURE_DATABASE.getByName('accounts-v1-eu').fixtureFault(...args)};else return new Response('Not found',{status:404});return Response.json(encode(value));}};`,
);
writeFileSync(
  `${folder}/data-entry.ts`,
  `import Data,{OutpostDatabase as Database,AbuseBudget} from ${JSON.stringify(resolve("cloudflare/database/worker.ts"))};
import {catalogClient} from ${JSON.stringify(resolve("cloudflare/database/create-client.mjs"))};
import {databaseFailure} from ${JSON.stringify(resolve("cloudflare/database/protocol.ts"))};
export {AbuseBudget};
export class OutpostDatabase extends Database {
 async fixtureFault(id,action){if(!/^atlas-test-[a-f0-9]{32}$/.test(id)||![null,'update','delete'].includes(action))throw Error('Invalid isolated fixture');const key='qa-fault:'+id;if(action)await this.ctx.storage.put(key,action);else await this.ctx.storage.delete(key);return true;}
 async query(queries){for(const q of queries){if(q.model==='user'&&['update','delete'].includes(q.operation)&&typeof q.args?.where?.id==='string'&&(await this.ctx.storage.get('qa-fault:'+q.args.where.id))===q.operation)return {ok:false,error:{kind:'unavailable'}};}return super.query(queries);}
}
export default class LocalData extends Data {
 async fixtureQuery(queries){
  const q=queries[0];
  if(queries.length!==1||!['catalogRelease','itemMetadata'].includes(q?.model)||!['create','delete','deleteMany'].includes(q?.operation))return this.query(queries);
  const client=catalogClient(this.env.CATALOG);
  try {
   if(q.model==='catalogRelease'&&q.operation==='create'){
    if(!/^(test-|qa-reflow-)[a-f0-9-]{36}$/.test(q.args?.data?.version))throw Error('Only isolated catalog release fixtures are allowed');
   }else{
    const releaseId=q.model==='catalogRelease'?q.args?.where?.id:(q.args?.data?.releaseId??q.args?.where?.releaseId);
    const release=typeof releaseId==='string'?await client.catalogRelease.findUnique({where:{id:releaseId}}):null;
    if(!release||!/^(test-|qa-reflow-)[a-f0-9-]{36}$/.test(release.version))throw Error('Only isolated catalog fixtures are allowed');
    if(q.model==='itemMetadata'&&q.operation==='create'&&!['T4_CATALOG_TEST','T4_CATALOG_BAD','T4_REFLOW_QA_FIXTURE'].includes(q.args.data.id))throw Error('Unsupported catalog fixture identifier');
   }
   return {ok:true,value:[await client[q.model][q.operation](q.args)]};
  }catch(error){return databaseFailure(error);}finally{await client.$disconnect();}
 }
}`,
);
const child = spawn(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--config",
    `${folder}/web.jsonc`,
    "--config",
    `${folder}/data.jsonc`,
    "--ip",
    "127.0.0.1",
    "--port",
    "3000",
    "--inspector-port",
    "0",
    "--persist-to",
    resolve(".qa/cloudflare-database-test/state"),
  ],
  {
    env: {
      ...process.env,
      XDG_CONFIG_HOME: `${folder}/config`,
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_SEND_ERROR_REPORTS: "false",
      CLOUDFLARE_API_TOKEN: "",
      CLOUDFLARE_DNS_API_TOKEN: "",
    },
    stdio: ["inherit", "pipe", "pipe"],
  },
);
const redactions = [
  key,
  vars.NEXTAUTH_SECRET,
  vars.OUTPOST_RENDER_SESSION_SECRET,
  vars.DISCORD_CLIENT_SECRET,
  process.env.DISCORD_CLIENT_SECRET,
].filter(Boolean);
pipeRedacted(child.stdout, process.stdout, redactions);
pipeRedacted(child.stderr, process.stderr, redactions);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
child.on("error", () => {
  console.error("Local Cloudflare QA server failed to start");
  process.exitCode = 1;
});
