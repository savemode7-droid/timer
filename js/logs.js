/*
 * logs.js
 * 作業記録の参照・編集・削除・再計算・集計補助処理
 *
 * 状態・初期化処理: js/app.js
 * 描画処理: js/render.js
 * 保存処理: js/storage.js
 * パネル処理: js/panel.js
 */

    function logById(id) { return state.logs.find(l=>l.id===id); }

    function buildLogItemName(itemId, customName, item2Id = null, items = state.items, item2s = state.item2s || [], title = "") {
      const parts = buildItemParts(itemId, item2Id, customName, items, item2s);
      return buildInfoText(title, parts.item1Name, parts.item2Name, parts.customName);
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
      const titleInput = $("editLogTitle");
      const itemSelect = $("editLogItemId");
      const item2Select = $("editLogItem2Id");
      const customInput = $("editLogCustomName");
      const startInput = $("editLogStart");
      const endInput = $("editLogEnd");
      const saveBtn = $("saveLogEditBtn");

      titleInput.value = normalizeRecordTitle(log.title);

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
