import test from "node:test";
import assert from "node:assert/strict";

import { collectSignSlugOptions } from "../src/app/lib/adminSignSlugs.js";

test("collectSignSlugOptions merges API signs with vocab catalog entries", () => {
  const options = collectSignSlugOptions(
    [
      { slug: "xin-chao", title_vi: "Xin chao" },
      { slug: "cam-on" },
      { slug: "" },
    ],
    [
      { slug: "cam-on", label: "Cam on" },
      { slug: "tam-biet", label: "Tam biet" },
      { slug: "xin-chao", label: "Xin chao tu vocab" },
    ],
  );

  assert.deepEqual(
    options,
    [
      { slug: "cam-on", label: "Cam on" },
      { slug: "tam-biet", label: "Tam biet" },
      { slug: "xin-chao", label: "Xin chao" },
    ],
  );
});
