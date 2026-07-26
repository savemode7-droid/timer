# CHANGELOG

## v40.2 Step6.0.7A

- `js/logs.js`を追加。
- `logById()`、`buildLogItemName()`、`recalcLog()`、`localTimeToIso()`、`dateTimeLocalValue()`、`dateTimeLocalToIso()`、`currentLogsForCalc()`、`startOfWeekMonday()`、`deleteLog()`、`editLog()`を`app.js`から`logs.js`へ移動。
- 記録の参照・編集・削除・再計算と、集計に使うログ抽出処理を分離。
- 読み込み順を`panel.js` → `logs.js` → `app.js`に変更。
- アプリ内バージョンとキャッシュ識別子をStep6.0.7Aへ更新。
- 機能仕様の変更なし。

## v40.2 Step6.0.6B

- `createLogFromPanel()`、`updateLogFromPanel()`、`changePanelItem()`、`changePanelItem2()`、`changeCustomName()`、`changePanelTimer()`、`resetPanel()`、`completePanel()`を`app.js`から`js/panel.js`へ移動。
- パネルの項目変更、手入力変更、タイマー値変更、リセット、完了処理を`panel.js`へ集約。
- パネルから記録を作成・更新する処理も`panel.js`へ集約。
- アプリ内バージョンとキャッシュ識別子をStep6.0.6Bへ更新。
- 機能仕様の変更なし。

## v40.2 Step6.0.6A

- `js/panel.js`を追加。
- `newPanel()`、`sortedPanelsForDisplay()`、`addPanel()`、`deletePanel()`、`togglePanel()`、`togglePanelGroup()`、`editPanelTitle()`、`cancelPanelTitleEdit()`を`app.js`から`panel.js`へ移動。
- パネルの生成・表示順・追加・削除・折りたたみ・見出し編集に関する基本処理を分離。
- 読み込み順を`timer.js` → `panel.js` → `app.js`に変更。
- アプリ内バージョンとキャッシュ識別子をStep6.0.6Aへ更新。
- 機能仕様の変更なし。

## v40.2 Step6.0.5B

- `finalizeIfDateChanged()`を`app.js`から`js/timer.js`へ移動。
- `createTimerLogFromPanel()`を`app.js`から`js/timer.js`へ移動。
- `updatePanelTime()`を`app.js`から`js/timer.js`へ移動。
- Step6.0.5Aの開始・終了・毎秒更新処理と合わせ、タイマー関連処理を`timer.js`へ集約。
- アプリ内バージョンとキャッシュ識別子をStep6.0.5Bへ更新。
- 機能仕様の変更なし。

## v40.2 Step6.0.5A

- `js/timer.js`を追加。
- `startPanel()`と`stopPanel()`を`app.js`から`timer.js`へ移動。
- 毎秒の経過時間更新処理を`tickTimers()`として分離。
- タイマー更新開始処理を`startTimerTicker()`として分離。
- 読み込み順を`render.js` → `timer.js` → `app.js`に変更。
- アプリ内バージョンとキャッシュ識別子をStep6.0.5Aへ更新。
- 機能仕様の変更なし。

## v40.2 Step6.0.4B

- `renderPanels()`、`renderSummary()`、`renderLogs()`、`renderAll()`を`app.js`から`js/render.js`へ移動。
- Step6.0.4Aで移動済みの4関数と合わせ、主要な画面描画処理を`render.js`へ集約。
- `index.html`のキャッシュ識別子をStep6.0.4Bへ更新。
- アプリ内バージョンを`v40.2 Step6.0.4B`へ更新。
- 機能仕様の変更なし。

## v40.2 Step6.0.4A

- `js/render.js` を追加。
- `renderDeviceId()`、`renderDeveloperMode()`、`renderItemManageList()`、`renderMonthFilter()` を `app.js` から分離。
- `renderPanels()`、`renderSummary()`、`renderLogs()`、`renderAll()` は次段階のため `app.js` に残置。
- 読み込み順を `version.js` → `constants.js` → `utils.js` → `storage.js` → `render.js` → `app.js` に変更。
- アプリ内バージョンとキャッシュ用ファイルバージョンを Step6.0.4A に更新。
- 機能変更なし。

## v40.2 Step6.0.3

- `js/storage.js` を追加。
- 保存・読込、状態の正規化、旧データ移行、ログ編集保存などの処理を `app.js` から分離。
- 読み込み順を `version.js` → `constants.js` → `utils.js` → `storage.js` → `app.js` に変更。
- アプリ内バージョン表示とキャッシュ用ファイルバージョンを Step6.0.3 に更新。
- Step6.0.3初回ZIPで欠けていた `storage.js` の読み込み指定を修正。
- 機能変更なし。

## v40.2 Step6.0.2

- `js/utils.js` を追加。
- DOM要素取得、日付・時刻キー生成、時刻・所要時間表示、HTMLエスケープなどの汎用関数を `app.js` から分離。
- `app.js` には端末ID取得以降のアプリ固有処理を残した。
- 読み込み順を `version.js` → `constants.js` → `utils.js` → `app.js` に変更。
- アプリ内バージョン表示とキャッシュ用ファイルバージョンを Step6.0.2 に更新。
- 機能変更なし。

## v40.2 Step6.0.1

- `js/constants.js` を追加。
- ストレージキー、端末IDキー、旧バージョンのキー一覧、開発者モードキーを `app.js` から分離。
- `app.js` 先頭コメントから固定バージョン表記を外し、バージョン情報・固定設定値・更新履歴の参照先を明記。
- アプリ内バージョン表示とキャッシュ用ファイルバージョンを Step6.0.1 に更新。
- 機能変更なし。

## v40.2 Step5.1.6

- タイマー設定済みパネルで「開始」を押して記録を作成した後も、パネルの見出しを維持するように変更。
- 項目1・項目2・手入力・タイマー設定・開始終了時刻は従来どおりリセット。
- タイマー実行後は従来どおりパネルを折りたたみ、一覧の一番下へ移動。
- アプリ内バージョン表示とキャッシュ用ファイルバージョンを Step5.1.6 に更新。

## v40.2 Step5.1.5

- CSV出力の開始・終了時刻を HH:MM 形式に変更。


## v40.2 Step6.0.0
- app.js moved to js/app.js
- Added js/version.js
- Updated script paths. No functional changes.
