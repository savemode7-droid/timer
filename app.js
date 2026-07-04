// Timer App app.js v39

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
        const shouldLink = !!panel.linkedToLog;
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

 currentLogsForCalc() {
      ensureLogLinks();
      return state.logs.map(l => {
        const runningPanel = state.panels.find(p => p.running && p.activeLogId === l.id);
        const copy = {...l, end: runningPanel ? nowIso() : l.end};
        recalcLog(copy);
        return copy;
      });
    }

derAll() { finalizeIfDateChanged(); renderPanels(); renderItemManageList(); renderSummary(); renderMonthFilter(); renderLogs(); }

openItemDialogBtn").addEventListener("click", () => { renderItemManageList(); $("itemDialog").showModal(); });
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

  