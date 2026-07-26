/*
 * items.js
 * 項目1・項目2の参照、表示名生成、追加・編集・削除処理
 *
 * 状態・初期化処理: js/app.js
 * 描画処理: js/render.js
 * 保存処理: js/storage.js
 */

    let activeItemManageType = "item1";

    function sortedItems() { return [...state.items].sort((a,b)=>(a.kana||a.name).localeCompare((b.kana||b.name),"ja")); }
    function itemById(id) { return state.items.find(i=>i.id===id); }
    function sortedItem2s() { return [...(state.item2s || [])].sort((a,b)=>(a.kana||a.name).localeCompare((b.kana||b.name),"ja")); }
    function item2ById(id) { return (state.item2s || []).find(i=>i.id===id); }

    function buildItemParts(itemId, item2Id, customName, items = state.items, item2s = state.item2s || []) {
      const item1 = items.find(i => i.id === itemId);
      const item2 = item2s.find(i => i.id === item2Id);
      return {
        item1Name: item1 ? item1.name : "",
        item2Name: item2 ? item2.name : "",
        customName: (customName || "").trim()
      };
    }

    function panelDisplayTitle(panel) {
      const title = (panel.title || "").trim();
      return title || "作業";
    }

    // Step5.1.3: デフォルト見出し「作業」は記録上では空欄として扱う。
    function normalizeRecordTitle(title) {
      const heading = (title || "").trim();
      return heading === "作業" ? "" : heading;
    }

    function buildInfoText(title, item1Name, item2Name, customName) {
      const heading = normalizeRecordTitle(title);
      const part1 = (item1Name || "").trim();
      const part2 = (item2Name || "").trim();
      const free = (customName || "").trim();
      return `${heading}${part1}${part2}${free}`;
    }

    function buildItemName(panel, items = state.items, item2s = state.item2s || []) {
      const parts = buildItemParts(panel.itemId, panel.item2Id, panel.customName, items, item2s);
      // v40.2 Step3.1: 情報は「見出し＋項目1＋項目2＋手入力」を空白なしで結合して表示する。
      // 内部では見出し・項目1・項目2・手入力を別々に保存する。
      return buildInfoText(panelDisplayTitle(panel), parts.item1Name, parts.item2Name, parts.customName);
    }

    function createItem(name, kana) { const item={ id:crypto.randomUUID(), name:name.trim(), kana:kana.trim() }; state.items.push(item); return item; }
    function createItem2(name, kana) { const item={ id:crypto.randomUUID(), name:name.trim(), kana:kana.trim() }; if(!Array.isArray(state.item2s)) state.item2s=[]; state.item2s.push(item); return item; }
    function addItemFromDialog() { const name=$("newItemName").value.trim(); const kana=$("newItemKana").value.trim(); if(!name||!kana){ alert("項目1名とふりがなを両方入力してください。"); return; } createItem(name,kana); $("newItemName").value=""; $("newItemKana").value=""; saveState(); renderAll(); }
    function addItem2FromDialog() { const name=$("newItem2Name").value.trim(); const kana=$("newItem2Kana").value.trim(); if(!name||!kana){ alert("項目2名とふりがなを両方入力してください。"); return; } createItem2(name,kana); $("newItem2Name").value=""; $("newItem2Kana").value=""; saveState(); renderAll(); }
    function editItem(id) { const item=itemById(id); if(!item) return; const name=prompt("項目1名", item.name); if(!name||!name.trim()) return; const kana=prompt("ふりがな", item.kana||item.name); if(!kana||!kana.trim()) return; item.name=name.trim(); item.kana=kana.trim(); saveState(); renderAll(); }
    function editItem2(id) { const item=item2ById(id); if(!item) return; const name=prompt("項目2名", item.name); if(!name||!name.trim()) return; const kana=prompt("ふりがな", item.kana||item.name); if(!kana||!kana.trim()) return; item.name=name.trim(); item.kana=kana.trim(); saveState(); renderAll(); }
    function deleteItem(id) { const item=itemById(id); if(!item) return; if(state.panels.some(p=>p.itemId===id && p.running)){ alert("計測中の項目1は削除できません。先に終了してください。"); return; } if(!confirm(`「${item.name}」を項目1のプルダウンから削除しますか？記録名は現在の表示名で残ります。`)) return; state.items=state.items.filter(i=>i.id!==id); state.panels.forEach(p=>{ if(p.itemId===id) p.itemId=null; }); saveState(); renderAll(); }
    function deleteItem2(id) { const item=item2ById(id); if(!item) return; if(!confirm(`「${item.name}」を項目2のプルダウンから削除しますか？`)) return; state.item2s=(state.item2s||[]).filter(i=>i.id!==id); state.panels.forEach(p=>{ if(p.item2Id===id) p.item2Id=null; }); saveState(); renderAll(); }

    function openItemDialog(type) {
      activeItemManageType = type;
      renderItemManageList();
      $("itemDialog").showModal();
    }
