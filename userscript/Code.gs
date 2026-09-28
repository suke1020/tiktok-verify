/**
 * スプレッドシート → Userscripts 連携用 Google Apps Script（読み取り専用）
 *
 * 設置手順:
 *   1. 入力データのスプレッドシートを開き「拡張機能 > Apps Script」を開く
 *   2. このファイルの内容を丸ごと貼り付け、下の TOKEN を自分だけの合言葉に変更して保存
 *   3. 「デプロイ > 新しいデプロイ > 種類: ウェブアプリ」
 *        次のユーザーとして実行: 自分
 *        アクセスできるユーザー: 全員
 *   4. 発行された URL（…/exec）と TOKEN を、iPhone で初回に「自動入力」ボタンを押したときに入力
 *
 * シートの形式:
 *   1行目 = 見出し（ProfileName, LastName, ... , Cvv の A〜Z 列）
 *   2行目以降 = 1行 = 1プロフィール
 */

// ===== 設定 =====
var SHEET_NAME = '';                 // データのシート名。空なら先頭のシート
var TOKEN = 'ここを自分だけの合言葉に変更'; // 必須。URL を知っている人がデータを読めないようにするため
var EXCLUDE_HEADERS = ['Cvv'];       // iPhone に渡さない列（セキュリティコードは渡さない）
// ================

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'list';
  try {
    if (!TOKEN || TOKEN === 'ここを自分だけの合言葉に変更') throw new Error('Code.gs の TOKEN を設定してください');
    if (p.token !== TOKEN) throw new Error('トークンが一致しません');
    if (action === 'list') return json_({ ok: true, profiles: listProfiles_() });
    if (action === 'get') return json_({ ok: true, row: toRowNumber_(p.row), data: getRow_(toRowNumber_(p.row)) });
    throw new Error('不明な action: ' + action);
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
  if (!sheet) throw new Error('シート「' + SHEET_NAME + '」が見つかりません');
  return sheet;
}

function getHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getDisplayValues()[0]
    .map(function (h) { return String(h).trim(); });
}

function rowToData_(headers, values) {
  var data = {};
  headers.forEach(function (h, i) {
    if (!h || EXCLUDE_HEADERS.indexOf(h) >= 0) return;
    data[h] = values[i] == null ? '' : String(values[i]).trim();
  });
  return data;
}

function profileName_(d, row) {
  return d.ProfileName || [d.LastName, d.FirstName].join(' ').trim() || (row + '行目');
}

function listProfiles_() {
  var sheet = getSheet_();
  var headers = getHeaders_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  // 表示値を使う（日付・数値・先頭0がシートの見た目どおりの文字列になる）
  var rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  var list = [];
  rows.forEach(function (values, i) {
    if (values.every(function (v) { return String(v).trim() === ''; })) return;
    var d = rowToData_(headers, values);
    list.push({ row: i + 2, name: profileName_(d, i + 2) });
  });
  return list;
}

function getRow_(row) {
  var sheet = getSheet_();
  if (row > sheet.getLastRow()) throw new Error(row + '行目にデータがありません');
  var headers = getHeaders_(sheet);
  return rowToData_(headers, sheet.getRange(row, 1, 1, headers.length).getDisplayValues()[0]);
}

function toRowNumber_(v) {
  var n = parseInt(v, 10);
  if (!(n >= 2)) throw new Error('行番号が不正です: ' + v);
  return n;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
