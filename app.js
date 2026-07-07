// Timer App app.js v40.2 Step3

    const STORAGE_KEY = "work_timer_panel_app_v5";
    const DEVICE_ID_KEY = "work_timer_device_id";
    const OLD_KEYS = ["work_timer_panel_app_v4", "work_timer_panel_app_v3", "work_timer_panel_app_v2", "work_timer_app_v1"];
    const $ = (id) => document.getElementById(id);

    const DEVICE_ID = getDeviceId();

    let state = loadState();
    let activeItemManageType = "item1";

    function pad(n) { return String(n).padStart(2, "0"); }
    function dateKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
    function monthKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }
    function monthLabel(key) { const [y, m] = key.split("-"); return `${Number(y)}年${Number(m)}月`; }
    function timeText(iso) { if (!iso) return ""; const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
    function timeOnlyValue(iso) { return timeText(iso); }
    function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"}[c])); }
    function durationText(ms) { const t=Math.max(0,Math.floor(ms/1000)); const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60; return `${pad(h)}:${pad(m)}:${pad(s)}`; }
    function durationJa(ms) { const totalMin=Math.round(ms/60000); const h=Math.floor(totalMin/60), m=totalMin%60; if(h&&m) return `${h}時間${m}分`; if(h) return `${h}時間`; return `${m}分`; }
    function nowIso() { return new Date().toISOString(); }
    function timestampIdPart(d = new Date()) {
      return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${String(d.getMilliseconds()).padStart(3, "0")}`;
    }
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

    function newPanel(collapsed = false) {
      const id = crypto.randomUUID();
      return { id, itemId:null, item2Id:null, customName:"", title:"", editingTitle:false, timerMinutes:0, start:null, end:null, running:false, completed:false, collapsed:!!collapsed, date:dateKey(), activeLogId:null, lastLogId:null };
    }

    function loadState() {
      for (const key of [STORAGE_KEY, ...OLD_KEYS]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try { return normalizeState(JSON.parse(raw)); } catch {}
      }
      return { deviceId: DEVICE_ID, items:[], item2s:[], panels:[newPanel()], logs:[], currentDate:dateKey(), panelGroups:{ workCollapsed:false, templateCollapsed:false, completedCollapsed:true, logsCollapsed:false, summaryCollapsed:false, exportCollapsed:false } };
    }

    function normalizeState(s) {
      const items = Array.isArray(s.items) ? s.items.filter(i=>i&&i.name).map(i=>({ id:i.id||crypto.randomUUID(), name:i.name, kana:i.kana||i.name })) : [];
      const item2s = Array.isArray(s.item2s) ? s.item2s.filter(i=>i&&i.name).map(i=>({ id:i.id||crypto.randomUUID(), name:i.name, kana:i.kana||i.name })) : [];

      const logs = Array.isArray(s.logs) ? s.logs.map(l => {
        const start = l.start || nowIso();
        const end = l.end || start;
        const durationMs = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
        return {
          id: l.id || l.recordId || crypto.randomUUID(),
          recordId: l.recordId || null,
          deviceId: l.deviceId || null,
          updatedAt: l.updatedAt || null,
          panelId: null,
          itemId: l.itemId || null,
          item2Id: l.item2Id || null,
          customName: l.customName || "",
          itemName: l.itemName || "未分類",
          start, end,
          date: l.date || dateKey(new Date(start)),
          durationMs,
          completed: !!l.completed
        };
      }).filter(l => l.durationMs > 0) : [];

      let panels = [];
      if (Array.isArray(s.panels) && s.panels.length) {
        panels = s.panels.map(p => {
          const id = p.id || crypto.randomUUID();
          const start = p.start || p.runningSince || null;
          const end = p.end || start;
          return {
            id,
            itemId: p.itemId || null,
            item2Id: p.item2Id || null,
            customName: p.customName || "",
            title: p.title || "",
            editingTitle: !!p.editingTitle,
            timerMinutes: Number(p.timerMinutes || 0),
            start,
            end,
            running: !!(p.running || p.runningSince),
            completed: !!p.completed,
            collapsed: (p.collapsed !== undefined) ? !!p.collapsed : !!p.completed,
            date: p.date || (start ? dateKey(new Date(start)) : dateKey()),
            activeLogId: p.activeLogId || null,
            lastLogId: p.lastLogId || null
          };
        });
      }
      if (!panels.length) panels = [newPanel()];

      const normalized = { deviceId: s.deviceId || DEVICE_ID, items, item2s, panels, logs, currentDate: s.currentDate || dateKey(), panelGroups: { workCollapsed:false, templateCollapsed:false, completedCollapsed:true, logsCollapsed:false, summaryCollapsed:false, exportCollapsed:false, ...(s.panelGroups || {}) } };
      ensureLogLinks(normalized);
      return normalized;
    }

    function ensureLogLinks(target = state) {
      // v39.0 Step3: パネルと記録の連動は廃止。
      // 互換性維持のため関数名だけ残し、記録の自動同期は行わない。
    }

    function saveState() {
      state.deviceId = DEVICE_ID;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function renderDeviceId() {
      const el = $("deviceIdDisplay");
      if (el) el.textContent = `D: ${DEVICE_ID}`;
    }


    function migrateLegacyLogs() {
      if (!Array.isArray(state.logs)) return 0;
      let updatedCount = 0;
      const usedRecordIds = new Set(state.logs.map(l => l.recordId).filter(Boolean));

      state.logs.forEach(log => {
        if (!log) return;
        let changed = false;
        const wasLegacy = !log.recordId || !log.deviceId || !log.updatedAt;

        if (!log.deviceId) {
          log.deviceId = DEVICE_ID;
          changed = true;
        }

        if (!log.recordId) {
          let baseId = createRecordId(log.start || log.end || nowIso());
          let newId = baseId;
          let suffix = 1;
          while (usedRecordIds.has(newId)) {
            suffix += 1;
            newId = `${baseId}-${suffix}`;
          }
          log.recordId = newId;
          log.id = newId;
          usedRecordIds.add(newId);
          changed = true;
        } else {
          usedRecordIds.add(log.recordId);
        }

        if (!log.updatedAt) {
          log.updatedAt = log.end || log.start || nowIso();
          changed = true;
        }

        if (wasLegacy && changed) updatedCount += 1;
      });

      if (updatedCount > 0) saveState();
      return updatedCount;
    }

    function sortedItems() { return [...state.items].sort((a,b)=>(a.kana||a.name).localeCompare((b.kana||b.name),"ja")); }
    function itemById(id) { return state.items.find(i=>i.id===id); }
    function sortedItem2s() { return [...(state.item2s || [])].sort((a,b)=>(a.kana||a.name).localeCompare((b.kana||b.name),"ja")); }
    function item2ById(id) { return (state.item2s || []).find(i=>i.id===id); }
    function logById(id) { return state.logs.find(l=>l.id===id); }

    function buildItemName(panel, items = state.items, item2s = state.item2s || []) {
      const item1 = items.find(i=>i.id===panel.itemId);
      const item2 = item2s.find(i=>i.id===panel.item2Id);
      const part1 = item1 ? item1.name : "";
      const part2 = item2 ? item2.name : "";
      const free = (panel.customName || "").trim();
      // v39.5 Step2.2: 正式な記録名は「項目1＋項目2＋手入力」をスペースなしで結合する。
      const name = `${part1}${part2}${free}`;
      return name || "未分類";
    }



    function panelDisplayTitle(panel) {
      const title = (panel.title || "").trim();
      return title || "作業";
    }

    function buildLogItemName(itemId, customName, item2Id = null, items = state.items, item2s = state.item2s || []) {
      const item1 = items.find(i => i.id === itemId);
      const item2 = item2s.find(i => i.id === item2Id);
      const part1 = item1 ? item1.name : "";
      const part2 = item2 ? item2.name : "";
      const free = (customName || "").trim();
      // v39.5 Step2.2: 記録名は「項目1＋項目2＋手入力」。記録編集でも項目2を編集できる。
      const name = `${part1}${part2}${free}`;
      return name || "未分類";
    }

    function recalcLog(log) {
      const startMs = new Date(log.start).getTime();
      const endMs = new Date(log.end || log.start).getTime();
      log.durationMs = Math.max(0, endMs - startMs);
      log.date = dateKey(new Date(log.start));
    }

    function localTimeToIso(value, baseIso) {
      if (!value) return null;
      const parts = value.split(":").map(Number);
      if (parts.length < 2 || parts.some(n=>Number.isNaN(n))) return null;
      const base = baseIso ? new Date(baseIso) : new Date();
      if (Number.isNaN(base.getTime())) return null;
      const [h,m,s=0] = parts;
      base.setHours(h,m,s,0);
      return base.toISOString();
    }

    function dateTimeLocalValue(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function dateTimeLocalToIso(value) {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      d.setSeconds(0, 0);
      return d.toISOString();
    }

    function finalizeIfDateChanged() {
      const today = dateKey();
      if (state.currentDate === today) return false;

      // v39.6: 作業パネルは削除ボタンを押した時だけ消える。
      // 日付が変わってもパネルは残す。計測中だったパネルだけ旧日の23:59:59で停止する。
      const oldDate = state.currentDate || today;
      const [y,m,d] = oldDate.split("-").map(Number);
      const endOfOldDay = new Date(y, m-1, d, 23, 59, 59, 0).toISOString();
      state.panels.forEach(panel => {
        if (panel.running && panel.start) {
          panel.end = endOfOldDay;
          panel.running = false;
          panel.completed = false;
          panel.activeLogId = null;
        }
      });
      state.currentDate = today;
      saveState();
      return true;
    }

    function sortedPanelsForDisplay() {
      return [...state.panels].sort((a,b) => {
        const groupA = a.completed ? 1 : 0;
        const groupB = b.completed ? 1 : 0;
        if (groupA !== groupB) return groupA - groupB;
        const ta = a.start ? new Date(a.start).getTime() : 0;
        const tb = b.start ? new Date(b.start).getTime() : 0;
        return tb - ta;
      });
    }
    function removeCompletedPanels() {
      // v39.6: 作業パネルは削除ボタンを押した時だけ消える。
      // 旧バージョンで completed=true になっていたパネルも作業パネルとして残す。
      state.panels.forEach(panel => {
        if (panel.completed && !panel.running) panel.completed = false;
      });
      if (!state.panels.length) state.panels.push(newPanel(true));
    }

    function renderPanels() {
      const list = $("panelList");
      removeCompletedPanels();
      if (!state.panels.length) state.panels.push(newPanel(true));
      if (!state.panelGroups) state.panelGroups = { workCollapsed:false, templateCollapsed:false, completedCollapsed:true };

      const itemOptions = (selectedId) => `<option value="">項目1を選択</option>` + sortedItems().map(item => `<option value="${item.id}" ${item.id===selectedId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
      const item2Options = (selectedId) => `<option value="">項目2を選択</option>` + sortedItem2s().map(item => `<option value="${item.id}" ${item.id===selectedId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
      const timerOptions = (selectedMinutes) => {
        const options = [0,1,2,3,4,5,10,15,20,25,30,40,50,60];
        return options.map(min => {
          const label = min === 0 ? "タイマーなし" : `${min}分`;
          return `<option value="${min}" ${Number(selectedMinutes || 0) === min ? "selected" : ""}>${label}</option>`;
        }).join("");
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
          : `<button class="start-btn" data-start="${panel.id}">開始</button>`;
        const actionControls = completed ? `` : `
            <div class="main-actions timer-action-row">
              <select class="timer-select" data-timer-panel="${panel.id}" ${running ? "disabled" : ""}>${timerOptions(panel.timerMinutes)}</select>
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
              <span class="panel-toggle-mark">${collapseMark}</span>
              ${titleNode}
              <span class="small">${running ? "計測中" : completed ? "完了" : "未開始"}</span>
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

    function currentLogsForCalc() {
      ensureLogLinks();
      return state.logs.map(l => {
        const copy = {...l};
        recalcLog(copy);
        return copy;
      });
    }

    function startOfWeekMonday(d) {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const day = x.getDay();
      const diff = (day + 6) % 7;
      x.setDate(x.getDate() - diff);
      x.setHours(0,0,0,0);
      return x;
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
          <span class="summary-cell-label">今日</span><span class="summary-cell-value">${durationText(todayTotal)}</span>
          <span class="summary-cell-label">今週</span><span class="summary-cell-value">${durationText(weekTotal)}</span>
          <span class="summary-cell-label">今月</span><span class="summary-cell-value">${durationText(monthTotal)}</span>
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

    function renderLogs() {
      const targetDate = $("dateFilter").value || dateKey();
      const logs = currentLogsForCalc().filter(l=>l.date===targetDate).sort((a,b)=>new Date(a.start)-new Date(b.start));
      $("logs").innerHTML = logs.length
        ? `<table><thead><tr><th>項目</th><th>開始時間</th><th>終了時間</th><th class="right">作業時間</th><th class="log-action-cell">操作</th></tr></thead><tbody>` +
          logs.map(l=>{
            const action = `
              <button class="log-icon-btn edit-log" data-edit-log="${l.id}" title="この記録を編集">✎</button>
              <button class="log-icon-btn delete-log" data-delete-log="${l.id}" title="この記録を削除">🗑</button>`;
            return `<tr><td>${escapeHtml(l.itemName)}</td><td>${timeText(l.start)}</td><td>${timeText(l.end)}</td><td class="right">${durationText(l.durationMs)}</td><td class="log-action-cell">${action}</td></tr>`;
          }).join("") +
          `</tbody></table>`
        : `<div class="empty">この日の記録はありません。</div>`;
    }

    function renderAll() { finalizeIfDateChanged(); renderPanels(); renderItemManageList(); renderSummary(); renderMonthFilter(); renderLogs(); updateSectionCollapse(); renderDeviceId(); }

    function addPanel(shouldRender=true) {
      // v39.3.2: 「作業パネルの追加」で作成したパネルは、折りたたみ状態で追加し、追加位置まで自動スクロールする。
      const panel = newPanel(true);
      panel.collapsed = true;
      state.panels.push(panel);
      // 追加したパネルが見えるよう、作業グループは開いた状態にする。
      state.panelGroups.workCollapsed = false;
      saveState();
      if (shouldRender) {
        renderAll();
        requestAnimationFrame(() => {
          const addedPanel = document.querySelector(`[data-panel-id="${panel.id}"]`);
          if (addedPanel) addedPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    }

    function deletePanel(id) {
      const panel = state.panels.find(p=>p.id===id);
      if (!panel) return;
      // v39.0 Step2: パネル削除と記録削除を分離する。
      // パネルを削除しても、作成済みの記録は残す。
      // 記録を消したい場合は、記録一覧側の削除ボタンから削除する。
      if (!confirm("この作業パネルを削除しますか？記録は残ります。")) return;
      state.panels = state.panels.filter(p=>p.id!==id);
      if (!state.panels.length) state.panels.push(newPanel(true));
      saveState(); renderAll();
    }

    function deleteLog(id) {
      const log = state.logs.find(l => l.id === id);
      if (!log) return;
      if (!confirm("この記録を削除しますか？")) return;
      state.logs = state.logs.filter(l => l.id !== log.id);
      saveState();
      renderAll();
    }

    function editLog(id) {
      const log = state.logs.find(l => l.id === id);
      if (!log) return;

      const dialog = $("logEditDialog");
      const itemSelect = $("editLogItemId");
      const item2Select = $("editLogItem2Id");
      const customInput = $("editLogCustomName");
      const startInput = $("editLogStart");
      const endInput = $("editLogEnd");
      const saveBtn = $("saveLogEditBtn");

      const items = sortedItems();
      const item2s = sortedItem2s();
      itemSelect.innerHTML = `<option value="">未選択</option>` +
        items.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
      item2Select.innerHTML = `<option value="">未選択</option>` +
        item2s.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");

      const currentItem = log.itemId ? itemById(log.itemId) : null;
      if (currentItem) {
        itemSelect.value = currentItem.id;
        customInput.value = log.customName || "";
      } else {
        itemSelect.value = "";
        const name = (log.itemName || "").trim();
        customInput.value = (name && name !== "未分類") ? (log.customName || name) : (log.customName || "");
      }
      item2Select.value = log.item2Id || "";

      startInput.value = dateTimeLocalValue(log.start);
      endInput.value = dateTimeLocalValue(log.end || log.start);
      saveBtn.dataset.editingLogId = log.id;
      dialog.showModal();
    }

    function saveLogEdit() {
      const id = $("saveLogEditBtn").dataset.editingLogId;
      const log = state.logs.find(l => l.id === id);
      if (!log) return;

      const itemId = $("editLogItemId").value || null;
      const item2Id = $("editLogItem2Id").value || null;
      const customName = $("editLogCustomName").value.trim();
      const itemName = buildLogItemName(itemId, customName, item2Id);
      const startIso = dateTimeLocalToIso($("editLogStart").value);
      const endIso = dateTimeLocalToIso($("editLogEnd").value);

      if (!itemId && !item2Id && !customName) {
        alert("項目1・項目2を選択するか、手入力を入力してください。");
        return;
      }
      if (!startIso || !endIso) {
        alert("開始時間と終了時間を入力してください。");
        return;
      }
      if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
        alert("終了時間は開始時間以降にしてください。");
        return;
      }

      log.itemId = itemId;
      log.item2Id = item2Id;
      log.customName = customName;
      log.itemName = itemName;
      log.start = startIso;
      log.end = endIso;
      log.updatedAt = nowIso();
      recalcLog(log);
      saveState();
      $("logEditDialog").close();
      renderAll();
    }


    function editPanelTitle(id) {
      const panel = state.panels.find(p => p.id === id);
      if (!panel) return;
      panel.editingTitle = true;
      saveState();
      renderAll();
      requestAnimationFrame(() => {
        const input = document.querySelector(`[data-panel-title-input="${id}"]`);
        if (input) { input.focus(); input.select(); }
      });
    }

    function savePanelTitle(id) {
      const panel = state.panels.find(p => p.id === id);
      if (!panel) return;
      const input = document.querySelector(`[data-panel-title-input="${id}"]`);
      panel.title = (input?.value || "").trim();
      panel.editingTitle = false;
      saveState();
      renderAll();
    }

    function cancelPanelTitleEdit(id) {
      const panel = state.panels.find(p => p.id === id);
      if (!panel) return;
      panel.editingTitle = false;
      saveState();
      renderAll();
    }

    function togglePanel(id) {
      const panel = state.panels.find(p => p.id === id);
      if (!panel) return;
      panel.collapsed = !panel.collapsed;
      saveState();
      renderAll();
    }

    function togglePanelGroup(kind) {
      if (!state.panelGroups) state.panelGroups = { workCollapsed: false, templateCollapsed: false, completedCollapsed: true, logsCollapsed:false, summaryCollapsed:false, exportCollapsed:false };
      if (kind === "work") state.panelGroups.workCollapsed = !state.panelGroups.workCollapsed;
      saveState();
      renderAll();
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

    function createLogFromPanel(panel, endIso) {
      if (!panel || !panel.start) return null;
      const start = panel.start;
      const end = endIso || panel.end || nowIso();
      const recordId = createRecordId(start);
      const log = {
        id: recordId,
        recordId,
        deviceId: DEVICE_ID,
        updatedAt: end,
        panelId: null,
        itemId: panel.itemId || null,
        item2Id: panel.item2Id || null,
        customName: panel.customName || "",
        // v39.5 Step4: 見出し(panel.title)はパネル専用ラベル。
        // 記録名は正式データ「項目1＋項目2＋手入力」だけから作成する。
        itemName: ((panel.title||"") + buildItemName(panel)),
        start,
        end,
        date: dateKey(new Date(start)),
        durationMs: Math.max(0, new Date(end).getTime() - new Date(start).getTime()),
        completed: true
      };
      state.logs.push(log);
      return log;
    }

    function createTimerLogFromPanel(panel, startIso, minutes) {
      const startDate = new Date(startIso);
      const endDate = new Date(startDate.getTime() + Number(minutes) * 60000);
      const recordId = createRecordId(startDate.toISOString());
      const log = {
        id: recordId,
        recordId,
        deviceId: DEVICE_ID,
        updatedAt: endDate.toISOString(),
        panelId: null,
        itemId: panel.itemId || null,
        item2Id: panel.item2Id || null,
        customName: panel.customName || "",
        itemName: ((panel.title||"") + buildItemName(panel)),
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        date: dateKey(startDate),
        durationMs: Math.max(0, endDate.getTime() - startDate.getTime()),
        completed: true,
        timerMinutes: Number(minutes) || 0
      };
      state.logs.push(log);
      return log;
    }

    function updateLogFromPanel(panel) {
      // v39.0 Step4.1:
      // 開始時には記録を作成しない。
      // 終了時に createLogFromPanel() で初めて記録へ追加する。
    }

    function changePanelItem(panelId, itemId) {
      const panel = state.panels.find(p=>p.id===panelId); if (!panel) return;
      panel.itemId = itemId || null;
      updateLogFromPanel(panel);
      saveState(); renderAll();
    }

    function changePanelItem2(panelId, item2Id) {
      const panel = state.panels.find(p=>p.id===panelId); if (!panel) return;
      panel.item2Id = item2Id || null;
      updateLogFromPanel(panel);
      saveState(); renderAll();
    }

    function changeCustomName(panelId, value) {
      const panel = state.panels.find(p=>p.id===panelId); if (!panel) return;
      panel.customName = value || "";
      updateLogFromPanel(panel);
      saveState();
      // v28: 入力中にパネル全体を再描画すると、1文字ごとにフォーカスが外れるため、
      // パネルは描き直さず、集計と記録一覧だけ更新する。
      renderSummary();
      renderMonthFilter();
      renderLogs();
    }

    function changePanelTimer(panelId, value) {
      const panel = state.panels.find(p=>p.id===panelId); if (!panel) return;
      panel.timerMinutes = Math.max(0, Number(value || 0));
      saveState();
    }

    function startPanel(id) {
      const panel = state.panels.find(p=>p.id===id); if (!panel || panel.running || panel.completed) return;

      // v39.10: 終了済み・未完了の作業がある状態で開始すると、
      // 前回分が記録されず破棄されるため確認する。
      if (panel.start && panel.end && !panel.running) {
        const ok = confirm("前回の作業がまだ完了していません。\n\n開始すると、\n前回の作業は記録されず破棄されます。\n\n開始しますか？");
        if (!ok) return;
      }

      const now = nowIso();
      const timerMinutes = Number(panel.timerMinutes || 0);

      // v40.0 Step1: タイマーが指定されている場合は、開始時点で予定終了時刻までの記録を登録し、パネルを削除する。
      // 例: 13:00に10分を指定して開始 → 13:00-13:10の記録を即登録。
      if (timerMinutes > 0) {
        createTimerLogFromPanel(panel, now, timerMinutes);
        state.panels = state.panels.filter(p => p.id !== panel.id);
        if (!state.panels.length) state.panels.push(newPanel(true));
        saveState();
        renderAll();
        return;
      }

      // v39.0 Step4.1: 開始時には記録を作成しない。
      // 記録一覧には、完了ボタンを押した時点で追加する。
      panel.start = now;
      panel.end = null;
      panel.running = true;
      panel.completed = false;
      panel.collapsed = false;
      panel.date = dateKey(new Date(panel.start));
      panel.activeLogId = null;
      panel.lastLogId = null;

      // v38.2: 開始時に空の作業パネルを自動追加しない。
      // 新しい作業パネルが必要な場合は「作業パネルの追加」ボタンで追加する。
      saveState(); renderAll();
    }

    function stopPanel(id) {
      const panel = state.panels.find(p=>p.id===id); if (!panel || !panel.running) return;
      panel.end = nowIso();
      panel.running = false;

      // v39.2.1: 終了ボタンでは記録を作成しない。
      // 終了は作業時間を確定するだけ。記録登録は完了ボタンで行う。
      panel.activeLogId = null;
      panel.lastLogId = null;

      // v39.2: 完了パネル一覧は廃止。
      // 終了後もパネルは作業側に残し、「完了」ボタンで記録登録＋パネル削除する。
      panel.completed = false;
      panel.collapsed = false;
      saveState(); renderAll();
    }

    function completePanel(id) {
      const panel = state.panels.find(p=>p.id===id);
      if (!panel || panel.running) return;
      if (!panel.start || !panel.end) {
        alert("終了してから完了してください。");
        return;
      }

      // v39.6: 完了ボタンでは記録だけ登録し、作業パネルは残す。
      // 見出しは維持し、項目1・項目2・手入力はクリアして再利用する。
      const log = createLogFromPanel(panel, panel.end);
      panel.lastLogId = log ? log.id : null;
      panel.start = null;
      panel.end = null;
      panel.running = false;
      panel.completed = false;
      panel.activeLogId = null;
      panel.itemId = null;
      panel.item2Id = null;
      panel.customName = "";
      saveState(); renderAll();
    }

    function updatePanelTime(panelId, field, value) {
      const panel = state.panels.find(p=>p.id===panelId); if (!panel || !panel.start) return;
      const base = field === "start" ? panel.start : (panel.end || panel.start);
      const iso = localTimeToIso(value, base); if (!iso) return;
      if (field === "start") {
        panel.start = iso;
        panel.date = dateKey(new Date(iso));
        if (!panel.end || new Date(panel.end) < new Date(panel.start)) panel.end = panel.start;
      } else {
        panel.end = iso;
      }
      const log = panel.activeLogId ? logById(panel.activeLogId) : null;
      if (log) {
        log.start = panel.start;
        log.end = panel.end || panel.start;
        log.date = dateKey(new Date(log.start));
        recalcLog(log);
      }
      saveState(); renderAll();
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
      logs.sort((a,b)=>new Date(a.start)-new Date(b.start)).forEach(l=>rows.push([l.date,l.itemName,timeText(l.start),timeText(l.end),Math.round(l.durationMs/60000),l.recordId||"",l.deviceId||"",l.updatedAt||""]));
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
    $("clearMonthBtn").addEventListener("click", clearMonthLogs);
    $("monthFilter").addEventListener("change", () => saveState());

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

    setInterval(() => {
      if (finalizeIfDateChanged()) return;
      state.panels.forEach(panel => {
        if (!panel.running || !panel.start) return;
        const node=document.querySelector(`[data-elapsed="${panel.id}"]`);
        if(node) node.textContent = durationText(Date.now() - new Date(panel.start).getTime());
      });
      renderSummary();
    }, 1000);

  