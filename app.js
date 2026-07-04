// Timer App app.js v38

    const STORAGE_KEY = "work_timer_panel_app_v5";
    const OLD_KEYS = ["work_timer_panel_app_v4", "work_timer_panel_app_v3", "work_timer_panel_app_v2", "work_timer_app_v1"];
    const $ = (id) => document.getElementById(id);

    let state = loadState();

    function pad(n) { return String(n).padStart(2, "0"); }
    function dateKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
    function monthKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }
    function monthLabel(key) { const [y, m] = key.split("-"); return `${Number(y)}年${Number(m)}月`; }
    function timeText(iso) { if (!iso) return ""; const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
    function timeOnlyValue(iso) { return timeText(iso); }
    function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"}[c])); }
    function durationText(ms) { const t=Math.max(0,Math.floor(ms/1000)); const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60; return h>0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`; }
    function durationJa(ms) { const totalMin=Math.round(ms/60000); const h=Math.floor(totalMin/60), m=totalMin%60; if(h&&m) return `${h}時間${m}分`; if(h) return `${h}時間`; return `${m}分`; }
    function nowIso() { return new Date().toISOString(); }

    function newPanel() {
      const id = crypto.randomUUID();
      return { id, itemId:null, customName:"", start:null, end:null, running:false, completed:false, collapsed:false, date:dateKey(), activeLogId:null, lastLogId:null, linkedToLog:false };
    }

    function loadState() {
      for (const key of [STORAGE_KEY, ...OLD_KEYS]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try { return normalizeState(JSON.parse(raw)); } catch {}
      }
      return { items:[], panels:[newPanel()], logs:[], currentDate:dateKey(), panelGroups:{ workCollapsed:false, completedCollapsed:true } };
    }

    function normalizeState(s) {
      const items = Array.isArray(s.items) ? s.items.filter(i=>i&&i.name).map(i=>({ id:i.id||crypto.randomUUID(), name:i.name, kana:i.kana||i.name })) : [];

      const logs = Array.isArray(s.logs) ? s.logs.map(l => {
        const start = l.start || nowIso();
        const end = l.end || start;
        return {
          id: l.id || l.panelId || crypto.randomUUID(),
          panelId: l.panelId || l.id || crypto.randomUUID(),
          itemId: l.itemId || null,
          customName: l.customName || "",
          itemName: l.itemName || "未分類",
          start, end,
          date: l.date || dateKey(new Date(start)),
          durationMs: Math.max(0, new Date(end).getTime() - new Date(start).getTime()),
          completed: !!l.completed
        };
      }) : [];

      let panels = [];
      if (Array.isArray(s.panels) && s.panels.length) {
        panels = s.panels.map(p => {
          const id = p.id || p.activeLogId || p.lastLogId || crypto.randomUUID();
          const linkedLog = logs.find(l => l.id === id || l.panelId === id || l.id === p.activeLogId || l.id === p.lastLogId);
          const start = p.start || linkedLog?.start || p.runningSince || null;
          const end = p.end || linkedLog?.end || start;
          return {
            id,
            itemId: p.itemId || linkedLog?.itemId || null,
            customName: p.customName || linkedLog?.customName || "",
            start,
            end,
            running: !!(p.running || p.runningSince),
            completed: !!p.completed || (!!linkedLog && !p.runningSince && !!linkedLog.completed),
            collapsed: (p.collapsed !== undefined) ? !!p.collapsed : (!!p.completed || (!!linkedLog && !p.runningSince && !!linkedLog.completed)),
            date: p.date || (start ? dateKey(new Date(start)) : dateKey()),
            activeLogId: p.activeLogId || null,
            lastLogId: p.lastLogId || linkedLog?.id || null,
            linkedToLog: (p.linkedToLog !== undefined) ? !!p.linkedToLog : (!p.itemId && !!linkedLog)
          };
        });
      }
      if (!panels.length) panels = [newPanel()];

      const normalized = { items, panels, logs, currentDate: s.currentDate || dateKey(), panelGroups: s.panelGroups || { workCollapsed:false, completedCollapsed:true } };
      ensureLogLinks(normalized);
      return normalized;
    }

    function ensureLogLinks(target = state) {
      target.panels.forEach(panel => {
        // v38: 記録との連動は「手入力のみ・未分類」カードだけに限定する。
        // 項目選択ありカードは、開始のたびにカード非連動の記録を作成する。
        const shouldLink = !!panel.linkedToLog || (!panel.itemId && !!panel.start);
        if (!shouldLink || !panel.start) return;

        let log = target.logs.find(l => l.panelId === panel.id || l.id === panel.id);
        const itemName = buildItemName(panel, target.items);
        const end = panel.running ? nowIso() : (panel.end || panel.start);
        if (!log) {
          log = { id: panel.id, panelId: panel.id, itemId: panel.itemId || null, customName: panel.customName || "", itemName, start: panel.start, end, date: panel.date || dateKey(new Date(panel.start)), durationMs:0, completed:panel.completed };
          target.logs.push(log);
        }
        log.id = panel.id;
        log.panelId = panel.id;
        log.itemId = panel.itemId || null;
        log.customName = panel.customName || "";
        log.itemName = itemName;
        log.start = panel.start;
        log.end = end;
        log.date = panel.date || dateKey(new Date(panel.start));
        log.completed = !!panel.completed;
        recalcLog(log);
        panel.linkedToLog = true;
        panel.lastLogId = log.id;
        if (panel.running) panel.activeLogId = log.id;
      });
    }

    function saveState() {
      ensureLogLinks();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function sortedItems() { return [...state.items].sort((a,b)=>(a.kana||a.name).localeCompare((b.kana||b.name),"ja")); }
    function itemById(id) { return state.items.find(i=>i.id===id); }
    function logById(id) { return state.logs.find(l=>l.id===id || l.panelId===id); }

    function buildItemName(panel, items = state.items) {
      const item = items.find(i=>i.id===panel.itemId);
      const base = item ? item.name : "";
      const free = (panel.customName || "").trim();
      // v37.1: ドロップダウン選択と手入力が両方ある場合は、スペースなしで結合する。
      // 例: ゲーム + 33 => ゲーム33
      if (base && free) return `${base}${free}`;
      if (base) return base;
      if (free) return free;
      return "未分類";
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

    function finalizeIfDateChanged() {
      const today = dateKey();
      if (state.currentDate === today) return false;
      const oldDate = state.currentDate || today;
      const [y,m,d] = oldDate.split("-").map(Number);
      const endOfOldDay = new Date(y, m-1, d, 23, 59, 59, 0).toISOString();
      state.panels.forEach(panel => {
        if (panel.start) {
          if (panel.running) {
            panel.end = endOfOldDay;
            const log = panel.activeLogId ? logById(panel.activeLogId) : logById(panel.id);
            if (log) {
              log.end = panel.end;
              log.completed = !panel.itemId;
              recalcLog(log);
              panel.lastLogId = log.id;
            }
            panel.activeLogId = null;
          }
          panel.running = false;
          panel.completed = true;
          panel.collapsed = true;
          panel.date = panel.date || oldDate;
        }
      });
      ensureLogLinks();
      state.panels = [newPanel()];
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

    function renderPanels() {
      const list = $("panelList");
      if (!state.panels.length) state.panels.push(newPanel());

      const allPanels = sortedPanelsForDisplay();
      const workPanels = allPanels.filter(panel => !panel.completed);
      const completedPanels = allPanels.filter(panel => panel.completed);

      if (!state.panelGroups) state.panelGroups = { workCollapsed: false, completedCollapsed: true };
      const workCollapsed = !!state.panelGroups.workCollapsed;
      const completedCollapsed = state.panelGroups.completedCollapsed !== false;

      const itemOptions = (selectedId) => `<option value="">項目を選択</option>` + sortedItems().map(item => `<option value="${item.id}" ${item.id===selectedId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");

      function renderGroupHeader(kind, label, count, collapsed) {
        return `
          <div class="panel-group-head ${kind}" data-toggle-panel-group="${kind}" title="タップで開閉">
            <span>${collapsed ? "▶" : "▼"} ${label}</span>
            <span class="panel-group-count">${count}件</span>
          </div>
        `;
      }

      function renderPanelCard(panel, title) {
        const running = !!panel.running;
        const completed = !!panel.completed;
        const elapsed = panel.start ? (running ? Date.now() - new Date(panel.start).getTime() : Math.max(0, new Date(panel.end || panel.start).getTime() - new Date(panel.start).getTime())) : 0;
        const canComplete = !!panel.itemId && !!panel.start && !running;
        const completeButton = panel.itemId ? `<button class="complete-btn" data-complete-panel="${panel.id}" ${canComplete ? "" : "disabled"}>完了</button>` : "";
        const actionControls = completed ? `` : `
            <div class="main-actions ${panel.itemId ? "three-actions" : ""}">
              <button class="start-btn" data-start="${panel.id}" ${running ? "disabled" : ""}>開始</button>
              <button class="end-btn" data-stop="${panel.id}" ${!running ? "disabled" : ""}>終了</button>
              ${completeButton}
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
              <span class="work-duration">${durationJa(elapsed)}</span>
            </div>
          `;

        return `
          <div class="timer-panel ${completed ? "completed" : ""}">
            <div class="panel-head">
              <div><div class="panel-title">${title}</div><div class="small">${running ? "計測中" : completed ? "完了" : "未開始"}</div></div>
              <button class="danger panel-delete-btn" data-delete-panel="${panel.id}">削除</button>
            </div>

            <div class="item-input-row">
              <select data-select-panel="${panel.id}">${itemOptions(panel.itemId)}</select>
              <input class="item-free-name" data-custom-name="${panel.id}" value="${escapeHtml(panel.customName || "")}" placeholder="手入力" />
            </div>

            ${actionControls}
            ${timeLine}
          </div>
        `;
      }

      let html = "";
      html += renderGroupHeader("work", "作業", workPanels.length, workCollapsed);
      if (!workCollapsed) {
        let workCount = 0;
        html += workPanels.map(panel => renderPanelCard(panel, `作業${++workCount}`)).join("");
      }

      html += renderGroupHeader("completed", "完了", completedPanels.length, completedCollapsed);
      if (!completedCollapsed) {
        html += completedPanels.map(panel => renderPanelCard(panel, escapeHtml(buildItemName(panel)))).join("");
      }

      list.innerHTML = html;
    }

    function renderItemManageList() {
      const area = $("itemManageList");
      const items = sortedItems();
      area.innerHTML = items.length ? items.map(item => `
        <div class="item-card">
          <div class="item-line"><span class="item-name">${escapeHtml(item.name)}</span><span class="item-kana">${escapeHtml(item.kana)}</span></div>
          <div class="item-actions"><button class="ghost mini-btn" data-edit-item="${item.id}">編集</button><button class="danger mini-btn" data-delete-item="${item.id}">削除</button></div>
        </div>`).join("") : `<div class="empty">項目はまだありません。</div>`;
    }

    function currentLogsForCalc() {
      ensureLogLinks();
      return state.logs.map(l => {
        const runningPanel = state.panels.find(p => p.running && p.activeLogId === l.id);
        const copy = {...l, end: runningPanel ? nowIso() : l.end};
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
          <span class="summary-cell-label">今日</span><span class="summary-cell-value">${durationJa(todayTotal)}</span>
          <span class="summary-cell-label">今週</span><span class="summary-cell-value">${durationJa(weekTotal)}</span>
          <span class="summary-cell-label">今月</span><span class="summary-cell-value">${durationJa(monthTotal)}</span>
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
            const hasPanel = !!l.panelId && state.panels.some(p => p.id === l.panelId);
            const action = hasPanel
              ? `<button class="log-icon-btn locked" data-log-locked="${l.id}" title="作業パネルがあるため削除できません">🔒</button>`
              : `<button class="log-icon-btn delete-log" data-delete-log="${l.id}" title="この記録を削除">🗑</button>`;
            return `<tr><td>${escapeHtml(l.itemName)}</td><td>${timeText(l.start)}</td><td>${timeText(l.end)}</td><td class="right">${durationJa(l.durationMs)}</td><td class="log-action-cell">${action}</td></tr>`;
          }).join("") +
          `</tbody></table>`
        : `<div class="empty">この日の記録はありません。</div>`;
    }

    function renderAll() { finalizeIfDateChanged(); renderPanels(); renderItemManageList(); renderSummary(); renderMonthFilter(); renderLogs(); }

    function addPanel(shouldRender=true) { state.panels.push(newPanel()); saveState(); if (shouldRender) renderAll(); }

    function deletePanel(id) {
      const panel = state.panels.find(p=>p.id===id);
      if (!panel) return;
      const linkedLogs = state.logs.filter(l => l.panelId === id);
      const hasLinkedLog = linkedLogs.length > 0;
      const msg = hasLinkedLog
        ? "この作業パネルと、このパネルに紐づく記録を削除します。よろしいですか？"
        : "この作業パネルを削除しますか？記録は残ります。";
      if (!confirm(msg)) return;
      state.panels = state.panels.filter(p=>p.id!==id);
      // v38: 項目選択ありカードの記録はカード非連動なので消さない。
      // 手入力のみ・未分類カードの連動記録だけ消す。
      if (hasLinkedLog) state.logs = state.logs.filter(l=>l.panelId!==id);
      if (!state.panels.length) state.panels.push(newPanel());
      saveState(); renderAll();
    }

    function deleteLog(id) {
      const hasPanel = state.logs.some(l => (l.id === id || l.panelId === id) && l.panelId && state.panels.some(p => p.id === l.panelId));
      if (hasPanel) {
        alert("この記録は作業パネルと連携しています。先に作業パネルを削除してください。");
        return;
      }
      const log = state.logs.find(l => l.id === id || l.panelId === id);
      if (!log) return;
      if (!confirm("この記録を削除しますか？")) return;
      state.logs = state.logs.filter(l => l.id !== id && l.panelId !== id);
      saveState();
      renderAll();
    }

    function showLockedLogMessage() {
      alert("この記録は作業パネルと連携しています。先に作業パネルを削除してください。");
    }

    function togglePanelGroup(kind) {
      if (!state.panelGroups) state.panelGroups = { workCollapsed: false, completedCollapsed: true };
      if (kind === "work") state.panelGroups.workCollapsed = !state.panelGroups.workCollapsed;
      if (kind === "completed") state.panelGroups.completedCollapsed = !state.panelGroups.completedCollapsed;
      saveState();
      renderAll();
    }

    function updateLogFromPanel(panel) {
      ensureLogLinks();
      const log = panel.activeLogId ? logById(panel.activeLogId) : null;
      if (log) {
        log.itemId = panel.itemId || null;
        log.customName = panel.customName || "";
        log.itemName = buildItemName(panel);
        recalcLog(log);
      }
    }

    function changePanelItem(panelId, itemId) {
      const panel = state.panels.find(p=>p.id===panelId); if (!panel) return;
      panel.itemId = itemId || null;
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

    function startPanel(id) {
      const panel = state.panels.find(p=>p.id===id); if (!panel || panel.running || panel.completed) return;
      const now = nowIso();
      const linkedToLog = !panel.itemId;
      const logId = linkedToLog ? panel.id : crypto.randomUUID();
      const log = {
        id: logId,
        panelId: linkedToLog ? panel.id : null,
        itemId: panel.itemId || null,
        customName: panel.customName || "",
        itemName: buildItemName(panel),
        start: now,
        end: now,
        date: dateKey(new Date(now)),
        durationMs: 0,
        completed: false
      };
      state.logs.push(log);

      panel.start = now;
      panel.end = now;
      panel.running = true;
      panel.completed = false;
      panel.collapsed = false;
      panel.date = dateKey(new Date(panel.start));
      panel.activeLogId = log.id;
      panel.lastLogId = log.id;
      panel.linkedToLog = linkedToLog;

      const hasEmpty = state.panels.some(p=>p.id!==panel.id && !p.start && !p.itemId && !p.customName);
      if (!hasEmpty) state.panels.push(newPanel());
      saveState(); renderAll();
    }

    function stopPanel(id) {
      const panel = state.panels.find(p=>p.id===id); if (!panel || !panel.running) return;
      panel.end = nowIso();
      panel.running = false;

      const log = panel.activeLogId ? logById(panel.activeLogId) : logById(panel.id);
      if (log) {
        log.end = panel.end;
        log.itemId = panel.itemId || null;
        log.customName = panel.customName || "";
        log.itemName = buildItemName(panel);
        log.completed = !panel.itemId;
        recalcLog(log);
        panel.lastLogId = log.id;
      }
      panel.activeLogId = null;

      if (panel.itemId) {
        // v38: 定番項目カードは終了後も作業側に残し、再開始できる。
        panel.completed = false;
        panel.collapsed = false;
      } else {
        // v38: 手入力のみ・未分類カードは終了時に完了へ移動し、記録と連動する。
        panel.completed = true;
        panel.collapsed = true;
        panel.linkedToLog = true;
      }
      saveState(); renderAll();
    }

    function completePanel(id) {
      const panel = state.panels.find(p=>p.id===id); if (!panel || panel.running || panel.completed) return;
      panel.completed = true;
      panel.collapsed = true;
      panel.activeLogId = null;
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
      const log = panel.activeLogId ? logById(panel.activeLogId) : (panel.linkedToLog ? logById(panel.id) : logById(panel.lastLogId));
      if (log) {
        log.start = panel.start;
        log.end = panel.end || panel.start;
        log.date = dateKey(new Date(log.start));
        recalcLog(log);
      }
      ensureLogLinks(); saveState(); renderAll();
    }

    function createItem(name, kana) { const item={ id:crypto.randomUUID(), name:name.trim(), kana:kana.trim() }; state.items.push(item); return item; }
    function addItemFromDialog() { const name=$("newItemName").value.trim(); const kana=$("newItemKana").value.trim(); if(!name||!kana){ alert("項目名とふりがなを両方入力してください。"); return; } createItem(name,kana); $("newItemName").value=""; $("newItemKana").value=""; saveState(); renderAll(); }
    function editItem(id) { const item=itemById(id); if(!item) return; const name=prompt("項目名", item.name); if(!name||!name.trim()) return; const kana=prompt("ふりがな", item.kana||item.name); if(!kana||!kana.trim()) return; item.name=name.trim(); item.kana=kana.trim(); ensureLogLinks(); saveState(); renderAll(); }
    function deleteItem(id) { const item=itemById(id); if(!item) return; if(state.panels.some(p=>p.itemId===id && p.running)){ alert("計測中の項目は削除できません。先に終了してください。"); return; } if(!confirm(`「${item.name}」をプルダウンから削除しますか？記録名は現在の表示名で残ります。`)) return; state.items=state.items.filter(i=>i.id!==id); state.panels.forEach(p=>{ if(p.itemId===id) p.itemId=null; }); ensureLogLinks(); saveState(); renderAll(); }

    function exportCsvFile(logs, filename) {
      const rows = [["日付","項目","開始時間","終了時間","分"]];
      logs.sort((a,b)=>new Date(a.start)-new Date(b.start)).forEach(l=>rows.push([l.date,l.itemName,timeText(l.start),timeText(l.end),Math.round(l.durationMs/60000)]));
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
    function clearMonthLogs() { const target=$("monthFilter")?.value||monthKey(); if(!confirm(`${monthLabel(target)} の記録をすべて削除します。\nこの操作は元に戻せません。\n本当に削除しますか？`)) return; const removeIds=new Set(state.logs.filter(l=>(l.date||dateKey(new Date(l.start))).slice(0,7)===target).map(l=>l.id)); state.logs=state.logs.filter(l=>!removeIds.has(l.id)); state.panels=state.panels.filter(p=>!removeIds.has(p.id)); if(!state.panels.length) state.panels.push(newPanel()); saveState(); renderAll(); }

    $("addPanelBtn").addEventListener("click", () => addPanel(true));
    $("openItemDialogBtn").addEventListener("click", () => { renderItemManageList(); $("itemDialog").showModal(); });
    $("closeDialogBtn").addEventListener("click", () => $("itemDialog").close());
    $("addItemBtn").addEventListener("click", addItemFromDialog);
    $("newItemKana").addEventListener("keydown", e => { if(e.key==="Enter") addItemFromDialog(); });
    $("todayBtn").addEventListener("click", () => { $("dateFilter").value=dateKey(); renderLogs(); renderSummary(); });
    $("dateFilter").addEventListener("change", () => { renderLogs(); renderSummary(); });
    $("monthCsvBtn").addEventListener("click", exportMonthCsv);
    $("clearMonthBtn").addEventListener("click", clearMonthLogs);
    $("monthFilter").addEventListener("change", () => saveState());

    document.body.addEventListener("change", e => {
      const el=e.target;
      if(el.dataset.selectPanel) changePanelItem(el.dataset.selectPanel, el.value);
      if(el.dataset.startTime) updatePanelTime(el.dataset.startTime, "start", el.value);
      if(el.dataset.endTime) updatePanelTime(el.dataset.endTime, "end", el.value);
    });
    document.body.addEventListener("input", e => { const el=e.target; if(el.dataset.customName) changeCustomName(el.dataset.customName, el.value); });
    document.body.addEventListener("click", e => {
      const el=e.target;
      if (el.closest("button")) {
        if(el.dataset.start) startPanel(el.dataset.start);
        if(el.dataset.stop) stopPanel(el.dataset.stop);
        if(el.dataset.completePanel) completePanel(el.dataset.completePanel);
        if(el.dataset.deletePanel) deletePanel(el.dataset.deletePanel);
        if(el.dataset.deleteLog) deleteLog(el.dataset.deleteLog);
        if(el.dataset.logLocked) showLockedLogMessage();
        if(el.dataset.editItem) editItem(el.dataset.editItem);
        if(el.dataset.deleteItem) deleteItem(el.dataset.deleteItem);
        return;
      }
      const toggleGroup = el.closest("[data-toggle-panel-group]");
      if (toggleGroup) {
        togglePanelGroup(toggleGroup.dataset.togglePanelGroup);
        return;
      }
      if(el.dataset.start) startPanel(el.dataset.start);
      if(el.dataset.stop) stopPanel(el.dataset.stop);
        if(el.dataset.completePanel) completePanel(el.dataset.completePanel);
      if(el.dataset.deletePanel) deletePanel(el.dataset.deletePanel);
      if(el.dataset.deleteLog) deleteLog(el.dataset.deleteLog);
      if(el.dataset.logLocked) showLockedLogMessage();
      if(el.dataset.editItem) editItem(el.dataset.editItem);
      if(el.dataset.deleteItem) deleteItem(el.dataset.deleteItem);
    });

    finalizeIfDateChanged();
    $("dateFilter").value = dateKey();
    saveState();
    renderAll();

    setInterval(() => {
      if (finalizeIfDateChanged()) return;
      let changed = false;
      state.panels.forEach(panel => {
        if (!panel.running || !panel.start) return;
        const node=document.querySelector(`[data-elapsed="${panel.id}"]`);
        if(node) node.textContent = durationText(Date.now() - new Date(panel.start).getTime());
        const log=panel.activeLogId ? logById(panel.activeLogId) : logById(panel.id);
        if(log){ log.end=nowIso(); recalcLog(log); changed=true; }
      });
      if(changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderSummary(); renderLogs();
    }, 1000);

  