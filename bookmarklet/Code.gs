/**
 * スプレッドシート → ブックマークレット 連携用 Google Apps Script（読み取り専用）
 *
 * 設置手順:
 *   1. 入力データのスプレッドシートを開き「拡張機能 > Apps Script」を開く
 *   2. このファイルの内容を丸ごと貼り付け、下の TOKEN を自分だけの合言葉に変更して保存
 *   3. 「デプロイ > 新しいデプロイ > 種類: ウェブアプリ」
 *        次のユーザーとして実行: 自分
 *        アクセスできるユーザー: 全員
 *   4. 発行された URL（…/exec）と TOKEN をブックマークレット作成ページに入力
 *
 * シートの形式:
 *   1行目 = 見出し（ProfileName, LastName, ... , Cvv の A〜Z 列）
 *   2行目以降 = 1行 = 1プロフィール
 */

// ===== 設定 =====
var SHEET_NAME = '';                 // データのシート名。空なら先頭のシート
var TOKEN = 'ここを自分だけの合言葉に変更'; // 必須。URL を知っている人がデータを読めないようにするため
var EXCLUDE_HEADERS = ['Cvv'];       // ブックマークレットに渡さない列（セキュリティコードは渡さない）
// ================

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'list';
  try {
    if (!TOKEN || TOKEN === 'ここを自分だけの合言葉に変更') throw new Error('Code.gs の TOKEN を設定してください');
    if (p.token !== TOKEN) throw new Error('トークンが一致しません');
    if (action === 'list') return json_({ ok: true, profiles: listProfiles_() });
    if (action === 'get') return json_({ ok: true, row: toRowNumber_(p.row), data: getRow_(toRowNumber_(p.row)) });
    if (action === 'page') return page_(p);
    throw new Error('不明な action: ' + action);
  } catch (err) {
    if (action === 'page') return html_('<p>エラー: ' + escapeHtml_(err.message) + '</p>');
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

/**
 * 対象サイトの制限でブックマークレットから直接通信できない場合の予備手段。
 * ?action=page&token=… でプロフィール一覧、&row=N でその行のデータ（コピー用）を表示する。
 */
function page_(p) {
  var base = ScriptApp.getService().getUrl() + '?action=page&token=' + encodeURIComponent(p.token);
  if (!p.row) {
    var items = listProfiles_().map(function (x) {
      return '<a href="' + escapeHtml_(base + '&row=' + x.row) + '" target="_top" style="display:block;padding:14px;margin:8px 0;' +
        'border:1px solid #ccc;border-radius:8px;text-decoration:none;color:#222">' +
        escapeHtml_(x.name) + '<small style="color:#888">（' + x.row + '行目）</small></a>';
    }).join('');
    return html_('<h2>プロフィールを選択</h2>' + (items || '<p>データがありません</p>'));
  }
  var row = toRowNumber_(p.row);
  var text = JSON.stringify({ row: row, data: getRow_(row) });
  return html_(
    '<h2>' + row + '行目のデータ</h2>' +
    '<textarea id="t" readonly style="width:100%;height:30vh;font-size:13px">' + escapeHtml_(text) + '</textarea>' +
    '<button id="b" style="width:100%;padding:16px;font-size:18px;margin-top:12px">コピーする</button>' +
    '<p>コピー後、元のページに戻りブックマークレットの「貼り付け」を押して貼り付けてください。</p>' +
    '<script>document.getElementById("b").onclick=function(){var t=document.getElementById("t");' +
    't.focus();t.select();t.setSelectionRange(0,t.value.length);var ok=function(){alert("コピーしました")};' +
    'if(navigator.clipboard){navigator.clipboard.writeText(t.value).then(ok,function(){document.execCommand("copy");ok()})}' +
    'else{document.execCommand("copy");ok()}};</script>');
}

function toRowNumber_(v) {
  var n = parseInt(v, 10);
  if (!(n >= 2)) throw new Error('行番号が不正です: ' + v);
  return n;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function html_(body) {
  return HtmlService.createHtmlOutput('<div style="font-family:sans-serif;padding:12px;font-size:16px">' + body + '</div>')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
