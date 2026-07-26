/*
 * utils.js
 * 汎用のDOM取得・日時・文字列整形処理
 */

const $ = (id) => document.getElementById(id);


function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function monthKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }
function monthLabel(key) { const [y, m] = key.split("-"); return `${Number(y)}年${Number(m)}月`; }
function timeText(iso) { if (!iso) return ""; const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
// Step5.1.4: 記録・合計などの一覧表示専用。保存データとJSONは秒を保持する。
function formatTimeHHMM(iso) { if (!iso) return ""; const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function timeOnlyValue(iso) { return timeText(iso); }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"}[c])); }
function durationText(ms) { const t=Math.max(0,Math.floor(ms/1000)); const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60; return `${pad(h)}:${pad(m)}:${pad(s)}`; }
function formatDurationHHMM(ms) { const totalMinutes=Math.max(0,Math.floor(ms/60000)); const h=Math.floor(totalMinutes/60), m=totalMinutes%60; return `${pad(h)}:${pad(m)}`; }
function durationJa(ms) { const totalMin=Math.round(ms/60000); const h=Math.floor(totalMin/60), m=totalMin%60; if(h&&m) return `${h}時間${m}分`; if(h) return `${h}時間`; return `${m}分`; }
function nowIso() { return new Date().toISOString(); }
function timestampIdPart(d = new Date()) {
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${String(d.getMilliseconds()).padStart(3, "0")}`;
}
