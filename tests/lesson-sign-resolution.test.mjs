import test from "node:test";
import assert from "node:assert/strict";

import { resolveSignInputs, buildLessonSignPayload } from "../src/app/lib/signResolver.js";

test("resolveSignInputs maps exact slugs and labels to backend sign slugs", () => {
  const signs = [
    { slug: "cham-soc-suc-khoe", label: "cham soc suc khoe" },
    { slug: "kham-benh", label: "Kham benh" },
    { slug: "benh-nhan-active", label: "Benh nhan" },
  ];

  const result = resolveSignInputs(" cham-soc-suc-khoe, Kham benh, benh nhan ", signs);

  assert.deepEqual(result.signSlugs, ["cham-soc-suc-khoe", "kham-benh", "benh-nhan-active"]);
  assert.deepEqual(result.unknownInputs, []);
});

test("resolveSignInputs dedupes inputs and reports unknown values", () => {
  const signs = [{ slug: "ai-cho", label: "ai cho" }];

  const result = resolveSignInputs(["Ai Cho", "ai-cho", "missing-sign"], signs);

  assert.deepEqual(result.signSlugs, ["ai-cho"]);
  assert.deepEqual(result.unknownInputs, ["missing-sign"]);
});

test("buildLessonSignPayload always sends canonical sign_slugs array", () => {
  const payload = buildLessonSignPayload(["cham soc suc khoe"], [
    { slug: "cham-soc-suc-khoe", label: "Cham soc suc khoe" },
  ]);

  assert.deepEqual(payload, {
    item_type: "sign",
    sign_slugs: ["cham-soc-suc-khoe"],
  });
});
