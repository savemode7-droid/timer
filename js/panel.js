/*
 * panel.js
 * 作業パネルの生成・表示順・追加・削除・折りたたみ・見出し編集処理
 *
 * 状態・初期化処理: js/app.js
 * 描画処理: js/render.js
 * 保存処理: js/storage.js
 * タイマー処理: js/timer.js
 */

    function newPanel(collapsed = false) {
      const id = crypto.randomUUID();
      return { id, itemId:null, item2Id:null, customName:"", title:"", editingTitle:false, timerMinutes:0, start:null, end:null, running:false, completed:false, collapsed:!!collapsed, date:dateKey(), activeLogId:null, lastLogId:null };
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

        function cancelPanelTitleEdit(id) {
      const panel = state.panels.find(p => p.id === id);
      if (!panel) return;
      panel.editingTitle = false;
      saveState();
      renderAll();
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
        title: normalizeRecordTitle(panelDisplayTitle(panel)),
        itemId: panel.itemId || null,
        item2Id: panel.item2Id || null,
        customName: panel.customName || "",
        // v40.2 Step3.1: 記録には見出し・項目1・項目2・手入力を別々に保存し、
        // 表示用の情報は「見出し＋項目1＋項目2＋手入力」で作成する。
        itemName: buildItemName(panel),
        start,
        end,
        date: dateKey(new Date(start)),
        durationMs: Math.max(0, new Date(end).getTime() - new Date(start).getTime()),
        completed: true
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

    function resetPanel(id) {
      const panel = state.panels.find(p=>p.id===id);
      if (!panel || panel.running) return;

      // Step4.2.2: リセットは記録を保存せず、開始・終了時刻だけを消す。
      // 見出し・項目1・項目2・手入力・パネルの開閉状態は維持する。
      panel.start = null;
      panel.end = null;
      panel.running = false;
      panel.completed = false;
      panel.activeLogId = null;
      panel.lastLogId = null;
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

      // Step5.1.1: 完了時は記録を保存し、時間だけリセットする。
      // 見出し・項目1・項目2・手入力は保持する。
      // 完了したパネルは折りたたみ、作業パネル一覧の一番下へ移動する。
      const log = createLogFromPanel(panel, panel.end);
      panel.lastLogId = log ? log.id : null;
      panel.start = null;
      panel.end = null;
      panel.running = false;
      panel.completed = false;
      panel.activeLogId = null;
      panel.collapsed = true;

      state.panels = state.panels.filter(p => p.id !== panel.id);
      state.panels.push(panel);

      saveState(); renderAll();
    }
