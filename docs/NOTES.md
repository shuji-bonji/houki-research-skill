# 前提となる MCP の版ごとの違い

この文書は、Skill の手順が houki-egov-mcp・houki-nta-mcp のどの版から使えるかと、それより前の版で何が違うかをまとめたものです。README の「前提となる MCP 群」の表の詳しい説明にあたります。版は新しい順に並べています。

## houki-egov-mcp

### v0.20.0 — DB の状態ごとの案内と `--status`

- `search_fulltext` の `api-fallback` の `note` の先頭に DB のパスが入り、DB の状態ごとに文が分かれます
- `freshness.db_path` が付きます
- 案内のコマンドが `npx -y @shuji-bonji/houki-egov-mcp@latest <フラグ>` の形になります
- `--status` に「DB の場所の設定」の行と、同じフォルダーの別の DB の `[WARN]` の行が出ます

### v0.19.0 — DB の版 3

- `search_fulltext` は、版の合わない DB を使わずに `search_law` に切り替えます
- v0.18.x 以前に作った DB は使えません。v0.19.0 以上の `--bulk-download-everything`（全件の zip 約 290 MB）で作り直してください。作り直すまで、`search_fulltext` は条文本文を探しません
- 作り直した DB を v0.18.x 以前で開くと、全テーブルが消えます。作り直した後は、CLI と MCP サーバー（plugin）の版を v0.19.0 以上にそろえてください

### v0.18.0 — 法令の引き当て

- 法令名の完全一致が無いとき、候補付きの `LAW_NOT_FOUND` を返します
- 時点 `at` が 2017-04-01 より前のときは `INVALID_ARGUMENT` を返します
- `get_article_references` の `kind: "suppl"` と、`get_law` / `verify_citations` の `suppl_index` が使えます
- `search_fulltext` に管轄外の略称を渡すと `OUT_OF_SCOPE` を返します
- `search_law` / `search_fulltext` に `domain` を渡さないでください

### v0.17.0 — 応答の形

- `get_law_revisions` は施行日の新しい順に並びます
- `meta.at` など、値の無いキーが `null` で付きます
- `INTERNAL_ERROR` / `UNKNOWN_TOOL` は `retryable: false` です

### v0.16.0 — エラーの code

- `save: true` で上限を超えると `FILE_TOO_LARGE` を返します
- 検索の通信の失敗を、`LAW_NOT_FOUND` ではなく `SOURCE_*` で返します
- `search_law` に管轄外の略称を渡すと `OUT_OF_SCOPE` を返します

### v0.15.0 — 別表・様式の図

- feasibility-check の ⑤ で、別表・様式の図を `list_attachments` で取れます。それより前の版では、e-Gov のサイトで図を見ます

### v0.11.0 — 引用の実在確認

- 鉄則 4 の引用の実在確認（`verify_citations`）が使えます。それより前の版では、この手順を飛ばします

### v0.10.1 — 委任先をたどる

- feasibility-check の ⑤ で、委任先を `get_related_laws` / `get_article_references` でたどれます。それより前の版では、`law_type` を指定した `search_law` に切り替えます

### v0.6.0 — 枝番号の号

- 枝番号の号（`item: "12の8"`）を指定できます

### v0.5.3 — 全文検索と引数の検査

- `search_fulltext` と、`INVALID_ARGUMENT` の `detail.issues` が使えます

### v0.2.0 — 動作する最低版

- Skill は動きますが、この文書に書いた手順の多くが使えません

## houki-nta-mcp

### v0.27.0 — 入る権限の無いフォルダーの DB と、取り込めない通達

- 置き場所のフォルダー（またはパスの途中のフォルダー）に入る権限が無いローカル DB を「開けない」と判定します。`--status` は `[ERROR] DB を開けません: EACCES: パスの途中のフォルダーに入る権限がありません (<フォルダー>)` を出して終了コード 1 で終わり、読むだけのツールは `hint` が `ローカル DB（<パス>）を開けません` で始まる応答を返します。v0.26.x 以前は、`--status` が「DB がまだありません」を出して終了コード 0 で終わり、読むだけのツールは投入を案内しますが、投入しても直りません
- `nta_get_tsutatsu` で基本通達 4 種以外の通達（`電帳法取通` など）を求めると、投入のコマンドを案内せず、`hint` で今は取り込めないことを返します。v0.26.x 以前が案内するコマンドは、実行すると終了コード 2 で止まります

