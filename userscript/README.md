# JCS 自動入力（iPhone Userscripts × スプレッドシート）

Google スプレッドシートアプリでコピーした行を貼り付けるだけで、ジャンプキャラクターズストアの入力欄に入力します。
GAS などの設置は不要です。**送信・reCAPTCHA・セキュリティコードは手動**です。

## ファイル

| ファイル | 役割 |
| --- | --- |
| `jumpcs-autofill.user.js` | Userscripts に入れるスクリプト本体。入力欄との対応表 `MAP` もここ |
| `test/demo.html` | 動作確認用のダミーフォーム |

## スプレッドシートの列（並びを変えないこと）

```
A ProfileName  B LastName  C FirstName  D LastKana  E FirstKana  F LastRoman  G FirstRoman
H Email  I Username  J Password  K State  L City  M Address  N Address2  O Address3
P Tel  Q ZipCode  R Birth_year  S Birth_month  T Birth_day  U Sex  V CardType
W CardNumber  X Month  Y Year  Z Cvv（入力しない）
```

`01`/`1`、`2028`/`28`、`男`/`男性` などの表記ゆれは自動で吸収します。

## 設置（iPhone）

1. App Store で「Userscripts」（無料）をインストール
2. 設定 → アプリ → Safari → 機能拡張 → Userscripts をオンにし、jumpcs.shueisha.co.jp を「許可」
3. Userscripts アプリを開き、スクリプトの保存フォルダを指定
4. Safari で対象サイトを開き、アドレスバーの「ぁあ」→ Userscripts →「＋」→ New JS
5. `jumpcs-autofill.user.js` の内容を全部貼り付けて保存

## 使い方

1. スプレッドシートアプリで行番号をタップして行を選択 →「コピー」（複数行まとめてもOK。見出し行が混ざっても無視します）
2. 対象サイトで右下の「自動入力」→ 枠を長押しして「ペースト」→「読み込む」
3. 複数行なら一覧からプロフィールを選ぶ → 入力された欄は緑枠
4. 以後は「自動入力」を押すだけで同じプロフィールを入力。「プロフィールを変更」で切替、「消去」で記憶を削除

貼り付けたデータは Userscripts の保存領域（この iPhone の中）にだけ保存されます。

## 入力されない項目があるとき

パネルの「調査」を押すと、そのページの入力欄一覧（入力値は含まない）がコピーされます。
それを開発者に送る → `MAP` の `names` に追加 → スクリプトを上書き、で対応します。

## Userscripts が動かないとき

- `hello-test.user.js` を Userscripts に入れて対象サイトを開き、上部に赤い帯が出るか確認（出なければ Userscripts の設定の問題）
- 代わりにブックマークレットでも同じ機能が使えます（`bookmarklet.txt`）:
  1. Safari で適当なページをブックマークに追加（名前「自動入力」）
  2. ブックマーク編集で URL を `bookmarklet.txt` の中身（`javascript:` から始まる1行）に置き換え
  3. 対象ページでアドレスバーをタップ →「自動入力」ブックマークを選ぶ
  - ブックマークレットでは貼り付けたデータはタブを閉じると消えます

`bookmarklet.txt` の作り直し（スクリプト修正後）:

```sh
npx terser userscript/jumpcs-autofill.user.js -c -m --ecma 2020 -o /tmp/min.js
node -e "const c=require('fs').readFileSync('/tmp/min.js','utf8').trim().replace(/;$/,'');require('fs').writeFileSync('userscript/bookmarklet.txt','javascript:'+encodeURIComponent(c)+'\n')"
```
