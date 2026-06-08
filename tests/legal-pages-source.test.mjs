import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("auth app exposes public privacy policy and terms pages", () => {
  const authApp = fs.readFileSync("src/AuthApp.jsx", "utf8");

  assert.ok(fs.existsSync("src/pages/PrivacyPolicy.jsx"));
  assert.ok(fs.existsSync("src/pages/TermsOfService.jsx"));
  assert.ok(authApp.includes('import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";'));
  assert.ok(authApp.includes('import TermsOfService from "./pages/TermsOfService.jsx";'));
  assert.ok(authApp.includes('pathname === "/privacy-policy"'));
  assert.ok(authApp.includes('pathname === "/terms-of-service"'));

  const privacyPage = fs.readFileSync("src/pages/PrivacyPolicy.jsx", "utf8");
  const termsPage = fs.readFileSync("src/pages/TermsOfService.jsx", "utf8");
  assert.match(privacyPage, /Chính sách bảo mật/);
  assert.match(termsPage, /Điều khoản dịch vụ/);
});
