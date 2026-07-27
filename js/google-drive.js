/*
 * google-drive.js
 * Step7.0.2: Google Driveへの手動JSONバックアップ保存
 */

const GOOGLE_DRIVE_BACKUP_FILE_NAME = "作業タイマー_クラウドバックアップ.json";
const GOOGLE_DRIVE_FILE_ID_KEY = "work_timer_google_drive_backup_file_id";
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

const googleDriveState = {
  status: "未保存",
  state: "idle",
  lastSaveMs: 0,
  lastSavedAt: "",
  lastError: "",
  fileId: localStorage.getItem(GOOGLE_DRIVE_FILE_ID_KEY) || ""
};

function googleDriveStatusText() {
  if (googleDriveState.state === "success" && googleDriveState.lastSavedAt) {
    return `保存済み（${formatGoogleDriveDate(googleDriveState.lastSavedAt)}）`;
  }
  return googleDriveState.status || "未保存";
}

function googleDrivePerformanceText() {
  return googleDriveState.lastSaveMs ? `${googleDriveState.lastSaveMs.toFixed(2)}ms` : "未実行";
}

function formatGoogleDriveDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日時不明";
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderGoogleDrive() {
  const connected = typeof isGoogleConnected === "function" && isGoogleConnected();
  const button = $("googleDriveSaveBtn");
  const status = $("googleDriveStatus");
  const message = $("googleDriveMessage");

  if (button) {
    button.disabled = !connected || googleDriveState.state === "saving";
    button.textContent = googleDriveState.state === "saving" ? "保存中…" : "Driveへ保存";
  }
  if (status) {
    status.textContent = googleDriveStatusText();
    status.dataset.state = googleDriveState.state;
  }
  if (message) message.textContent = googleDriveState.lastError || "";
  if ($("developerGoogleDriveStatus")) $("developerGoogleDriveStatus").textContent = googleDriveStatusText();
  if ($("developerGoogleDriveTime")) $("developerGoogleDriveTime").textContent = googleDrivePerformanceText();
}

async function googleDriveFetch(url, options = {}) {
  const accessToken = getGoogleAccessToken();
  if (!accessToken) throw new Error("Googleへの接続が切れています。もう一度Googleへ接続してください。");

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });

  if (response.ok) return response;

  let detail = "";
  try {
    const body = await response.json();
    detail = body?.error?.message || "";
  } catch {}

  if (response.status === 401) {
    throw new Error("Google認証の有効期限が切れました。「Googleへ再接続」を押してから保存してください。");
  }
  if (response.status === 403) {
    throw new Error(`Google Driveへの保存が許可されませんでした。${detail ? `\n${detail}` : ""}`);
  }
  throw new Error(`Google Driveとの通信に失敗しました（HTTP ${response.status}）。${detail ? `\n${detail}` : ""}`);
}

async function findGoogleDriveBackupFile() {
  const savedFileId = localStorage.getItem(GOOGLE_DRIVE_FILE_ID_KEY) || googleDriveState.fileId;
  if (savedFileId) return savedFileId;

  const escapedName = GOOGLE_DRIVE_BACKUP_FILE_NAME.replaceAll("'", "\\'");
  const query = `name = '${escapedName}' and trashed = false`;
  const url = `${GOOGLE_DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc&pageSize=10`;
  const response = await googleDriveFetch(url);
  const result = await response.json();
  return result.files?.[0]?.id || "";
}

function createGoogleDriveMultipartBody(metadata, jsonText, boundary) {
  return [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    jsonText,
    `--${boundary}--`,
    ""
  ].join("\r\n");
}

async function uploadGoogleDriveBackup(fileId, backup) {
  const boundary = `work_timer_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const metadata = {
    name: GOOGLE_DRIVE_BACKUP_FILE_NAME,
    mimeType: "application/json",
    appProperties: {
      app: "work-timer",
      backupType: "full-backup"
    }
  };
  const body = createGoogleDriveMultipartBody(metadata, JSON.stringify(backup, null, 2), boundary);
  const url = fileId
    ? `${GOOGLE_DRIVE_UPLOAD_BASE}/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,modifiedTime`
    : `${GOOGLE_DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,modifiedTime`;

  const response = await googleDriveFetch(url, {
    method: fileId ? "PATCH" : "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
  return response.json();
}

async function saveBackupToGoogleDrive() {
  if (googleDriveState.state === "saving") return;
  if (!isGoogleConnected()) {
    googleDriveState.status = "未接続";
    googleDriveState.state = "error";
    googleDriveState.lastError = "先にGoogleへ接続してください。";
    renderGoogleDrive();
    return;
  }
  if (typeof createJsonBackupData !== "function") {
    googleDriveState.status = "保存失敗";
    googleDriveState.state = "error";
    googleDriveState.lastError = "バックアップデータを作成できませんでした。";
    renderGoogleDrive();
    return;
  }

  const startedAt = performance.now();
  googleDriveState.status = "保存中";
  googleDriveState.state = "saving";
  googleDriveState.lastError = "";
  renderGoogleDrive();

  try {
    const backup = createJsonBackupData();
    let fileId = await findGoogleDriveBackupFile();
    let result;
    try {
      result = await uploadGoogleDriveBackup(fileId, backup);
    } catch (error) {
      // 保存済みIDのファイルが削除されていた場合、新規作成を1回だけ試す。
      if (fileId && /HTTP 404/.test(error?.message || "")) {
        localStorage.removeItem(GOOGLE_DRIVE_FILE_ID_KEY);
        fileId = "";
        result = await uploadGoogleDriveBackup("", backup);
      } else {
        throw error;
      }
    }

    googleDriveState.fileId = result.id || fileId;
    if (googleDriveState.fileId) localStorage.setItem(GOOGLE_DRIVE_FILE_ID_KEY, googleDriveState.fileId);
    googleDriveState.lastSavedAt = result.modifiedTime || backup.exportedAt || nowIso();
    googleDriveState.lastSaveMs = performance.now() - startedAt;
    googleDriveState.status = "保存済み";
    googleDriveState.state = "success";
    googleDriveState.lastError = "";
    console.log(`[Google Drive] 保存完了 / ${googleDriveState.lastSaveMs.toFixed(2)} ms / ${googleDriveState.fileId}`);
  } catch (error) {
    googleDriveState.lastSaveMs = performance.now() - startedAt;
    googleDriveState.status = "保存失敗";
    googleDriveState.state = "error";
    googleDriveState.lastError = error?.message || "Google Driveへ保存できませんでした。";
    console.error("Google Drive save error", error);
  } finally {
    renderGoogleDrive();
  }
}
