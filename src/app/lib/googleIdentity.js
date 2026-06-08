export const GOOGLE_AUTH_ENDPOINT = "/api/v1/auth/google";
export const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

const googleScriptPromises = new WeakMap();

function createGoogleAuthError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function getGoogleAccountsId(google) {
  return google?.accounts?.id || null;
}

export async function authenticateWithGoogleIdToken(apiRequest, credential) {
  const idToken = typeof credential === "string" ? credential.trim() : "";
  if (!idToken) {
    throw createGoogleAuthError("Google không trả về id_token hợp lệ.");
  }

  return apiRequest(GOOGLE_AUTH_ENDPOINT, {
    method: "POST",
    body: { id_token: idToken },
  });
}

export function initializeGoogleIdentity({ google, clientId, buttonElement, onCredential }) {
  const accountsId = getGoogleAccountsId(google);
  const normalizedClientId = typeof clientId === "string" ? clientId.trim() : "";

  if (!normalizedClientId) {
    throw createGoogleAuthError("Chưa cấu hình VITE_GOOGLE_CLIENT_ID.");
  }

  if (!buttonElement) {
    throw createGoogleAuthError("Không tìm thấy vị trí hiển thị nút Google.");
  }

  if (!accountsId) {
    throw createGoogleAuthError("Không tải được Google Identity Services.");
  }

  buttonElement.innerHTML = "";
  accountsId.initialize({
    client_id: normalizedClientId,
    callback: onCredential,
  });
  accountsId.renderButton(buttonElement, {
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "signin_with",
    width: "100%",
  });

  return accountsId;
}

export function loadGoogleIdentityScript({ document, globalObject } = {}) {
  const doc = document || (typeof window !== "undefined" ? window.document : null);
  const globalRef = globalObject || (typeof window !== "undefined" ? window : null);

  if (!doc || !globalRef) {
    return Promise.reject(createGoogleAuthError("Môi trường hiện tại không hỗ trợ Google Sign-In."));
  }

  if (getGoogleAccountsId(globalRef.google)) {
    return Promise.resolve(globalRef.google);
  }

  const cachedPromise = googleScriptPromises.get(doc);
  if (cachedPromise) {
    return cachedPromise;
  }

  const promise = new Promise((resolve, reject) => {
    const resolveWhenReady = () => {
      if (getGoogleAccountsId(globalRef.google)) {
        resolve(globalRef.google);
        return;
      }

      reject(createGoogleAuthError("Google Identity Services đã tải nhưng chưa sẵn sàng."));
    };

    const existingScript = doc.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`);
    const script = existingScript || doc.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolveWhenReady;
    script.onerror = () => reject(createGoogleAuthError("Không tải được Google Identity Services."));

    if (existingScript) {
      if (getGoogleAccountsId(globalRef.google)) {
        resolveWhenReady();
        return;
      }

      if (typeof script.addEventListener === "function") {
        script.addEventListener("load", resolveWhenReady, { once: true });
        script.addEventListener("error", () => reject(createGoogleAuthError("Không tải được Google Identity Services.")), { once: true });
      }
      return;
    }

    doc.head.appendChild(script);
  }).catch((error) => {
    googleScriptPromises.delete(doc);
    throw error;
  });

  googleScriptPromises.set(doc, promise);
  return promise;
}


