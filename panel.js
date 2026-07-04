// Timer App panel.js v39
// JS分割版: panel.js

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

function togglePanelGroup(kind) {
      if (!state.panelGroups) state.panelGroups = { workCollapsed: false, completedCollapsed: true };
      if (kind === "work") state.panelGroups.workCollapsed = !state.panelGroups.workCollapsed;
      if (kind === "completed") state.panelGroups.completedCollapsed = !state.panelGroups.completedCollapsed;
      saveState();
      renderAll();
    }

function updateLogFromPanel(panel) {
      // v38.1:
      // 未分類で開始したカードは一旦「記録と連動」。
      // 完了後に項目を選択したら連動を解除し、カード削除でも記録は残す。
      // 手入力のみの場合は連動を維持し、カード削除で記録も削除する。
      let log = null;
      if (panel.activeLogId) log = logById(panel.activeLogId);
      if (!log && panel.lastLogId) log = logById(panel.lastLogId);
      if (!log && panel.linkedToLog) log = state.logs.find(l => l.panelId === panel.id || l.id === panel.id);

      if (!log && panel.start && panel.linkedToLog) {
        log = {
          id: panel.id,
          panelId: panel.id,
          itemId: panel.itemId || null,
          customName: panel.customName || "",
          itemName: buildItemName(panel),
          start: panel.start,
          end: panel.end || panel.start,
          date: panel.date || dateKey(new Date(panel.start)),
          durationMs: 0,
          completed: !!panel.completed
        };
        state.logs.push(log);
        panel.lastLogId = log.id;
      }

      if (!log) return;

      if (panel.completed && panel.itemId) {
        // 完了後に項目を選択した場合は、定番項目扱いとして記録の連動を解除する。
        log.panelId = null;
        panel.linkedToLog = false;
      } else if (panel.completed && !panel.itemId) {
        // 手入力のみ、または未分類のままなら連動を維持する。
        log.panelId = panel.id;
        panel.linkedToLog = true;
      }

      log.itemId = panel.itemId || null;
      log.customName = panel.customName || "";
      log.itemName = buildItemName(panel);
      log.start = panel.start || log.start;
      log.end = panel.running ? nowIso() : (panel.end || log.end || log.start);
      log.date = panel.date || dateKey(new Date(log.start));
      log.completed = !!panel.completed;
      recalcLog(log);
      panel.lastLogId = log.id;
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
