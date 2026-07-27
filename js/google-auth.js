/*
 * google-auth.js
 * Google Identity Services を使用したGoogle認証処理
 *
 * Step7.0.1ではDrive API用アクセストークンの取得・解除のみを担当する。
 * Driveへの保存・復元処理は含めない。
 */

const GOOGLE_OAUTH_CLIENT_ID = "532733057339-sj27dvhm33bqpb5pib4kl24s1k77e2p7.apps.googleusercontent.com";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_SCOPE_GRANTED_KEY = "work_timer_google_scope_granted";

const googleAuthState = {
  tokenClient: null,
  accessToken: "",
  expiresAt: 0,
  status: "初期化待ち",
  lastAuthMs: 0,
  lastError: "",
  initializeAttempts: 0
};

function isGoogleConnected() {
  return !!googleAuthState.accessToken && Date.now() < googleAuthState.expiresAt;
}

function getGoogleAccessToken() {
  return isGoogleConnected() ? googleAuthState.accessToken : "";
}

function googleAuthPerformanceText() {
  if (!googleAuthState.lastAuthMs) return "未実行";
  return `${googleAuthState.lastAuthMs.toFixed(2)}ms`;
}

function googleAuthStatusText() {
  if (isGoogleConnected()) return "接続済み";
  return googleAuthState.status || "未接続";
}

function renderGoogleAuth() {
  const connected = isGoogleConnected();
  const status = $("googleAuthStatus");
  const connectButton = $("googleConnectBtn");
  const disconnectButton = $("googleDisconnectBtn");
  const message = $("googleAuthMessage");

  if (status) {
    status.textContent = connected ? "接続済み" : googleAuthStatusText();
    status.dataset.connected = String(connected);
  }
  if (connectButton) {
    connectButton.disabled = !googleAuthState.tokenClient;
    connectButton.textContent = connected ? "Googleへ再接続" : "Googleに接続";
  }
  if (disconnectButton) disconnectButton.hidden = !connected;
  if (message) message.textContent = googleAuthState.lastError || "";

  if ($("developerGoogleStatus")) $("developerGoogleStatus").textContent = googleAuthStatusText();
  if ($("developerGoogleAuthTime")) $("developerGoogleAuthTime").textContent = googleAuthPerformanceText();
}

function initializeGoogleAuth() {
  if (googleAuthState.tokenClient) {
    renderGoogleAuth();
    return true;
  }

  if (!window.google?.accounts?.oauth2) {
    googleAuthState.initializeAttempts += 1;
    if (googleAuthState.initializeAttempts >= 80) {
      googleAuthState.status = "認証ライブラリ読込失敗";
      googleAuthState.lastError = "Google認証ライブラリを読み込めませんでした。通信状態やコンテンツブロッカーを確認してください。";
      renderGoogleAuth();
      return false;
    }
    googleAuthState.status = "Google認証ライブラリ読込中";
    renderGoogleAuth();
    setTimeout(initializeGoogleAuth, 150);
    return false;
  }

  googleAuthState.tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    scope: GOOGLE_DRIVE_SCOPE,
    callback: () => {}
  });
  googleAuthState.initializeAttempts = 0;
  googleAuthState.status = "未接続";
  googleAuthState.lastError = "";
  renderGoogleAuth();
  return true;
}

function connectGoogle() {
  if (!initializeGoogleAuth() || !googleAuthState.tokenClient) {
    googleAuthState.lastError = "Google認証ライブラリを読み込めませんでした。通信状態を確認してください。";
    renderGoogleAuth();
    return;
  }

  const startedAt = performance.now();
  googleAuthState.status = "認証中";
  googleAuthState.lastError = "";
  renderGoogleAuth();

  googleAuthState.tokenClient.callback = response => {
    googleAuthState.lastAuthMs = performance.now() - startedAt;

    if (response?.error) {
      googleAuthState.accessToken = "";
      googleAuthState.expiresAt = 0;
      googleAuthState.status = "認証失敗";
      googleAuthState.lastError = response.error_description || response.error || "Google認証に失敗しました。";
      console.error("Google OAuth error", response);
      renderGoogleAuth();
      return;
    }

    googleAuthState.accessToken = response.access_token || "";
    const expiresInSeconds = Number(response.expires_in) || 0;
    googleAuthState.expiresAt = Date.now() + Math.max(0, expiresInSeconds - 30) * 1000;
    googleAuthState.status = googleAuthState.accessToken ? "接続済み" : "認証失敗";
    googleAuthState.lastError = googleAuthState.accessToken ? "" : "アクセストークンを取得できませんでした。";
    if (googleAuthState.accessToken) localStorage.setItem(GOOGLE_SCOPE_GRANTED_KEY, "true");

    console.log(`[Google認証] ${googleAuthState.status} / ${googleAuthState.lastAuthMs.toFixed(2)} ms`);
    renderGoogleAuth();
  };

  googleAuthState.tokenClient.error_callback = error => {
    googleAuthState.lastAuthMs = performance.now() - startedAt;
    googleAuthState.accessToken = "";
    googleAuthState.expiresAt = 0;
    googleAuthState.status = error?.type === "popup_closed" ? "未接続" : "認証失敗";
    googleAuthState.lastError = error?.type === "popup_closed"
      ? "Google認証画面が閉じられました。"
      : `Google認証を開始できませんでした${error?.type ? `（${error.type}）` : ""}。`;
    console.error("Google OAuth popup error", error);
    renderGoogleAuth();
  };

  const scopeWasGranted = localStorage.getItem(GOOGLE_SCOPE_GRANTED_KEY) === "true";
  googleAuthState.tokenClient.requestAccessToken({
    prompt: scopeWasGranted ? "" : "consent"
  });
}

function disconnectGoogle() {
  const token = googleAuthState.accessToken;
  const finish = () => {
    googleAuthState.accessToken = "";
    googleAuthState.expiresAt = 0;
    googleAuthState.status = "未接続";
    googleAuthState.lastError = "";
    localStorage.removeItem(GOOGLE_SCOPE_GRANTED_KEY);
    renderGoogleAuth();
  };

  if (token && window.google?.accounts?.oauth2?.revoke) {
    google.accounts.oauth2.revoke(token, finish);
  } else {
    finish();
  }
}
