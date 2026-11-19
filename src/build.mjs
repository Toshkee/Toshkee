// Build the profile SVGs (light + dark) and README.md from the content below and data/contributions.json.
// Each SVG wraps plain HTML/CSS in a <foreignObject>, with the font embedded, because GitHub's image proxy
// blocks anything loaded from outside the file.
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";

// ---------- Content (edit this) ----------
const SITE = "https://www.pavletosic.com";
const C = {
  name: "Pavle Tošić",
  role: "Software Developer",
  place: "Montenegro · GMT+1",
  intro: ["I'm Pavle, a software developer in Montenegro, currently at Infostream.", "I turn ideas into shipped, working software, front to back."],
  facts: [
    ["Now", "Software Developer at Infostream"],
    ["Studio", "Founder & developer, Vaky.me"],
    ["Strongest in", "TypeScript, React, Next.js, Node.js"],
    ["At work", "Oracle APEX, Oracle Database, .NET / C#"],
    ["Creative", "Three.js, React Three Fiber, Godot 4"],
    ["Languages", "Montenegrin, English"],
    ["Availability", "Open to remote roles", "open"],
  ],
  work: [
    ["Reform Fitness", "Client work, Vaky", "2026", "reform-fitness"],
    ["Distinct", "Client work, Vaky", "2026", "distinct"],
    ["Infostream", "Company website, Infostream", "2026", "infostream"],
    ["Vaky.me", "Own studio", "2026", "vaky"],
    ["CryptoFlow", "General Assembly, rebuilt", "2026", "cryptoflow"],
    ["Ronin Duel", "General Assembly, rebuilt", "2026", "ronin-duel"],
  ],
  workTotal: 10,
  links: [
    ["Website", SITE],
    ["LinkedIn", "https://www.linkedin.com/in/tosiicp/"],
    ["Email", "mailto:hello@pavletosic.com"],
    ["CV", `${SITE}/pavle-tosic-cv.pdf`],
    ["Ask my AI", `${SITE}/chat`],
  ],
};

// ---------- Theme (colors from pavletosic.com) ----------
const THEMES = {
  light: { ink: "#0a0a0a", muted: "#71717a", faint: "#a1a1aa", line: "#e4e4e7", bar: "#a1a1aa", accent: "#00bb7f",
    heroMuted: "#52525b", wash: "rgba(255,255,255,.92)", wash2: "rgba(255,255,255,.45)" },
  dark: { ink: "#fafafa", muted: "#a1a1aa", faint: "#71717a", line: "#27272a", bar: "#71717a", accent: "#00bb7f",
    heroMuted: "#c4c4cc", wash: "rgba(10,10,10,.88)", wash2: "rgba(10,10,10,.35)" },
};
// Hero background: the "film" images from pavletosic.com (src/images/film-*.webp).
const HERO = {};
for (const mode of Object.keys(THEMES))
  HERO[mode] = `data:image/webp;base64,${(await readFile(new URL(`./images/film-${mode}-wide.webp`, import.meta.url))).toString("base64")}`;

// ---------- Helpers ----------
const root = new URL("../", import.meta.url);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
const font = async (f) => (await readFile(new URL(`src/fonts/${f}`, root))).toString("base64");
const F = {};
for (const w of [400, 500]) F[w] = { latin: await font(`inter-${w}.woff2`), ext: await font(`inter-ext-${w}.woff2`) };

// Embed only the weights and subsets a given SVG actually uses.
function fontCss(text, weights) {
  const needsExt = /[Ā-˿]/.test(text);
  return weights
    .flatMap((w) => [
      `@font-face{font-family:I;font-weight:${w};src:url(data:font/woff2;base64,${F[w].latin}) format("woff2");unicode-range:${LATIN}}`,
      needsExt ? `@font-face{font-family:I;font-weight:${w};src:url(data:font/woff2;base64,${F[w].ext}) format("woff2");unicode-range:${LATIN_EXT}}` : "",
    ])
    .join("\n");
}

