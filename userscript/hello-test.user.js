// ==UserScript==
// @name         Userscripts 動作テスト
// @match        https://jumpcs.shueisha.co.jp/*
// @run-at       document-idle
// ==/UserScript==

// 対象サイトで画面上部に赤い帯が出れば Userscripts は正常に動いている
const bar = document.createElement('div');
bar.textContent = 'Userscripts 動作OK';
bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#d00;color:#fff;font-size:18px;text-align:center;padding:10px';
document.documentElement.appendChild(bar);
