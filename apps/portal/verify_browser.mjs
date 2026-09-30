// Teste manual da interface no Edge de teste (porta CDP 9223).
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const targets = await (await fetch("http://127.0.0.1:9223/json/list")).json();
const target = targets.find(t => t.type === "page" && t.url.startsWith("http://127.0.0.1:8877/"));
assert(target, "Abra somente o portal no perfil de teste do Edge");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let seq = 0;
const pending = new Map(), errors = [];
ws.onmessage = event => {
  const msg = JSON.parse(event.data);
  if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.text);
  if (msg.id) {
    const p = pending.get(msg.id); pending.delete(msg.id);
    if (msg.error) p.reject(new Error(JSON.stringify(msg.error))); else p.resolve(msg.result);
  }
};
function rpc(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, {resolve, reject}); ws.send(JSON.stringify({id, method, params}));
  });
}
async function evaluate(expression) {
  const r = await rpc("Runtime.evaluate", {expression, awaitPromise: true, returnByValue: true});
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(expression) {
  for (let n=0; n<80; n++) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error("Timeout: " + expression);
}
async function go(hash, ready) {
  await evaluate("location.hash=" + JSON.stringify(hash));
  await until(ready);
}
async function shot(name) {
  const r = await rpc("Page.captureScreenshot", {format:"png", captureBeyondViewport:false});
  writeFileSync("verification/" + name + ".png", Buffer.from(r.data, "base64"));
}
try {
  await rpc("Runtime.enable"); await rpc("Page.enable");
  await rpc("Emulation.setDeviceMetricsOverride", {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await go("#/visao", "document.querySelectorAll('.room-card').length===8");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.menu-toggle')).display"), "none");
  await until("[...document.querySelectorAll('.room-card')].every(e=>getComputedStyle(e).opacity==='1')");
  await shot("portal-desktop-final");
  await go("#/sala/cfo", "!!document.querySelector('#tab-conversa')");
  await evaluate("document.querySelector('#tab-conversa').click()");
  await until("!!document.querySelector('#panel-conversa textarea')");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#panel-painel')).display"), "none");
  await evaluate("document.querySelector('#tab-painel').click()");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#panel-conversa')).display"), "none");
  for (const room of ["ceo","coo","cio","cmo","cso"]) {
    await go("#/sala/"+room, "!!document.querySelector('textarea') && document.querySelector('h1').textContent.includes("+JSON.stringify(room.toUpperCase())+")");
  }
  await go("#/parametros", "!!document.querySelector('#param-risco_pct')");
  await evaluate("document.querySelector('#param-risco_pct').value='99'; document.querySelector('#param-risco_pct').dispatchEvent(new Event('input',{bubbles:true}))");
  assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"), true);
  await go("#/secretaria", "!!document.querySelector('#sec-target')");
  await evaluate("document.querySelector('#sec-target').value='cio'; document.querySelector('#sec-target').dispatchEvent(new Event('change',{bubbles:true}))");
  await until("document.querySelector('.route-preview').textContent.includes('CIO')");
  await rpc("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await delay(500);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, "overflow mobile");
  await evaluate("document.querySelector('#menu-toggle').click()");
  assert.equal(await evaluate("document.querySelector('#menu-toggle').getAttribute('aria-expanded')"), "true");
  await delay(500);
  await shot("portal-mobile-menu");
  await evaluate("document.querySelector('#menu-toggle').click()");
  await delay(500);
  await shot("portal-mobile-final");
  assert.deepEqual(errors, []);
  const result = {resultado:"PASS", salas:6, abasCFO:"PASS", parametrosInvalidos:"PASS", secretaria:"PASS", menuMobile:"PASS", larguraMobile:390, errosJavaScript:errors};
  writeFileSync("verification/browser.json", JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally { ws.close(); }
