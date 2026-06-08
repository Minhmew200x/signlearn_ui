import test from "node:test";
import assert from "node:assert/strict";

import {
  GOOGLE_AUTH_ENDPOINT,
  GOOGLE_IDENTITY_SCRIPT_SRC,
  authenticateWithGoogleIdToken,
  initializeGoogleIdentity,
  loadGoogleIdentityScript,
} from "../src/app/lib/googleIdentity.js";

test("authenticateWithGoogleIdToken posts GIS credential as backend id_token", async () => {
  const calls = [];
  const expected = { access_token: "a", refresh_token: "r", user: { id: 1 } };
  const apiRequest = async (path, options) => {
    calls.push([path, options]);
    return expected;
  };

  const result = await authenticateWithGoogleIdToken(apiRequest, "google.jwt.token");

  assert.deepEqual(calls, [[GOOGLE_AUTH_ENDPOINT, { method: "POST", body: { id_token: "google.jwt.token" } }]]);
  assert.equal(result, expected);
});

test("initializeGoogleIdentity wires the configured client id and callback into GIS button rendering", () => {
  const calls = [];
  const buttonElement = { innerHTML: "placeholder" };
  const google = {
    accounts: {
      id: {
        initialize(config) {
          calls.push(["initialize", config]);
        },
        renderButton(element, options) {
          calls.push(["renderButton", element, options]);
        },
      },
    },
  };
  const onCredential = () => {};

  initializeGoogleIdentity({
    google,
    clientId: "frontend-google-client-id",
    buttonElement,
    onCredential,
  });

  assert.equal(buttonElement.innerHTML, "");
  assert.deepEqual(calls[0], [
    "initialize",
    {
      client_id: "frontend-google-client-id",
      callback: onCredential,
    },
  ]);
  assert.deepEqual(calls[1], [
    "renderButton",
    buttonElement,
    {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      width: "100%",
    },
  ]);
});

test("loadGoogleIdentityScript appends the GIS client script and resolves once Google is available", async () => {
  let appendedScript = null;
  const google = { accounts: { id: {} } };
  const globalObject = {};
  const document = {
    querySelector(selector) {
      assert.equal(selector, `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`);
      return null;
    },
    createElement(tag) {
      assert.equal(tag, "script");
      return {
        async: false,
        defer: false,
        src: "",
        onload: null,
        onerror: null,
      };
    },
    head: {
      appendChild(script) {
        appendedScript = script;
        queueMicrotask(() => {
          globalObject.google = google;
          script.onload();
        });
      },
    },
  };

  const result = await loadGoogleIdentityScript({ document, globalObject });

  assert.equal(appendedScript?.src, GOOGLE_IDENTITY_SCRIPT_SRC);
  assert.equal(appendedScript?.async, true);
  assert.equal(appendedScript?.defer, true);
  assert.equal(result, google);
});

