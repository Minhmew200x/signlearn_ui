import test from "node:test";
import assert from "node:assert/strict";

import { brandTheme, brandRing, brandButton } from "../src/app/lib/brandTheme.js";

test("brand theme exposes the approved blue amber white palette", () => {
  assert.equal(brandTheme.primary, "blue-600");
  assert.equal(brandTheme.accent, "amber-500");
  assert.match(brandButton.primary, /bg-blue-600/);
  assert.match(brandRing.focus, /ring-blue-200/);
});
