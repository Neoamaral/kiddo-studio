/**
 * Checks the admin navigation in a real browser: that the row still fits on one
 * line, and that the SETUP menu opens, closes and can be driven from the
 * keyboard.
 *
 * WHY A BROWSER AND NOT A UNIT TEST. Everything that can break here is
 * behaviour the DOM owns — where focus lands after Escape, whether a click
 * outside closes the menu, whether the open menu is clipped by the sticky
 * header, whether the row wraps at 1280. None of that can be asserted against
 * the JSX.
 *
 * NO PLAYWRIGHT PACKAGE. The browser it installs is on this machine but the
 * npm package is not, so this speaks the DevTools protocol directly. Node has
 * had a global WebSocket since 22, which was the only missing piece.
 *
 * Needs a server already running on :3123 and an admin cookie:
 *
 *   npm run build && node --env-file=.env.local node_modules/next/dist/bin/next start -p 3123
 *   node scripts/check-admin-nav.mjs "kiddo_admin=<cookie value>" ./out
 *
 * Exits non-zero on the first failed assertion, like the other check scripts.
 */
import { spawn } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

const [cookie, outdir] = process.argv.slice(2);
const BASE = "http://localhost:3123";
const CHROME = path.join(
  os.homedir(),
  "AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe"
);
const PORT = 9411;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-"));

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "about:blank",
]);
chrome.stderr.on("data", () => {});

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find((t) => t.type === "page");
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Chrome never answered");
}

const ws = new WebSocket(await target());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  }
};
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const n = ++id;
    pending.set(n, { res, rej });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

const evalJs = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression: `(() => { ${expression} })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Page.enable");
await send("Network.enable");
const [cname, cvalue] = cookie.split("=");
await send("Network.setCookie", {
  name: cname,
  value: cvalue,
  domain: "localhost",
  path: "/",
  httpOnly: true,
});

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail ? "  — " + detail : ""}`);
};

async function go(url, w = 1280, h = 900) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: h,
    deviceScaleFactor: 1,
    mobile: w < 500,
  });
  await send("Page.navigate", { url });
  await wait(1800);
}

/* ── 1280: does the row fit on one line now? ───────────────────────────── */
await go(`${BASE}/admin/requests`);
const row = await evalJs(`
  const nav = document.querySelector('header nav');
  const kids = [...nav.children];
  const tops = new Set(kids.map(k => Math.round(k.getBoundingClientRect().top)));
  return JSON.stringify({
    items: kids.length,
    lines: tops.size,
    sideways: document.documentElement.scrollWidth - window.innerWidth,
    labels: kids.map(k => k.textContent.trim().split('\\n')[0]).join(' | '),
  });
`);
const r = JSON.parse(row);
check("the nav is one line at 1280", r.lines === 1, `${r.items} items, ${r.lines} line(s)`);
check("no sideways scroll", r.sideways <= 0, `${r.sideways}px`);
console.log(`       ${r.labels}`);

/* ── The menu opens, closes, and marks itself ──────────────────────────── */
const btn = `document.querySelector('header nav button[aria-haspopup="menu"]')`;

check(
  "starts closed",
  (await evalJs(`return ${btn}.getAttribute('aria-expanded')`)) === "false"
);

await evalJs(`${btn}.click(); return 1`);
await wait(250);
const opened = await evalJs(`
  const m = document.querySelector('[role="menu"]');
  return JSON.stringify({
    expanded: ${btn}.getAttribute('aria-expanded'),
    items: m ? [...m.querySelectorAll('[role="menuitem"]')].map(a => a.getAttribute('href')) : null,
    visible: m ? m.getBoundingClientRect().height > 0 : false,
    clipped: m ? m.getBoundingClientRect().bottom > document.querySelector('header').getBoundingClientRect().bottom : null,
  });
`);
const o = JSON.parse(opened);
check("click opens it", o.expanded === "true" && o.visible);
check("it holds the four settings screens", o.items?.length === 4, (o.items || []).join(", "));
check("it is not clipped by the header", o.clipped === true, "hangs below the header edge");

