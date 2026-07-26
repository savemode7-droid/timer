function loadState() {
      for (const key of [STORAGE_KEY, ...OLD_KEYS]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try { return normalizeState(JSON.parse(raw)); } catch {}
      }
      return { dataFormatVersion: DATA_FORMAT_VERSION, deviceId: DEVICE_ID, items:[], item2s:[], panels:[newPanel()], logs:[], currentDate:dateKey(), panelGroups:{ workCollapsed:false, templateCollapsed:false, completedCollapsed:true, logsCollapsed:false, summaryCollapsed:false, exportCollapsed:false } };
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
          title: l.title || l.heading || "",
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

      const normalized = { dataFormatVersion: DATA_FORMAT_VERSION, deviceId: s.deviceId || DEVICE_ID, items, item2s, panels, logs, currentDate: s.currentDate || dateKey(), panelGroups: { workCollapsed:false, templateCollapsed:false, completedCollapsed:true, logsCollapsed:false, summaryCollapsed:false, exportCollapsed:false, ...(s.panelGroups || {}) } };
      ensureLogLinks(normalized);
      return normalized;
    }

function ensureLogLinks(target = state) {
      // v39.0 Step3: パネルと記録の連動は廃止。
      // 互換性維持のため関数名だけ残し、記録の自動同期は行わない。
    }

function saveState() {
      state.deviceId = DEVICE_ID;
      state.dataFormatVersion = DATA_FORMAT_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function saveLogEdit() {
      const id = $("saveLogEditBtn").dataset.editingLogId;
      const log = state.logs.find(l => l.id === id);
      if (!log) return;

      const title = normalizeRecordTitle($("editLogTitle").value);
      const itemId = $("editLogItemId").value || null;
      const item2Id = $("editLogItem2Id").value || null;
      const customName = $("editLogCustomName").value.trim();
      const itemName = buildLogItemName(itemId, customName, item2Id, state.items, state.item2s || [], title);
      const startIso = dateTimeLocalToIso($("editLogStart").value);
      const endIso = dateTimeLocalToIso($("editLogEnd").value);

      if (!title && !itemId && !item2Id && !customName) {
        alert("見出し・項目1・項目2のいずれかを入力するか、手入力を入力してください。");
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

      log.title = title;
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

function savePanelTitle(id) {
      const panel = state.panels.find(p => p.id === id);
      if (!panel) return;
      const input = document.querySelector(`[data-panel-title-input="${id}"]`);
      panel.title = (input?.value || "").trim();
      panel.editingTitle = false;
      saveState();
      renderAll();
    }

function migrateDataV1ToV2(sourceData, sourceDeviceId) {
      const data = cloneJson(sourceData);
      data.items = Array.isArray(data.items) ? data.items : [];
      data.item2s = Array.isArray(data.item2s) ? data.item2s : [];
      data.panels = Array.isArray(data.panels) ? data.panels : [];
      data.logs = Array.isArray(data.logs) ? data.logs : [];
      data.panelGroups = {
        workCollapsed: false,
        templateCollapsed: false,
        completedCollapsed: true,
        logsCollapsed: false,
        summaryCollapsed: false,
        exportCollapsed: false,
        ...(data.panelGroups || {})
      };

      const fallbackDeviceId = sourceDeviceId || data.deviceId || DEVICE_ID;
      const usedRecordIds = new Set();
      data.logs = data.logs.map((log, index) => {
        const migrated = { ...(log || {}) };
        const start = migrated.start || migrated.end || nowIso();
        const end = migrated.end || start;
        migrated.title = migrated.title || migrated.heading || "";
        migrated.customName = migrated.customName || "";
        migrated.itemId = migrated.itemId || null;
        migrated.item2Id = migrated.item2Id || null;
        migrated.deviceId = migrated.deviceId || fallbackDeviceId;
        let recordId = migrated.recordId || migrated.id || `${migrated.deviceId}-${timestampIdPart(new Date(start))}`;
        const baseRecordId = recordId;
        let suffix = 1;
        while (usedRecordIds.has(recordId)) {
          suffix += 1;
          recordId = `${baseRecordId}-${suffix}`;
        }
        usedRecordIds.add(recordId);
        migrated.recordId = recordId;
        migrated.id = recordId;
        migrated.updatedAt = migrated.updatedAt || end || start;
        migrated.start = start;
        migrated.end = end;
        migrated.date = migrated.date || dateKey(new Date(start));
        migrated.completed = !!migrated.completed;
        delete migrated.heading;
        return migrated;
      });

      data.panels = data.panels.map(panel => ({
        ...(panel || {}),
        id: panel?.id || crypto.randomUUID(),
        title: panel?.title || "",
        itemId: panel?.itemId || null,
        item2Id: panel?.item2Id || null,
        customName: panel?.customName || "",
        collapsed: !!panel?.collapsed,
        running: !!panel?.running
      }));
      data.dataFormatVersion = 2;
      return data;
    }