function svg({ height, css, body, text, weights = [400], hero }, t, mode) {
  const vars = Object.entries(t).map(([k, v]) => `--${k}:${v}`).join(";") + (hero ? `;--img:url(${HERO[mode]})` : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" fill="none">
<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="w"><style><![CDATA[
${fontCss(text, weights)}
*{box-sizing:border-box;margin:0;padding:0}
.w{${vars};font-family:I,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:var(--ink);height:100%;width:100%;-webkit-font-smoothing:antialiased;font-feature-settings:"cv11","ss01"}
.m{color:var(--muted)}.f{color:var(--faint)}
${css}
]]></style>${body}</div></foreignObject></svg>
`;
}

// ---------- Sections ----------
function top() {
  return {
    height: 20,
    text: C.name + C.role + C.place,
    weights: [400, 500],
    css: `.r{display:flex;justify-content:space-between}.r>*{flex:1}.r>:nth-child(2){text-align:center}.r>:last-child{text-align:right}
      b{font-weight:500}@media(max-width:520px){.r>:nth-child(2){display:none}}`,
    body: `<div class="r"><b>${esc(C.name)}</b><span class="m">${esc(C.role)}</span><span class="m">${esc(C.place)}</span></div>`,
  };
}

function main(data) {
  const days = data.days.slice(-365);
  const total = data.total ?? days.reduce((s, d) => s + d.count, 0);
  const nonzero = days.map((d) => d.count).filter(Boolean).sort((a, b) => a - b);
  const cap = Math.max(1, nonzero[Math.floor(nonzero.length * 0.95)] ?? 1); // keep one huge day from flattening the rest
  const bars = days
    .map((d) => {
      const h = d.count ? Math.max(6, Math.round(Math.min(d.count / cap, 1) * 100)) : 0;
      return `<i style="height:${h}%"></i>`;
    })
    .join("");
  const months = [];
  days.forEach((d, i) => {
    if (d.date.endsWith("-01") && i / days.length < 0.97) {
      const label = new Date(d.date + "T00:00:00Z").toLocaleString("en", { month: "short", timeZone: "UTC" });
      months.push(`<span style="left:${((i / days.length) * 100).toFixed(2)}%">${label}</span>`);
    }
  });
  return {
    height: 580,
    hero: true,
    text: C.intro.join(" "),
    weights: [400],
    css: `.w{display:flex;flex-direction:column;justify-content:space-between;padding:0 0 6px}
      .hero{position:relative;height:430px;border-radius:12px;overflow:hidden;background:var(--img) 75% 30%/cover no-repeat}
      .hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,var(--wash) 0%,var(--wash2) 35%,transparent 62%)}
      .i{position:absolute;z-index:1;left:28px;bottom:26px;width:50%;font-size:22px;line-height:29px;letter-spacing:-.015em}
      .i .m{color:var(--heroMuted)}
      @media(max-width:620px){.hero:after{background:linear-gradient(0deg,var(--wash) 0%,var(--wash2) 50%,transparent 85%)}
        .i{left:18px;right:18px;bottom:18px;width:auto;font-size:18px;line-height:24px}}
      .h{display:flex;justify-content:space-between;margin-bottom:12px}
      .b{display:flex;align-items:flex-end;gap:1px;height:64px;border-bottom:1px solid var(--line)}
      .b i{flex:1;background:var(--bar);border-radius:1px 1px 0 0;min-width:0}
      .mo{position:relative;height:20px;margin-top:6px}.mo span{position:absolute;color:var(--muted);font-size:12px}
      @media(max-width:620px){.b{gap:0}.mo span:nth-child(even){display:none}}`,
    body: `<div class="hero"><p class="i">${esc(C.intro[0])} <span class="m">${esc(C.intro[1])}</span></p></div>
      <div><div class="h"><span><b style="font-weight:400">${total.toLocaleString("en")}</b> <span class="m">contributions in the last year</span></span><span class="m">Today</span></div>
      <div class="b">${bars}</div><div class="mo">${months.join("")}</div></div>`,
  };
}

function facts() {
  const rows = C.facts
    .map(([k, v, flag]) => `<div class="r"><span class="m">${esc(k)}</span><span>${flag === "open" ? '<i class="dot"></i>' : ""}${esc(v)}</span></div>`)
    .join("");
  return {
    height: C.facts.length * 28,
    text: C.facts.flat().join(" "),
    weights: [400, 500],
    css: `.r{display:flex;height:28px;align-items:center;border-bottom:1px solid var(--line)}.r>:first-child{width:30%;flex:none}
      .r>:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent);margin-right:8px;vertical-align:1px}
      @media(max-width:520px){.r>:first-child{width:38%}}`,
    body: rows,
  };
}

function heading(left, right) {
  return {
    height: 64,
    text: left + right,
    weights: [400, 500],
    css: `.w{display:flex;align-items:flex-end}.r{display:flex;justify-content:space-between;width:100%;padding-bottom:9px;border-bottom:1px solid var(--line)}b{font-weight:500}`,
    body: `<div class="r"><b>${esc(left)}</b><span class="m">${esc(right)}</span></div>`,
  };
}

function row(name, meta, year) {
  return {
    height: 40,
    text: name + meta + year,
    weights: [400, 500],
    css: `.r{display:flex;align-items:center;height:40px;border-bottom:1px solid var(--line)}
      b{font-weight:500;width:30%;flex:none}.mt{flex:1}.y{color:var(--muted)}.a{color:var(--faint);margin-left:12px;font-family:-apple-system,"Segoe UI",sans-serif}
      @media(max-width:520px){.mt{visibility:hidden}b{width:auto;flex:1}}`,
    body: `<div class="r"><b>${esc(name)}</b><span class="mt m">${esc(meta)}</span><span class="y">${esc(year)}</span><span class="a">→</span></div>`,
  };
}

function more(label) {
  return {
    height: 40,
    text: label,
    css: `.r{display:flex;align-items:center;height:40px}.a{margin-left:6px;font-family:-apple-system,"Segoe UI",sans-serif}`,
    body: `<div class="r m">${esc(label)}<span class="a">→</span></div>`,
  };
}

function link(label) {
  return { height: 20, text: label, css: ``, body: `<span>${esc(label)}</span>` };
}

// ---------- Write files ----------
const data = JSON.parse(await readFile(new URL("data/contributions.json", root), "utf8"));
const assetsDir = new URL("assets/", root);
await rm(assetsDir, { recursive: true, force: true });
await mkdir(assetsDir, { recursive: true });

async function emit(name, section) {
  for (const [mode, t] of Object.entries(THEMES)) await writeFile(new URL(`${name}-${mode}.svg`, assetsDir), svg(section, t, mode));
}

// One full-width block. align="left" floats each image so they stack with no inline gaps.
const pic = (name, alt, height, width = "100%", align = ' align="left"') =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${name}-dark.svg"><img src="assets/${name}-light.svg" alt="${esc(alt)}" width="${width}" height="${height}"${align}></picture>`;

