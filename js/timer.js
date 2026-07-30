/*
 * timer.js
 * 作業タイマーの開始・終了・毎秒更新処理
 *
 * 状態・業務処理: js/app.js
 * 描画処理: js/render.js
 * 保存処理: js/storage.js
 */

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

  // Step5.1.2: タイマーが指定されている場合は、開始時点で予定終了時刻までの記録を即登録する。
  // Step5.1.6: 使用したパネルは削除せず、見出しを維持する。
  // 項目1・項目2・手入力・タイマー設定だけを空にし、折りたたんで一覧の一番下へ移動する。
  // 例: 見出し「メール対応」は残し、個別の項目だけを消して再利用できる状態に戻す。
  if (timerMinutes > 0) {
    createTimerLogFromPanel(panel, now, timerMinutes);

    // Step5.1.6: タイマー実行後も見出しは維持する。
    panel.editingTitle = false;
    panel.itemId = null;
    panel.item2Id = null;
    panel.customName = "";
    panel.timerMinutes = 0;
    panel.timerMode = "preset";
    panel.start = null;
    panel.end = null;
    panel.running = false;
    panel.completed = false;
    panel.activeLogId = null;
    panel.lastLogId = null;
    panel.date = dateKey();
    panel.collapsed = true;

    // 配列の末尾へ移動する。startがnullになるため、表示順でも一番下に残る。
    state.panels = state.panels.filter(p => p.id !== panel.id);
    state.panels.push(panel);

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

function tickTimers() {
  if (finalizeIfDateChanged()) return;

  state.panels.forEach(panel => {
    if (!panel.running || !panel.start) return;

    const node = document.querySelector(`[data-elapsed="${panel.id}"]`);
    if (node) {
      node.textContent = durationText(
        Date.now() - new Date(panel.start).getTime()
      );
    }
  });

  renderSummary();
}

function startTimerTicker() {
  return setInterval(tickTimers, 1000);
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
    title: normalizeRecordTitle(panelDisplayTitle(panel)),
    itemId: panel.itemId || null,
    item2Id: panel.item2Id || null,
    customName: panel.customName || "",
    itemName: buildItemName(panel),
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