### v0.26.0 — 開けない DB

- ローカル DB を開けないとき、読むだけのツールは `DOC_NOT_FOUND` / `TSUTATSU_NOT_FOUND`（`hint` が `ローカル DB（<パス>）を開けません` で始まる）を返します。v0.25.x 以前は `INTERNAL_ERROR` です
- 同じとき、書き戻す 3 ツール（`nta_get_tsutatsu` / `nta_get_qa` / `nta_get_tax_answer`）は DB を使わずに国税庁サイトから取って返し、MCP サーバーのログに `warn` の行を出します
- `--bulk-download-tax-answer` は、タックスアンサーの索引を DB に保存できなくても記事の取り込みを続け、`[WARN]` の行を出します

### v0.25.0 — DB の状態ごとの案内と `--status`

- 「DB に 1 件も無い」ときの `hint` の先頭に DB のパスが入り、DB の状態ごとに文が分かれます
- 検索 6 ツールに `freshness.db_path` が付きます（`freshness` は常に付きます）
- 案内のコマンドが `npx -y @shuji-bonji/houki-nta-mcp@latest <フラグ>` の形になります
- CLI の `--status` が使えます

### v0.24.1 — 索引から消えた文書と `freshness`

- 検索の `freshness` は、国税庁の索引から消えた文書を範囲に入れません

### v0.24.0 — 通信の失敗の code と DB の版 12

- 国税庁サイトとの通信の失敗を `SOURCE_TIMEOUT` / `SOURCE_RATE_LIMITED` / `SOURCE_UNAVAILABLE` / `SOURCE_API_ERROR` に分けます。403・400 の `SOURCE_API_ERROR` は `retryable: false` です
- `nta_get_tax_answer` で 8xxx 帯（災害関係）を取れます
- 事務運営指針の `legal_status.note` の文が変わります
- `nta_search_qa` に `domain` を渡さないでください
- DB の版が 12 になります。v0.23.x 以前で作った DB は、v0.24.0 の CLI かツールが最初に開いたときに、行を保ったまま移行されます。取り込み直しは要りません。移行した DB を v0.23.x 以前で開くと全テーブルが消えて作り直されるので、v0.23.x 以前に戻すときは `HOUKI_NTA_DB_PATH` で別の DB ファイルを指してください

### v0.23.0 — 応答の形

- 索引にある文書の `index_status: null` など、値の無いキーが `null` で付きます
- タックスアンサーに `basisDate` が付きます
- `INTERNAL_ERROR` / `UNKNOWN_TOOL` は `retryable: false` です

### v0.22.0 — 取得ツールの `DOC_NOT_FOUND`

- 改正通達・事務運営指針の取得で docId が無いときは `DOC_NOT_FOUND` を返します。それより前の版では `TSUTATSU_NOT_FOUND` です
- `nta_get_qa` / `nta_get_tax_answer` でページが無いときは `DOC_NOT_FOUND` を返します。それより前の版では `SOURCE_API_ERROR` です

### v0.20.0 — 改正通達の新旧対照表

- 改正通達の「別紙 N」が `comparison` で返ります。v0.19.x では、`kind` を付けずに全件を見ます

### v0.19.0 — 添付 PDF の読み方

- 添付 PDF の `read_strategy` / `layout_note` / `save: true` / `next_actions` が使えます。それより前の版では、`reader_hints.examples` の `url` を `read_url` に渡します

### v0.17.0 — 索引から消えた文書の印

- 索引から消えた文書に `index_status` が付きます

### v0.16.0 — 取得元の `source`

- 取得ツールの応答に `source` が付きます

### v0.14.1 — docId の誤りと未投入の見分け

- 取得ツールで、docId の誤りと DB への未投入を見分けられます

### v0.14.0 — 枝番号の号

- 枝番号の号の `item` を指定できます

### v0.13.0 — 検索の `DOC_NOT_FOUND`

- 検索で、その種別の文書が DB に 1 件も無いときに `DOC_NOT_FOUND` を返します

### v0.12.0 — 質疑応答事例から法律本文と通達へ

- 質疑応答事例の `related_laws` と `next_actions` で、法律本文と通達へ戻る手順が使えます

### v0.11.0 / v0.7.0 — 動作する最低版

- v0.11.0 以上なら、通達の手順が動きます
- v0.7.0 以上なら、Skill は動きます