const lines = [];
const add = async (name, section, alt, href) => {
  await emit(name, section);
  const p = pic(name, alt, section.height);
  lines.push(href ? `<a href="${href}">${p}</a>` : p);
};

await add("main", main(data), `${C.intro.join(" ")}`);
await add("about-head", heading("About", "pavletosic.com/about"), "About", `${SITE}/about`);
await add("about", facts(), C.facts.map(([k, v]) => `${k}: ${v}`).join(". "));
await add("work-head", heading("Selected work", `${C.workTotal} case studies`), "Selected work");
for (const [i, [name, meta, year, slug]] of C.work.entries())
  await add(`work-${i}`, row(name, meta, year), `${name} — ${meta}, ${year}`, `${SITE}/work/${slug}`);
await add("work-more", more(`All ${C.workTotal} case studies on pavletosic.com`), "All case studies", `${SITE}/work`);
lines.push(`<img src="data:null;," width="100%" height="0" align="left" alt="">`);

const share = `${Math.floor(100 / C.links.length)}%`;
const linkPics = [];
for (const [i, [label, href]] of C.links.entries()) {
  await emit(`link-${i}`, link(label));
  linkPics.push(`<a href="${href}">${pic(`link-${i}`, label, 20, share, "")}</a>`);
}
lines.push(`<br>\n<p>${linkPics.join("")}</p>`);

await writeFile(
  new URL("README.md", root),
  lines.join("\n") + `\n\n<!-- Generated by src/build.mjs. Edit the content there, not here. Refresh: ./update.sh -->\n`,
);
const files = await readdir(assetsDir);
console.log(`Wrote README.md and ${files.length} SVGs (${data.total} contributions)`);