/* Outside click */
await evalJs(`document.querySelector('main').dispatchEvent(new PointerEvent('pointerdown', {bubbles:true})); return 1`);
await wait(200);
check(
  "a click outside closes it",
  (await evalJs(`return ${btn}.getAttribute('aria-expanded')`)) === "false"
);

/* Escape, and focus coming back */
await evalJs(`${btn}.click(); return 1`);
await wait(200);
await evalJs(`document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})); return 1`);
await wait(200);
const esc = await evalJs(`
  return JSON.stringify({
    expanded: ${btn}.getAttribute('aria-expanded'),
    focusIsButton: document.activeElement === ${btn},
  });
`);
const e = JSON.parse(esc);
check("Escape closes it", e.expanded === "false");
check("Escape puts focus back on the button", e.focusIsButton === true);

/* Keyboard opening */
await evalJs(`
  ${btn}.focus();
  ${btn}.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown', bubbles:true}));
  return 1;
`);
await wait(350);
const kb = await evalJs(`
  const first = document.querySelector('[role="menuitem"]');
  return JSON.stringify({
    expanded: ${btn}.getAttribute('aria-expanded'),
    focusIsFirstItem: document.activeElement === first,
  });
`);
const k = JSON.parse(kb);
check("ArrowDown opens it", k.expanded === "true");
check("ArrowDown lands on the first item", k.focusIsFirstItem === true);

/* ── Inside a settings screen: is the button marked active? ────────────── */
await go(`${BASE}/admin/pricing`);
const marked = await evalJs(`
  const b = ${btn};
  const bg = getComputedStyle(b).backgroundColor;
  const tabs = [...document.querySelectorAll('header nav a')];
  const litTabs = tabs.filter(a => getComputedStyle(a).backgroundColor === 'rgb(200, 232, 32)');
  return JSON.stringify({ buttonBg: bg, litTabs: litTabs.map(a => a.textContent.trim()) });
`);
const mk = JSON.parse(marked);
check(
  "on /admin/pricing the SETUP button is lit",
  mk.buttonBg === "rgb(200, 232, 32)",
  mk.buttonBg
);
check("and no top-level tab is also lit", mk.litTabs.length === 0, mk.litTabs.join(", ") || "none");

/* The menu closes when a route changes */
await evalJs(`${btn}.click(); return 1`);
await wait(200);
await evalJs(`document.querySelector('header nav a[href="/admin/requests"]').click(); return 1`);
await wait(1600);
check(
  "navigating closes it",
  (await evalJs(`return document.querySelector('[role="menu"]') === null`)) === true
);

/* ── 390: the phone ────────────────────────────────────────────────────── */
await go(`${BASE}/admin/analytics`, 390, 844);
await evalJs(`${btn}.click(); return 1`);
await wait(300);
const phone = await evalJs(`
  const m = document.querySelector('[role="menu"]');
  const box = m.getBoundingClientRect();
  return JSON.stringify({
    visible: box.height > 0,
    offRight: Math.round(box.right - window.innerWidth),
    sideways: document.documentElement.scrollWidth - window.innerWidth,
  });
`);
const ph = JSON.parse(phone);
check("the menu opens at 390px", ph.visible === true);
check("it does not run off the right edge", ph.offRight <= 0, `${ph.offRight}px past the edge`);
check("the page still does not scroll sideways", ph.sideways <= 0, `${ph.sideways}px`);

const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
fs.writeFileSync(path.join(outdir, "menu-mobile.png"), Buffer.from(shot.data, "base64"));

await go(`${BASE}/admin/requests`, 1280, 900);
await evalJs(`${btn}.click(); return 1`);
await wait(300);
const shot2 = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(path.join(outdir, "menu-desktop.png"), Buffer.from(shot2.data, "base64"));

const bad = results.filter((x) => !x.ok).length;
console.log(bad === 0 ? "\nall menu assertions passed" : `\n${bad} FAILED`);
ws.close();
chrome.kill();
process.exit(bad === 0 ? 0 : 1);
