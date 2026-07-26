/*
 * render.js
 * 依存関係の少ない画面描画処理
 *
 * バージョン情報: js/version.js
 * 固定設定値: js/constants.js
 * 汎用処理: js/utils.js
 * メイン状態・その他の描画処理: js/app.js
 */

function renderDeviceId() {
      const el = $("deviceIdDisplay");
      if (el) el.textContent = `D: ${DEVICE_ID}`;
    }

function renderDeveloperMode() {
      document.body.classList.toggle("developer-mode-enabled", developerModeEnabled);
      const button = $("developerModeBtn");
      if (button) {
        button.setAttribute("aria-pressed", String(developerModeEnabled));
        button.textContent = developerModeEnabled ? "開発者モード ON" : "開発者モード";
      }
      const panel = $("developerPanel");
      if (panel) panel.setAttribute("aria-hidden", String(!developerModeEnabled));
      if (!developerModeEnabled) return;
      if ($("developerAppVersion")) $("developerAppVersion").textContent = APP_VERSION;
      if ($("developerDataVersion")) $("developerDataVersion").textContent = String(DATA_FORMAT_VERSION);
      if ($("developerDeviceId")) $("developerDeviceId").textContent = DEVICE_ID;
      if ($("developerLogCount")) $("developerLogCount").textContent = `${state.logs.length}件`;
      if ($("developerPanelCount")) $("developerPanelCount").textContent = `${state.panels.length}件`;
      if ($("developerStorageKey")) $("developerStorageKey").textContent = STORAGE_KEY;
      if ($("developerConverterVersion")) $("developerConverterVersion").textContent = `v1 → v${DATA_FORMAT_VERSION}`;
      if ($("developerMigrationStatus")) $("developerMigrationStatus").textContent = lastMigrationSummary;
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

function renderMonthFilter() {
      const select = $("monthFilter");
      const months = [...new Set(state.logs.map(l=>(l.date||dateKey(new Date(l.start))).slice(0,7)))].filter(Boolean).sort();
      const current = select.value || monthKey();
      if (!months.includes(monthKey())) months.push(monthKey());
      months.sort();
      select.innerHTML = months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join("");
      select.value = months.includes(current) ? current : monthKey();
    }
