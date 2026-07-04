// Timer App record.js v39
// JS分割版: record.js

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
