import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("source files do not contain mojibake markers in Vietnamese UI text", () => {
  const files = [
    "src/AuthApp.jsx",
    "src/app/lib/api.js",
    "src/components/auth/AdminDashboard.jsx",
  ];

  const mojibakePattern = /Ã.|Ä.|Æ.|â€|áº|á»/;
  const offenders = files.filter((file) => mojibakePattern.test(fs.readFileSync(file, "utf8")));

  assert.deepEqual(offenders, []);
});
