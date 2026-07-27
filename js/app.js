/*
 * app.js
 * 作業タイマーのメイン処理
 *
 * バージョン情報: js/version.js
 * 固定設定値: js/constants.js
 * 汎用処理: js/utils.js
 * 保存・読込処理: js/storage.js
 * 項目管理処理: js/items.js
 * タイマー処理: js/timer.js
 * パネル処理: js/panel.js
 * ログ処理: js/logs.js
 * Google認証処理: js/google-auth.js
 * 一部の画面描画処理: js/render.js
 * 更新履歴: CHANGELOG.md
 */

    let lastMigrationSummary = "未実行";

    const startupPerformance = {
      active: true,
      startedAt: performance.now(),
      phases: [],
      totalMs: 0
    };

    const loadingPerformance = {
      ready: false,
      navigation: {},
      resources: [],
      totalMs: 0
    };

    function shortResourceName(url) {
      try {
        const parsed = new URL(url, location.href);
        return parsed.pathname.split("/").filter(Boolean).slice(-2).join("/") || parsed.pathname || "document";
      } catch {
        return String(url || "不明");
      }
    }

    function collectLoadingPerformance() {
      const navigation = performance.getEntriesByType("navigation")[0];
      if (navigation) {
        loadingPerformance.navigation = {
          dnsMs: Math.max(0, navigation.domainLookupEnd - navigation.domainLookupStart),
          connectMs: Math.max(0, navigation.connectEnd - navigation.connectStart),
          requestMs: Math.max(0, navigation.responseStart - navigation.requestStart),
          responseMs: Math.max(0, navigation.responseEnd - navigation.responseStart),
          domContentLoadedMs: navigation.domContentLoadedEventEnd,
          loadMs: navigation.loadEventEnd,
          transferBytes: navigation.transferSize || 0
        };
        loadingPerformance.totalMs = navigation.loadEventEnd || performance.now();
      }

      loadingPerformance.resources = performance.getEntriesByType("resource")
        .filter(entry => entry.initiatorType === "script" || entry.initiatorType === "link")
        .map(entry => ({
          resource: shortResourceName(entry.name),
          type: entry.initiatorType === "script" ? "JS" : "CSS",
          durationMs: entry.duration,
          transferBytes: entry.transferSize || 0,
          cached: (entry.transferSize || 0) === 0
        }))
        .sort((a, b) => b.durationMs - a.durationMs);

      loadingPerformance.ready = true;
      console.groupCollapsed(`[読込計測] ${APP_VERSION} / load ${loadingPerformance.totalMs.toFixed(2)} ms`);
      if (navigation) {
        console.table([{
          項目: "HTML・ページ読込",
          DNSms: Number(loadingPerformance.navigation.dnsMs.toFixed(2)),
          接続ms: Number(loadingPerformance.navigation.connectMs.toFixed(2)),
          応答待ちms: Number(loadingPerformance.navigation.requestMs.toFixed(2)),
          HTML受信ms: Number(loadingPerformance.navigation.responseMs.toFixed(2)),
          DOMContentLoadedms: Number(loadingPerformance.navigation.domContentLoadedMs.toFixed(2)),
          Loadms: Number(loadingPerformance.navigation.loadMs.toFixed(2)),
          転送Bytes: loadingPerformance.navigation.transferBytes
        }]);
      }
      console.table(loadingPerformance.resources.map(entry => ({
        ファイル: entry.resource,
        種類: entry.type,
        時間ms: Number(entry.durationMs.toFixed(2)),
        転送Bytes: entry.transferBytes,
        キャッシュ: entry.cached ? "利用の可能性" : "ネットワーク取得"
      })));
      console.groupEnd();
    }

    function loadingPerformanceText() {
      if (!loadingPerformance.ready) return "loadイベント待ち";
      const nav = loadingPerformance.navigation;
      const resources = loadingPerformance.resources
        .map(entry => `${entry.resource} ${entry.durationMs.toFixed(2)}ms${entry.cached ? " [cache]" : ""}`)
        .join(", ");
      return `${loadingPerformance.totalMs.toFixed(2)}ms (DOMContentLoaded ${Number(nav.domContentLoadedMs || 0).toFixed(2)}ms, load ${Number(nav.loadMs || 0).toFixed(2)}ms${resources ? `; ${resources}` : ""})`;
    }

    function measureStartupPhase(label, callback) {
      const startedAt = performance.now();
      const result = callback();
      startupPerformance.phases.push({ label, ms: performance.now() - startedAt });
      return result;
    }

    function finishStartupPerformance() {
      startupPerformance.totalMs = performance.now() - startupPerformance.startedAt;
      startupPerformance.active = false;
      const rows = startupPerformance.phases.map(phase => ({
        処理: phase.label,
        時間ms: Number(phase.ms.toFixed(2))
      }));
      rows.push({ 処理: "起動全体", 時間ms: Number(startupPerformance.totalMs.toFixed(2)) });
      console.groupCollapsed(`[起動計測] ${APP_VERSION} / ${startupPerformance.totalMs.toFixed(2)} ms`);
      console.table(rows);
      console.log(`記録: ${state.logs.length}件 / パネル: ${state.panels.length}件 / 項目1: ${state.items.length}件 / 項目2: ${(state.item2s || []).length}件`);
      console.groupEnd();
    }

    function startupPerformanceText() {
      if (!startupPerformance.totalMs) return "未計測";
      const details = startupPerformance.phases
        .map(phase => `${phase.label} ${phase.ms.toFixed(2)}ms`)
        .join(", ");
      return `${startupPerformance.totalMs.toFixed(2)}ms (${details})`;
    }

    const DEVICE_ID = measureStartupPhase("端末IDの取得", getDeviceId);

    let state = measureStartupPhase("保存データの読込・正規化", loadState);
    let developerModeEnabled = localStorage.getItem(DEVELOPER_MODE_KEY) === "true";
    function getDeviceId() {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = `D-${timestampIdPart()}`;
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    }

    function createRecordId(startIso) {
      const startDate = startIso ? new Date(startIso) : new Date();
      const safeDate = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
      return `${DEVICE_ID}-${timestampIdPart(safeDate)}`;
    }

    function toggleDeveloperMode() {
      developerModeEnabled = !developerModeEnabled;
      localStorage.setItem(DEVELOPER_MODE_KEY, String(developerModeEnabled));
      renderAll();
    }

    async function copyDeveloperInfo() {
      const info = [
        `App Version: ${APP_VERSION}`,
        `Data Format Version: ${DATA_FORMAT_VERSION}`,
        `Device ID: ${DEVICE_ID}`,
        `Logs: ${state.logs.length}`,
        `Panels: ${state.panels.length}`,
        `Storage Key: ${STORAGE_KEY}`,
        `Converter: v1 -> v${DATA_FORMAT_VERSION}`,
        `Last Migration: ${lastMigrationSummary}`,
        `Startup Performance: ${startupPerformanceText()}`,
        `Loading Performance: ${loadingPerformanceText()}`,
        `Google Auth: ${googleAuthStatusText()} (${googleAuthPerformanceText()})`,
        `User Agent: ${navigator.userAgent}`
      ].join("\n");
      try {
        await navigator.clipboard.writeText(info);
        if ($("developerStatus")) $("developerStatus").textContent = "開発情報をコピーしました。";
      } catch {
        if ($("developerStatus")) $("developerStatus").textContent = "コピーできませんでした。";
      }
    }


    function removeCompletedPanels() {
      // v39.6: 作業パネルは削除ボタンを押した時だけ消える。
      // 旧バージョンで completed=true になっていたパネルも作業パネルとして残す。
      state.panels.forEach(panel => {
        if (panel.completed && !panel.running) panel.completed = false;
      });
      if (!state.panels.length) state.panels.push(newPanel(true));
    }


    
    function toggleSection(kind) {
      if (!state.panelGroups) state.panelGroups = { workCollapsed:false, templateCollapsed:false, completedCollapsed:true, logsCollapsed:false, summaryCollapsed:false, exportCollapsed:false };
      const keyMap = { logs: "logsCollapsed", summary: "summaryCollapsed", export: "exportCollapsed" };
      const key = keyMap[kind];
      if (!key) return;
      state.panelGroups[key] = !state.panelGroups[key];
      saveState();
      updateSectionCollapse();
    }

    function updateSectionCollapse() {
      if (!state.panelGroups) state.panelGroups = { workCollapsed:false, templateCollapsed:false, completedCollapsed:true, logsCollapsed:false, summaryCollapsed:false, exportCollapsed:false };
      const sections = [
        ["logs", "logsCollapsed"],
        ["summary", "summaryCollapsed"],
        ["export", "exportCollapsed"]
      ];
      sections.forEach(([kind, key]) => {
        const collapsed = !!state.panelGroups[key];
        const card = document.querySelector(`[data-section-card="${kind}"]`);
        const mark = $(`${kind}ToggleMark`);
        if (card) card.classList.toggle("collapsed", collapsed);
        if (mark) mark.textContent = collapsed ? "▶" : "▼";
      });
    }


    function exportJsonBackup() {
      saveState();
      const exportedAt = nowIso();
      const backup = {
        backupType: "work-timer-full-backup",
        dataFormatVersion: DATA_FORMAT_VERSION,
        appVersion: APP_VERSION,
        exportedAt,
        deviceId: DEVICE_ID,
        storageKey: STORAGE_KEY,
        data: JSON.parse(JSON.stringify(state))
      };
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = exportedAt.slice(0, 10).replaceAll("-", "");
      a.href = url;
      a.download = `作業タイマー_バックアップ_${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    function formatImportDate(value) {
      if (!value) return "不明";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function cloneJson(value) {
      return JSON.parse(JSON.stringify(value));
    }

        function convertBackupData(sourceData, fromVersion, sourceDeviceId) {
      let version = fromVersion;
      let data = cloneJson(sourceData);
      const steps = [];
      while (version < DATA_FORMAT_VERSION) {
        if (version === 1) {
          data = migrateDataV1ToV2(data, sourceDeviceId);
          steps.push("v1 → v2");
          version = 2;
          continue;
        }
        throw new Error(`データ形式 v${version} からの変換処理がありません。`);
      }
      data.dataFormatVersion = DATA_FORMAT_VERSION;
      return { data, fromVersion, toVersion: version, steps };
    }

    function validateJsonBackup(backup) {
      if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
        throw new Error("JSONバックアップの形式ではありません。");
      }
      if (backup.backupType !== "work-timer-full-backup") {
        throw new Error("作業タイマーのバックアップファイルではありません。");
      }
      const formatVersion = Number(backup.dataFormatVersion);
      if (!Number.isInteger(formatVersion) || formatVersion < 1) {
        throw new Error("データ形式のバージョンを確認できません。");
      }
      if (formatVersion > DATA_FORMAT_VERSION) {
        throw new Error(`このバックアップは新しいデータ形式（${formatVersion}）です。\nアプリを更新してから復元してください。`);
      }
      if (!backup.data || typeof backup.data !== "object" || Array.isArray(backup.data)) {
        throw new Error("バックアップ内に復元データがありません。");
      }
      if (!Array.isArray(backup.data.logs) || !Array.isArray(backup.data.panels)) {
        throw new Error("記録または作業パネルのデータが壊れています。");
      }
      return formatVersion;
    }

    async function importJsonBackupFile(file) {
      if (!file) return;
      try {
        const text = await file.text();
        let backup;
        try {
          backup = JSON.parse(text);
        } catch {
          throw new Error("JSONファイルを読み取れませんでした。ファイルが壊れていないか確認してください。");
        }

        const formatVersion = validateJsonBackup(backup);
        const logCount = backup.data.logs.length;
        const panelCount = backup.data.panels.length;
        const exportedAt = formatImportDate(backup.exportedAt);
        const sourceVersion = backup.appVersion || "不明";
        const conversionText = formatVersion < DATA_FORMAT_VERSION ? `v${formatVersion} → v${DATA_FORMAT_VERSION}へ自動変換` : "変換不要";
        const message = [
          "現在のデータを、このバックアップの内容で置き換えます。",
          "この操作は元に戻せません。必要なら先にJSONバックアップを保存してください。",
          "",
          `バックアップ作成日時：${exportedAt}`,
          `アプリバージョン：${sourceVersion}`,
          `データ形式：${formatVersion}（${conversionText}）`,
          `記録：${logCount}件`,
          `作業パネル：${panelCount}件`,
          "",
          "復元しますか？"
        ].join("\n");
        if (!confirm(message)) return;

        const conversion = convertBackupData(backup.data, formatVersion, backup.deviceId);
        lastMigrationSummary = conversion.steps.length ? `${conversion.steps.join(", ")} 完了` : "変換不要";
        const restored = normalizeState(conversion.data);
        restored.deviceId = DEVICE_ID;
        state = restored;
        saveState();
        renderAll();
        if ($("dateFilter")) $("dateFilter").value = state.currentDate || dateKey();
        if ($("monthFilter")) $("monthFilter").value = monthKey();
        alert(`JSONバックアップを復元しました。\n変換：${lastMigrationSummary}\n記録：${state.logs.length}件\n作業パネル：${state.panels.length}件`);
      } catch (error) {
        console.error(error);
        alert(`JSONバックアップを復元できませんでした。\n\n${error?.message || "不明なエラー"}`);
      } finally {
        const input = $("jsonImportFile");
        if (input) input.value = "";
      }
    }

    $("addPanelBtn").addEventListener("click", () => addPanel(true));
    $("openItem1DialogBtn").addEventListener("click", () => openItemDialog("item1"));
    $("openItem2DialogBtn").addEventListener("click", () => openItemDialog("item2"));
    $("closeDialogBtn").addEventListener("click", () => $("itemDialog").close());
    $("closeDialogBtnItem1").addEventListener("click", () => $("itemDialog").close());
    $("addItemBtn").addEventListener("click", addItemFromDialog);
    $("addItem2Btn").addEventListener("click", addItem2FromDialog);
    $("newItemKana").addEventListener("keydown", e => { if(e.key==="Enter") addItemFromDialog(); });
    $("newItem2Kana").addEventListener("keydown", e => { if(e.key==="Enter") addItem2FromDialog(); });
    $("saveLogEditBtn").addEventListener("click", saveLogEdit);
    $("cancelLogEditBtn").addEventListener("click", () => $("logEditDialog").close());
    $("todayBtn").addEventListener("click", () => { $("dateFilter").value=dateKey(); renderLogs(); renderSummary(); });
    $("dateFilter").addEventListener("change", () => { renderLogs(); renderSummary(); });
    $("monthCsvBtn").addEventListener("click", exportMonthCsv);
    $("jsonExportBtn").addEventListener("click", exportJsonBackup);
    $("jsonImportBtn").addEventListener("click", () => $("jsonImportFile").click());
    $("jsonImportFile").addEventListener("change", e => importJsonBackupFile(e.target.files?.[0]));
    $("clearMonthBtn").addEventListener("click", clearMonthLogs);
    $("monthFilter").addEventListener("change", () => saveState());
    $("developerModeBtn").addEventListener("click", toggleDeveloperMode);
    $("copyDeveloperInfoBtn").addEventListener("click", copyDeveloperInfo);
    $("googleConnectBtn").addEventListener("click", connectGoogle);
    $("googleDisconnectBtn").addEventListener("click", disconnectGoogle);

    document.body.addEventListener("change", e => {
      const el=e.target;
      if(el.dataset.selectPanel) changePanelItem(el.dataset.selectPanel, el.value);
      if(el.dataset.select2Panel) changePanelItem2(el.dataset.select2Panel, el.value);
      if(el.dataset.startTime) updatePanelTime(el.dataset.startTime, "start", el.value);
      if(el.dataset.endTime) updatePanelTime(el.dataset.endTime, "end", el.value);
      if(el.dataset.timerPanel) changePanelTimer(el.dataset.timerPanel, el.value);
    });
    document.body.addEventListener("input", e => { const el=e.target; if(el.dataset.customName) changeCustomName(el.dataset.customName, el.value); });
    document.body.addEventListener("keydown", e => {
      const el = e.target;
      if (el?.dataset?.panelTitleInput && e.key === "Enter") {
        e.preventDefault();
        savePanelTitle(el.dataset.panelTitleInput);
      }
      if (el?.dataset?.panelTitleInput && e.key === "Escape") {
        e.preventDefault();
        cancelPanelTitleEdit(el.dataset.panelTitleInput);
      }
    });
    document.body.addEventListener("focusout", e => {
      const el = e.target;
      if (el?.dataset?.panelTitleInput) {
        savePanelTitle(el.dataset.panelTitleInput);
      }
    });
    document.body.addEventListener("click", e => {
      if (e.target.closest("[data-panel-title-input]")) {
        e.stopPropagation();
        return;
      }

      const panelToggleTarget = e.target.closest("[data-toggle-panel]");
      if (panelToggleTarget) {
        e.stopPropagation();
        togglePanel(panelToggleTarget.dataset.togglePanel);
        return;
      }

      const titleTarget = e.target.closest("[data-edit-panel-title]");
      if (titleTarget) {
        e.stopPropagation();
        editPanelTitle(titleTarget.dataset.editPanelTitle);
        return;
      }

      const sectionToggle = e.target.closest("[data-toggle-section]");
      if (sectionToggle) {
        toggleSection(sectionToggle.dataset.toggleSection);
        return;
      }

      const button = e.target.closest("button");
      if (button) {
        const toggleGroup = button.closest("[data-toggle-panel-group]");
        if (toggleGroup) {
          togglePanelGroup(toggleGroup.dataset.togglePanelGroup);
          return;
        }

        if(button.dataset.start) { startPanel(button.dataset.start); return; }
        if(button.dataset.stop) { stopPanel(button.dataset.stop); return; }
        if(button.dataset.resetPanel) { resetPanel(button.dataset.resetPanel); return; }
        if(button.dataset.completePanel) { completePanel(button.dataset.completePanel); return; }
        if(button.dataset.deletePanel) { deletePanel(button.dataset.deletePanel); return; }
        if(button.dataset.editLog) { editLog(button.dataset.editLog); return; }
        if(button.dataset.deleteLog) { deleteLog(button.dataset.deleteLog); return; }
        if(button.dataset.editItem) { editItem(button.dataset.editItem); return; }
        if(button.dataset.deleteItem) { deleteItem(button.dataset.deleteItem); return; }
        if(button.dataset.editItem2) { editItem2(button.dataset.editItem2); return; }
        if(button.dataset.deleteItem2) { deleteItem2(button.dataset.deleteItem2); return; }
        return;
      }

      const headTarget = e.target.closest("[data-panel-head-toggle]");
      if (headTarget) {
        togglePanel(headTarget.dataset.panelHeadToggle);
        return;
      }
    });


    function initializeApp() {
      // v39.4.2: 画面更新時は日付と年月の初期表示を今日に合わせる。
      // dateFilter は今日、monthFilter は renderMonthFilter() 内で当月が選択される。
      const today = dateKey();
      if ($("dateFilter")) $("dateFilter").value = today;
      const migratedCount = measureStartupPhase("旧データ変換", migrateLegacyLogs);
      measureStartupPhase("初回画面描画", renderAll);
      if ($("monthFilter")) $("monthFilter").value = monthKey();
      finishStartupPerformance();
      initializeGoogleAuth();
      if (migratedCount > 0) {
        alert(`古い記録を${migratedCount}件更新しました。\n\nrecordId\ndeviceId\nupdatedAt\n\nを追加しました。`);
      }
    }

    initializeApp();

    window.addEventListener("load", () => {
      // loadEventEnd が記録された後に取得する。アプリの初期表示は待たせない。
      setTimeout(collectLoadingPerformance, 0);
    }, { once: true });

    startTimerTicker();
