/*
 * render.js
 * 作業タイマーの画面描画処理
 *
 * バージョン情報: js/version.js
 * 固定設定値: js/constants.js
 * 汎用処理: js/utils.js
 * メイン状態・業務処理: js/app.js
 */

function renderDeveloperMode() {
      document.body.classList.toggle("developer-mode-enabled", developerModeEnabled);
      const button = $("developerModeBtn");
      if (button) {
        button.setAttribute("aria-pressed", String(developerModeEnabled));
        button.textContent = developerModeEnabled ? "開発者モード ON" : "開発者モード OFF";
      }
      const panel = $("developerPanel");
      if (panel) panel.setAttribute("aria-hidden", String(!developerModeEnabled));
      if (!developerModeEnabled) return;
      if ($("developerAppVersion")) $("developerAppVersion").textContent = APP_VERSION;
      if ($("developerDataVersion")) $("developerDataVersion").textContent = String(DATA_FORMAT_VERSION);
      if ($("developerDeviceId")) $("developerDeviceId").textContent = DEVICE_ID;
      if ($("developerLogCount")) $("developerLogCount").textContent = `${state.logs.length}件`;
      if ($("developerPanelCount")) $("developerPanelCount").textContent = `${state.panels.length}件`;
      if ($("developerStorageKey")) $("developerStorageKey").textContent = STORAGE_KEY;
      if ($("developerConverterVersion")) $("developerConverterVersion").textContent = `v1 → v${DATA_FORMAT_VERSION}`;
      if ($("developerMigrationStatus")) $("developerMigrationStatus").textContent = lastMigrationSummary;
      if (typeof renderGoogleAuth === "function") renderGoogleAuth();
    }

function renderItemManageList() {
      const area = $("itemManageList");
      const title = $("itemDialogTitle");
      const isItem2 = activeItemManageType === "item2";

      const item1Section = document.querySelector("#newItemName")?.closest(".item-manage-section");
      const item2Section = document.querySelector("#newItem2Name")?.closest(".item-manage-section");
      if (item1Section) item1Section.style.display = isItem2 ? "none" : "";
      if (item2Section) item2Section.style.display = isItem2 ? "" : "none";
      if (title) title.textContent = isItem2 ? "項目2管理" : "項目1管理";

      const items = isItem2 ? sortedItem2s() : sortedItems();
      const editAttr = isItem2 ? "data-edit-item2" : "data-edit-item";
      const deleteAttr = isItem2 ? "data-delete-item2" : "data-delete-item";
      const label = isItem2 ? "項目2" : "項目1";
      const emptyText = `${label}はまだありません。`;
      area.innerHTML = `
        <div class="item-manage-section">
          <div class="item-manage-heading">${escapeHtml(label)}一覧</div>
          ${items.length ? items.map(item => `
            <div class="item-card">
              <div class="item-line"><span class="item-name">${escapeHtml(item.name)}</span><span class="item-kana">${escapeHtml(item.kana)}</span></div>
              <div class="item-actions"><button class="ghost mini-btn" ${editAttr}="${item.id}">編集</button><button class="danger mini-btn" ${deleteAttr}="${item.id}">削除</button></div>
            </div>`).join("") : `<div class="empty">${escapeHtml(emptyText)}</div>`}
        </div>`;
    }

function renderMonthFilter() {
      const select = $("monthFilter");
      const months = [...new Set(state.logs.map(l=>(l.date||dateKey(new Date(l.start))).slice(0,7)))].filter(Boolean).sort();
      const current = select.value || monthKey();
      if (!months.includes(monthKey())) months.push(monthKey());
      months.sort();
      select.innerHTML = months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join("");
      select.value = months.includes(current) ? current : monthKey();
    }

