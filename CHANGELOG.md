## v40.2 Step7.1.2

- タイマーの「任意」をプルダウンの先頭へ移動。
- 「任意」を選ぶと時間・分を設定するポップアップを表示。
- パネル内へ任意入力欄を展開しないため、開始・完了ボタンの配置崩れを解消。
- 設定後は「任意（1時間30分）」のように設定内容をプルダウンへ表示。
- キャンセル時はタイマー設定を変更せず、元の表示へ戻す。
- プリセットの45分は維持。データ形式はv2のまま。

## v40.2 Step7.1.1

- タイマー設定をプルダウン方式へ戻し、「任意」を選んだ場合だけ時間・分の入力欄を表示。
- プリセットに45分を追加。
- 従来の1～5分、10分、15分、20分、25分、30分、40分、50分、60分を維持。
- 任意設定は0～99時間・0～59分で入力可能。
- 保存形式は既存の`timerMinutes`に加え、表示方式を示す`timerMode`を保持。データ形式はv2のまま。

## v40.2 Step7.1.0

- タイマーパネルのプリセット選択を、任意の「時間・分」入力へ変更。
- 時間は0～99、分は0～59の範囲で設定可能。
- 0時間0分の場合は従来どおり通常の経過時間計測として動作。
- 保存形式は既存の`timerMinutes`を継続使用し、データ形式はv2のまま。
- Google Drive保存・復元および既存の記録機能に変更なし。

## v40.2 Step7.0.3

- Google Drive内の固定バックアップから手動復元する「Driveから復元」を追加。
- 復元前にバックアップ日時・データ形式・記録件数・作業パネル件数を確認表示。
- 復元実行前に現在のデータを「作業タイマー_復元前バックアップ_日時.json」として自動退避。
- JSON復元とGoogle Drive復元で共通の検証・変換・反映処理を使用。
- Drive復元状態・復元時間を画面と開発者情報へ追加。
- データ形式はv2のまま。

## v40.2 Step7.0.2

- Google Driveへの手動JSONバックアップ保存を追加。
- Google Drive内の固定ファイル「作業タイマー_クラウドバックアップ.json」へ保存する方式を採用。
- 初回はファイルを新規作成し、2回目以降は同じファイルを上書き。
- Drive保存状態、最終保存日時、保存処理時間を画面と開発者情報に表示。
- アクセストークン期限切れや認証未接続時のエラー案内を追加。
- Google Driveからの復元は未実装。

# CHANGELOG

## v40.2 Step7.0.1 - 2026-07-27

- Google Identity Servicesを利用する`js/google-auth.js`を追加。
- Google Drive用の最小権限`drive.file`でアクセストークンを取得する認証処理を追加。
- Googleへの接続、再接続、接続解除UIを追加。
- アクセストークンはメモリ上だけで保持し、localStorageには保存しない構成。
- Google認証状態と認証時間を開発者情報および「開発情報をコピー」に追加。
- このステップではGoogle Driveへの保存・復元処理は未実装。
- データ形式および既存のタイマー・記録機能に変更なし。

## v40.2 Step7.0.0C

- 開発者モードのON／OFFボタンを画面右下の固定位置へ移動。
- OFF時のボタン表記を「開発者モード OFF」、ON時を「開発者モード ON」に統一。
- ヘッダー右上のバージョン表示と端末ID表示を削除し、開発者情報パネルへ集約。
- 開発者情報、起動計測、読込計測の機能はそのまま維持。
- 機能仕様・保存データ形式の変更なし。


## v40.2 Step7.0.0B

- Navigation Timing APIとResource Timing APIを利用したページ読込計測を追加。
- HTMLのDNS、接続、応答待ち、受信、DOMContentLoaded、loadまでの時間を記録。
- CSSおよび各JavaScriptファイルの取得時間、転送量、キャッシュ利用の可能性を開発者コンソールへ表形式で出力。
- 既存の「開発情報をコピー」にLoading Performanceの内訳を追加。
- 読込計測はload後に実行し、初回画面描画を待たせない構成。
- アプリ内バージョンと全CSS／JavaScriptのキャッシュ識別子をStep7.0.0Bへ更新。
- 機能仕様の変更なし。

## v40.2 Step7.0.0A

- 起動速度の計測機能を追加。
- 端末ID取得、保存データの読込・正規化、旧データ変換、初回画面描画、描画内の各処理を個別に計測。
- 計測結果をブラウザの開発者コンソールへ表形式で出力。
- 記録件数、パネル件数、項目件数も計測結果と合わせて出力。
- 既存の「開発情報をコピー」に起動時間と内訳を追加。
- アプリ内バージョンとキャッシュ識別子をStep7.0.0Aへ更新。
- 機能仕様の変更なし。

## v40.2 Step6.0.8

- `js/items.js`を追加。
- 項目1・項目2の参照、並び替え、表示名生成、追加・編集・削除、管理ダイアログ表示処理を`app.js`から`items.js`へ移動。
- `activeItemManageType`を項目管理モジュールへ移動し、`app.js`を初期化・イベント登録・バックアップ・画面全体制御中心に整理。
- 読み込み順を`storage.js` → `items.js` → `render.js`へ変更。
- アプリ内バージョンとキャッシュ識別子をStep6.0.8へ更新。
- JavaScript構文、読み込み順、関数重複、参照ファイル、ZIP内容の整合性を確認。
- 機能仕様の変更なし。

## v40.2 Step6.0.7B

- `exportCsvFile()`、`escapeExcelCell()`、`exportExcelFile()`、`exportMonthCsv()`、`clearMonthLogs()`を`app.js`から`logs.js`へ移動。
- 記録のCSV／Excel出力と月別一括削除処理を`logs.js`へ集約。
- アプリ内バージョンとキャッシュ識別子をStep6.0.7Bへ更新。
- JavaScript構文、スクリプト読み込み順、ZIP内容の整合性を確認。
- 機能仕様の変更なし。

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
