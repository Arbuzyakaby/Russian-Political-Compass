"use strict";
/* Packaging for Pages. Source files remain directly runnable without a build. */
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { transformSync } = require("esbuild");
const root = path.resolve(__dirname, "..");
const out = path.resolve(root, "dist");
// Only the known generated directory may be replaced, never an arbitrary path.
if(path.dirname(out) !== root || path.basename(out) !== "dist") throw new Error("Invalid release directory");
if(fs.existsSync(out)) fs.rmSync(out, { recursive:true, force:true });
fs.mkdirSync(out, { recursive:true });
for(const dir of ["css", "js", "assets"]) fs.mkdirSync(path.join(out, dir), { recursive:true });
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const styles = [...new Set(Array.from(html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(css\/[^"]+)"[^>]*>/g), m => m[1]))];
const scripts = Array.from(html.matchAll(/<script src="(js\/[^"]+)"[^>]*><\/script>/g), m => m[1]);
const boundary = scripts.indexOf("js/welcome-boot.js") + 1;
if(boundary < 2 || scripts.at(-1) !== "js/app.js") throw new Error("Unexpected script entrypoints");
for(const file of ["js/party-model.js","js/party-builder.js","js/party-election.js","js/party-templates.js","js/party-campaign.js","js/i18n-party.js","js/tisza.js"]){
  if(!scripts.includes(file)) throw new Error("Missing 4.0 module: " + file);
}
for(const file of ["css/party.css","css/tisza.css"]){
  if(!styles.includes(file)) throw new Error("Missing 4.0 stylesheet: " + file);
}
function writeAsset(source, prefix, loader){
  const code = transformSync(source, { loader, minify:true, target:"es2020", legalComments:"none" }).code;
  const hash = createHash("sha256").update(code).digest("hex").slice(0,12);
  const name = prefix + "." + hash + "." + loader;
  fs.writeFileSync(path.join(out, name), code);
  return name;
}
function bundle(files, prefix, tail = ""){
  const source = files.map(file => fs.readFileSync(path.join(root, file), "utf8")).join("\n;\n") + tail;
  return writeAsset(source, prefix, "js");
}
// CSS uses the same css/ location, keeping relative image URLs unchanged.
const styleAsset = writeAsset(styles.map(file => fs.readFileSync(path.join(root, file), "utf8")).join("\n"), "css/site", "css");
const appAsset = bundle(scripts.slice(boundary), "js/site");
// Give the welcome/header a paint before downloading and executing analytics.
const loader = ';requestAnimationFrame(function(){requestAnimationFrame(function(){var s=document.createElement("script");s.src=' + JSON.stringify(appAsset) + ';s.fetchPriority="low";document.body.appendChild(s);});});';
const shellAsset = bundle(scripts.slice(1, boundary), "js/shell", loader);
fs.copyFileSync(path.join(root, "js/theme-boot.js"), path.join(out, "js/theme-boot.js"));
html = html.replace(/<noscript>\s*<link[^>]+href="css\/[^\"]+"[^>]*>\s*<\/noscript>/g, "");
let styleInserted = false;
html = html.replace(/<link[^>]+rel="stylesheet"[^>]+href="css\/[^\"]+"[^>]*>/g, () => {
  if(styleInserted) return "";
  styleInserted = true;
  return '<link rel="stylesheet" href="' + styleAsset + '">';
});
let scriptsInserted = false;
html = html.replace(/<script src="js\/([^\"]+)"[^>]*><\/script>/g, (tag, name) => {
  if(name === "theme-boot.js") return tag;
  if(scriptsInserted) return "";
  scriptsInserted = true;
  return '<script src="' + shellAsset + '" defer fetchpriority="high"></script>';
});
html = html.replace('</head>', '<link rel="preload" as="script" href="' + shellAsset + '" fetchpriority="high">\n</head>');
// HTML comments are development notes; preserve conditional comments if added.
html = html.replace(/<!--(?!\[if)[\s\S]*?-->/g, "").replace(/\n[\t ]*\n+/g, "\n");
fs.writeFileSync(path.join(out, "index.html"), html);
fs.cpSync(path.join(root, "assets"), path.join(out, "assets"), { recursive:true });
for(const name of ["robots.txt", "sitemap.xml", "manifest.json", "CNAME", "LICENSE"]){
  fs.copyFileSync(path.join(root, name), path.join(out, name));
}
fs.writeFileSync(path.join(out, ".nojekyll"), "");
console.log(`Packaged ${styles.length} stylesheets and ${scripts.length} scripts into ${out}`);