function renderPanels() {
  const list = $("panelList");
  removeCompletedPanels();
  if (!state.panels.length) state.panels.push(newPanel(true));
  if (!state.panelGroups) state.panelGroups = { workCollapsed:false, templateCollapsed:false, completedCollapsed:true };

  const itemOptions = (selectedId) => `<option value="">項目1を選択</option>` + sortedItems().map(item => `<option value="${item.id}" ${item.id===selectedId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
  const item2Options = (selectedId) => `<option value="">項目2を選択</option>` + sortedItem2s().map(item => `<option value="${item.id}" ${item.id===selectedId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
  const timerInputHtml = (panel, running) => {
    const totalMinutes = Math.max(0, Number(panel.timerMinutes || 0));
    const hours = Math.min(99, Math.floor(totalMinutes / 60));
    const minutes = Math.min(59, totalMinutes % 60);
    const disabled = running ? "disabled" : "";
    return `
      <div class="timer-duration-inputs" aria-label="タイマー設定時間">
        <label><input type="number" min="0" max="99" step="1" inputmode="numeric" data-timer-hours="${panel.id}" value="${hours}" ${disabled}><span>時間</span></label>
        <label><input type="number" min="0" max="59" step="1" inputmode="numeric" data-timer-minutes="${panel.id}" value="${minutes}" ${disabled}><span>分</span></label>
      </div>`;
  };

  const allPanels = sortedPanelsForDisplay();
  const workPanels = allPanels.filter(p => !p.completed);
  // v39.4.1: 定型作業一覧は廃止。項目を選択してもパネルは移動しない。
  // v39.2: 完了パネル一覧は廃止したため、完了パネルは表示しない。

  function panelHtml(panel, extraClass = "") {
    const running = !!panel.running;
    const completed = !!panel.completed;
    const elapsed = panel.start ? (running ? Date.now() - new Date(panel.start).getTime() : Math.max(0, new Date(panel.end || panel.start).getTime() - new Date(panel.start).getTime())) : 0;
    const canComplete = !!panel.end && !running && !completed;
    const startEndButton = running
      ? `<button class="end-btn" data-stop="${panel.id}">終了</button>`
      : (panel.start && panel.end
          ? `<button class="secondary reset-btn" data-reset-panel="${panel.id}">リセット</button>`
          : `<button class="start-btn" data-start="${panel.id}">開始</button>`);
    const actionControls = completed ? `` : `
        <div class="main-actions timer-action-row">
          ${timerInputHtml(panel, running)}
          ${startEndButton}
          <button class="green complete-btn" data-complete-panel="${panel.id}" ${!canComplete ? "disabled" : ""}>完了</button>
        </div>
        <div class="elapsed" data-elapsed="${panel.id}">${durationText(elapsed)}</div>
      `;
    const timeLine = `
        <div class="work-time-line">
          <span class="work-time-label">開始</span>
          <input type="time" step="1" data-start-time="${panel.id}" value="${timeOnlyValue(panel.start)}" ${!panel.start ? "disabled" : ""} />
          <span class="work-time-label">終了</span>
          <input type="time" step="1" data-end-time="${panel.id}" value="${timeOnlyValue(panel.end)}" ${!panel.start ? "disabled" : ""} />
          <span class="work-time-label">作業</span>
          <span class="work-duration">${durationText(elapsed)}</span>
        </div>
      `;

    const panelCollapsed = !!panel.collapsed;
    const collapseMark = panelCollapsed ? "▶" : "▼";
    const displayTitle = panelDisplayTitle(panel);
    const titleNode = panel.editingTitle ? `
          <input class="panel-title-inline-input" type="text" data-panel-title-input="${panel.id}" value="${escapeHtml(panel.title || "")}" placeholder="作業" />
      ` : `
          <span class="panel-title panel-title-clickable" data-edit-panel-title="${panel.id}" title="見出しを編集">${escapeHtml(displayTitle)}</span>
      `;
    const panelBody = panelCollapsed ? "" : `
        <div class="panel-body">
          <div class="item-input-row panel-formal-inputs">
            <select data-select-panel="${panel.id}">${itemOptions(panel.itemId)}</select>
            <select data-select2-panel="${panel.id}">${item2Options(panel.item2Id)}</select>
            <input class="item-free-name" data-custom-name="${panel.id}" value="${escapeHtml(panel.customName || "")}" placeholder="手入力" />
          </div>

          ${actionControls}
          ${timeLine}
        </div>
      `;

    return `
      <div class="timer-panel ${completed ? "completed" : ""} ${panelCollapsed ? "collapsed" : ""} ${extraClass}" data-panel-id="${panel.id}">
        <div class="panel-head panel-head-clickable" data-panel-head-toggle="${panel.id}">
          <span class="panel-toggle-mark" data-toggle-panel="${panel.id}" role="button" aria-label="パネルを開閉" title="パネルを開閉">${collapseMark}</span>
          ${titleNode}
          <span class="small">${running ? "計測中" : (panel.start && panel.end) ? "終了済み" : completed ? "完了" : "未開始"}</span>
          <button class="danger panel-delete-btn" data-delete-panel="${panel.id}" type="button">削除</button>
        </div>

        ${panelBody}
      </div>
    `;
  }

  function groupHtml(kind, label, panels, collapsed, titleBuilder, extraClass = "") {
    const mark = collapsed ? "＋" : "−";
    return `
      <div class="panel-group">
        <button class="panel-group-head ${kind === "completed" ? "completed-group-head" : ""}" data-toggle-panel-group="${kind}">
          <span>${mark} ${label}</span>
          <span class="panel-group-count">${panels.length}件</span>
        </button>
        ${collapsed ? "" : `<div class="panel-group-body">${
          panels.length ? panels.map((panel) => panelHtml(panel, extraClass)).join("") : `<div class="panel-group-empty">パネルはありません。</div>`
        }</div>`}
      </div>
    `;
  }

  list.innerHTML =
    groupHtml("work", "作業", workPanels, state.panelGroups.workCollapsed, () => "");
}

function renderSummary() {
  const today = dateKey();
  const targetMonth = monthKey();
  const baseDate = new Date(`${today}T00:00:00`);
  const weekStart = startOfWeekMonday(baseDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const logs = currentLogsForCalc();
  const todayTotal = logs
    .filter(l => l.date === today)
    .reduce((sum, l) => sum + l.durationMs, 0);
  const weekTotal = logs
    .filter(l => {
      const d = new Date(`${l.date}T00:00:00`);
      return d >= weekStart && d <= weekEnd;
    })
    .reduce((sum, l) => sum + l.durationMs, 0);
  const monthTotal = logs
    .filter(l => (l.date || "").slice(0, 7) === targetMonth)
    .reduce((sum, l) => sum + l.durationMs, 0);

  $("summary").innerHTML = `
    <div class="period-summary cell-line">
      <span class="summary-cell-label">今日</span><span class="summary-cell-value">${formatDurationHHMM(todayTotal)}</span>
      <span class="summary-cell-label">今週</span><span class="summary-cell-value">${formatDurationHHMM(weekTotal)}</span>
      <span class="summary-cell-label">今月</span><span class="summary-cell-value">${formatDurationHHMM(monthTotal)}</span>
    </div>`;
}

function renderLogs() {
  const targetDate = $("dateFilter").value || dateKey();
  const logs = currentLogsForCalc().filter(l=>l.date===targetDate).sort((a,b)=>new Date(a.start)-new Date(b.start));
  $("logs").innerHTML = logs.length
    ? `<table><thead><tr><th>項目</th><th>開始時間</th><th>終了時間</th><th class="right">作業時間</th><th class="log-action-cell">操作</th></tr></thead><tbody>` +
      logs.map(l=>{
        const action = `
          <button class="log-icon-btn edit-log" data-edit-log="${l.id}" title="この記録を編集">✎</button>
          <button class="log-icon-btn delete-log" data-delete-log="${l.id}" title="この記録を削除">🗑</button>`;
        const developerDetails = developerModeEnabled
          ? `<div class="log-developer-details">Record ID: ${escapeHtml(l.recordId || "-")}<br>Device ID: ${escapeHtml(l.deviceId || "-")}<br>UpdatedAt: ${escapeHtml(l.updatedAt || "-")}</div>`
          : "";
        return `<tr><td>${escapeHtml(l.itemName)}${developerDetails}</td><td>${formatTimeHHMM(l.start)}</td><td>${formatTimeHHMM(l.end)}</td><td class="right">${formatDurationHHMM(l.durationMs)}</td><td class="log-action-cell">${action}</td></tr>`;
      }).join("") +
      `</tbody></table>`
    : `<div class="empty">この日の記録はありません。</div>`;
}

function renderAll() {
  const measure = (label, callback) => {
    if (typeof startupPerformance !== "undefined" && startupPerformance.active) {
      return measureStartupPhase(label, callback);
    }
    return callback();
  };

  measure("日付変更処理", finalizeIfDateChanged);
  measure("作業パネル描画", renderPanels);
  measure("項目管理描画", renderItemManageList);
  measure("合計描画", renderSummary);
  measure("月選択描画", renderMonthFilter);
  measure("記録一覧描画", renderLogs);
  measure("折りたたみ状態反映", updateSectionCollapse);
  measure("開発者表示", renderDeveloperMode);
}
