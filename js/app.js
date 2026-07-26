/*
 * app.js
 * 作業タイマーのメイン処理
 *
 * バージョン情報: js/version.js
 * 固定設定値: js/constants.js
 * 汎用処理: js/utils.js
 * 保存・読込処理: js/storage.js
 * タイマー処理: js/timer.js
 * パネル処理: js/panel.js
 * ログ処理: js/logs.js
 * 一部の画面描画処理: js/render.js
 * 更新履歴: CHANGELOG.md
 */

    let lastMigrationSummary = "未実行";

    const DEVICE_ID = getDeviceId();

    let state = loadState();
    let activeItemManageType = "item1";
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
        `User Agent: ${navigator.userAgent}`
      ].join("\n");
      try {
        await navigator.clipboard.writeText(info);
        if ($("developerStatus")) $("developerStatus").textContent = "開発情報をコピーしました。";
      } catch {
        if ($("developerStatus")) $("developerStatus").textContent = "コピーできませんでした。";
      }
    }


        function sortedItems() { return [...state.items].sort((a,b)=>(a.kana||a.name).localeCompare((b.kana||b.name),"ja")); }
    function itemById(id) { return state.items.find(i=>i.id===id); }
    function sortedItem2s() { return [...(state.item2s || [])].sort((a,b)=>(a.kana||a.name).localeCompare((b.kana||b.name),"ja")); }
    function item2ById(id) { return (state.item2s || []).find(i=>i.id===id); }

    function buildItemParts(itemId, item2Id, customName, items = state.items, item2s = state.item2s || []) {
      const item1 = items.find(i => i.id === itemId);
      const item2 = item2s.find(i => i.id === item2Id);
      return {
        item1Name: item1 ? item1.name : "",
        item2Name: item2 ? item2.name : "",
        customName: (customName || "").trim()
      };
    }

    function panelDisplayTitle(panel) {
      const title = (panel.title || "").trim();
      return title || "作業";
    }

    // Step5.1.3: デフォルト見出し「作業」は記録上では空欄として扱う。
    function normalizeRecordTitle(title) {
      const heading = (title || "").trim();
      return heading === "作業" ? "" : heading;
    }

    function buildInfoText(title, item1Name, item2Name, customName) {
      const heading = normalizeRecordTitle(title);
      const part1 = (item1Name || "").trim();
      const part2 = (item2Name || "").trim();
      const free = (customName || "").trim();
      return `${heading}${part1}${part2}${free}`;
    }

    function buildItemName(panel, items = state.items, item2s = state.item2s || []) {
      const parts = buildItemParts(panel.itemId, panel.item2Id, panel.customName, items, item2s);
      // v40.2 Step3.1: 情報は「見出し＋項目1＋項目2＋手入力」を空白なしで結合して表示する。
      // 内部では見出し・項目1・項目2・手入力を別々に保存する。
      return buildInfoText(panelDisplayTitle(panel), parts.item1Name, parts.item2Name, parts.customName);
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













    function createItem(name, kana) { const item={ id:crypto.randomUUID(), name:name.trim(), kana:kana.trim() }; state.items.push(item); return item; }
    function createItem2(name, kana) { const item={ id:crypto.randomUUID(), name:name.trim(), kana:kana.trim() }; if(!Array.isArray(state.item2s)) state.item2s=[]; state.item2s.push(item); return item; }
    function addItemFromDialog() { const name=$("newItemName").value.trim(); const kana=$("newItemKana").value.trim(); if(!name||!kana){ alert("項目1名とふりがなを両方入力してください。"); return; } createItem(name,kana); $("newItemName").value=""; $("newItemKana").value=""; saveState(); renderAll(); }
    function addItem2FromDialog() { const name=$("newItem2Name").value.trim(); const kana=$("newItem2Kana").value.trim(); if(!name||!kana){ alert("項目2名とふりがなを両方入力してください。"); return; } createItem2(name,kana); $("newItem2Name").value=""; $("newItem2Kana").value=""; saveState(); renderAll(); }
    function editItem(id) { const item=itemById(id); if(!item) return; const name=prompt("項目1名", item.name); if(!name||!name.trim()) return; const kana=prompt("ふりがな", item.kana||item.name); if(!kana||!kana.trim()) return; item.name=name.trim(); item.kana=kana.trim(); saveState(); renderAll(); }
    function editItem2(id) { const item=item2ById(id); if(!item) return; const name=prompt("項目2名", item.name); if(!name||!name.trim()) return; const kana=prompt("ふりがな", item.kana||item.name); if(!kana||!kana.trim()) return; item.name=name.trim(); item.kana=kana.trim(); saveState(); renderAll(); }
    function deleteItem(id) { const item=itemById(id); if(!item) return; if(state.panels.some(p=>p.itemId===id && p.running)){ alert("計測中の項目1は削除できません。先に終了してください。"); return; } if(!confirm(`「${item.name}」を項目1のプルダウンから削除しますか？記録名は現在の表示名で残ります。`)) return; state.items=state.items.filter(i=>i.id!==id); state.panels.forEach(p=>{ if(p.itemId===id) p.itemId=null; }); saveState(); renderAll(); }
    function deleteItem2(id) { const item=item2ById(id); if(!item) return; if(!confirm(`「${item.name}」を項目2のプルダウンから削除しますか？`)) return; state.item2s=(state.item2s||[]).filter(i=>i.id!==id); state.panels.forEach(p=>{ if(p.item2Id===id) p.item2Id=null; }); saveState(); renderAll(); }

    function exportCsvFile(logs, filename) {
      const rows = [["日付","項目","開始時間","終了時間","分","recordId","deviceId","updatedAt"]];
      logs.sort((a,b)=>new Date(a.start)-new Date(b.start)).forEach(l=>rows.push([l.date,l.itemName,formatTimeHHMM(l.start),formatTimeHHMM(l.end),Math.round(l.durationMs/60000),l.recordId||"",l.deviceId||"",l.updatedAt||""]));
      const csv = rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8"});
      const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
    }
    function escapeExcelCell(value) { return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
    function exportExcelFile(logs, filename) {
      const rows = logs.sort((a,b)=>new Date(a.start)-new Date(b.start)).map(l=>`<tr><td>${escapeExcelCell(l.date)}</td><td>${escapeExcelCell(l.itemName)}</td><td>${escapeExcelCell(timeText(l.start))}</td><td>${escapeExcelCell(timeText(l.end))}</td><td style="mso-number-format:'0';">${Math.round(l.durationMs/60000)}</td></tr>`).join("");
      const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr><th>日付</th><th>項目</th><th>開始時間</th><th>終了時間</th><th>分</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
      const blob = new Blob(["\uFEFF"+html], {type:"application/vnd.ms-excel;charset=utf-8"});
      const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
    }
    function exportMonthCsv() { const target=$("monthFilter")?.value||monthKey(); const fmt=$("exportFormat")?.value||"csv"; const logs=currentLogsForCalc().filter(l=>(l.date||dateKey(new Date(l.start))).slice(0,7)===target); fmt==="excel" ? exportExcelFile(logs,`作業タイマー記録_${target}.xls`) : exportCsvFile(logs,`作業タイマー記録_${target}.csv`); }
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

    function clearMonthLogs() { const target=$("monthFilter")?.value||monthKey(); if(!confirm(`${monthLabel(target)} の記録をすべて削除します。\nこの操作は元に戻せません。\n本当に削除しますか？`)) return; const removeIds=new Set(state.logs.filter(l=>(l.date||dateKey(new Date(l.start))).slice(0,7)===target).map(l=>l.id)); state.logs=state.logs.filter(l=>!removeIds.has(l.id)); saveState(); renderAll(); }

    function openItemDialog(type) {
      activeItemManageType = type;
      renderItemManageList();
      $("itemDialog").showModal();
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
      const migratedCount = migrateLegacyLogs();
      renderAll();
      if ($("monthFilter")) $("monthFilter").value = monthKey();
      if (migratedCount > 0) {
        alert(`古い記録を${migratedCount}件更新しました。\n\nrecordId\ndeviceId\nupdatedAt\n\nを追加しました。`);
      }
    }

    initializeApp();

    startTimerTicker();
