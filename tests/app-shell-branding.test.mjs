import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("app shell uses the uploaded logo asset and removes the decorative background", () => {
  const appShell = fs.readFileSync("src/components/app/AppShell.jsx", "utf8");
  const globalCss = fs.readFileSync("src/index.css", "utf8");
  const html = fs.readFileSync("index.html", "utf8");

  assert.match(appShell, /from\s+"\.\.\/\.\.\/app\/assets\/logo\.png"/);
  assert.match(appShell, /<img[^>]+src=\{logo\}[^>]+alt="Signlearn"/);
  assert.doesNotMatch(appShell, /radial-gradient|linear-gradient/);
  assert.doesNotMatch(globalCss, /radial-gradient|linear-gradient/);
  assert.match(html, /<link rel="icon" type="image\/png" href="\/src\/app\/assets\/logo\.png" \/>/);
});
