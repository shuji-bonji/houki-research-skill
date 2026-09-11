# Changelog

## [0.5.1] - 2026-09-12

**patch リリース** — houki-egov-mcp v0.6.0 / houki-nta-mcp v0.14.0 で未知の引数がエラーになったのに合わせて、`next_actions[].example` の渡し方を直しました。手順そのものは v0.5.0 と同じです。

### 修正

- **`next_actions[].example` の渡し方**: `example` には `mcp` と `tool`（どの MCP のどの tool を呼ぶかを示すもの）が入っている。これを「そのまま `get_law` に渡す」と書いていたため、inputSchema に無い引数を拒む houki-egov-mcp v0.6.0 以上では `INVALID_ARGUMENT`（`mcp, tool: inputSchema に無い引数です`）になっていた。`mcp` と `tool` を除いた残りを引数にする、と書き直した（`SKILL.md` 鉄則 3、`workflows/tax-research.md` ステップ ④' と ④''、アンチパターン 1 件）
- **`examples/error-recovery-patterns.md` シナリオ 2**: 改正通達の docId が見つからないときの応答を、houki-nta-mcp v0.14.1 の実際の応答に差し替えた（`error` の文、`available_doc_ids` は `docId` / `title` / `issuedAt` のオブジェクト、`next_actions` は `nta_search_kaisei_tsutatsu`）。「`nta_search_tsutatsu` をそのまま実行」という説明文が JSON の `nta_search_kaisei_tsutatsu` と食い違っていたのも直した。DB にその種別の文書が 1 件も無いときとの違い（`next_actions` が `cli_bulk_download` になり `available_doc_ids` が付かない）も書いた
- **`docs/ERROR-HANDLING.md`**: 「ローカル DB に無い」節の見出しを、検索ツールだけでなく取得ツール（houki-nta-mcp v0.14.1 以上）も含む形にし、docId の誤りとの見分け方（`next_actions` が `cli_bulk_download` か、`available_doc_ids` が付くか）を書いた
- **`docs/ERROR-CODES.md`**: `INVALID_ARGUMENT` の説明に、inputSchema に無い引数もエラーになること（egov 0.6.0 以上 / nta 0.14.0 以上）と、`detail.issues[].path` に引数名が読点区切りで並ぶことを足した
- **`SKILL.md` 鉄則 5 の表**: 取得ツールの `DOC_NOT_FOUND` / `TSUTATSU_NOT_FOUND` に `available_doc_ids` が付くときは docId の誤りで、投入を案内しないことを足した
- 「鉄則 4 つ」という古い記述を「鉄則 5 つ」に直した（`SKILL.md`、`docs/ARCHITECTURE.md`）

### 更新

- 前提 MCP の注記に houki-nta-mcp v0.14.1（取得ツールの docId 誤りと DB 未投入の切り分け）を足した（`README.md` の表と `.github/workflows/release.yml` のリリースノート）。推奨最小バージョンは据え置き

## [0.5.0] - 2026-09-12

**minor リリース** — houki-nta-mcp 0.12.0〜0.14.0 への追随。質疑応答事例から、応答の `next_actions` に従って法律本文と通達へ戻る手順を足しました。検索ツールが返す `DOC_NOT_FOUND` (ローカル DB に無い) の扱いも足しました。業法の注意喚起・citation の階層は変わりません。

### 追加

- `SKILL.md` 鉄則 3 の見出しを「通達や質疑応答事例を先に引いたら、法律本文へ戻る」に広げた。`nta_get_qa` (`format: "json"`) の `related_laws` / `related_tsutatsu` / `next_actions` の行を表に足し、質疑応答事例では条・項・号が `example` に入っているので本文から補う手順は要らないこと、`format: "json"` を指定すること、`next_actions` が付かない参照 (租税条約・「旧」「改正前」の条文・条番号の無い法令・基本通達 4 種以外の通達) の扱いを書いた。タックスアンサーは「根拠法令等」の節を読んで `get_law` を引く、とだけ書いた
- `SKILL.md` 鉄則 5 の表と `docs/ERROR-HANDLING.md` に、検索ツールの `DOC_NOT_FOUND` (と空の DB での `TSUTATSU_NOT_FOUND`) を追加。`next_actions` が `cli_bulk_download` のときはフォールバックせず、「該当なし」と答えず、投入コマンドと DB のパスをユーザーに伝える
- `workflows/tax-research.md` にステップ ④'' (質疑応答事例から法律本文と通達へ戻る) を追加。シーケンス図、v0.12.0 の応答の実例 (消費税 02/19)、枝番号の号 (`item: "12の8"`、nta v0.14.0 + egov v0.6.0 以上)。アンチパターンに「質疑応答事例の回答だけで答える」「`nta_get_qa` を markdown のまま呼ぶ」「`qa.notice` を落とす」「`DOC_NOT_FOUND` を該当なしと答える」を足した
- `docs/CITATION.md` の「参考情報 (拘束力なし)」の例に質疑応答事例を足した (`qa.basisDate` と `qa.notice` の趣旨を注に書く)
- `docs/ARCHITECTURE.md` の応答契約の表に `related_laws` / `related_tsutatsu` / `qa.notice` / `qa.basisDate` を足し、成功時の `next_actions` の行に `nta_get_qa` を加えた

### 更新

- 前提 MCP の houki-nta-mcp を v0.11.0 以上から **v0.12.0 以上** に上げた (`README.md` の表と `.github/workflows/release.yml` のリリースノート)。v0.11.0 以上なら通達の手順は動く。houki-egov-mcp は v0.5.3 以上のまま (枝番号の号の `item` は v0.6.0 以上、と併記)

## [0.4.0] - 2026-09-11

**minor リリース** — houki-nta-mcp 0.11.0 への追随。通達を引いたあとに、応答の `next_actions` に従って法律本文へ戻る手順を足しました。業法の注意喚起・エラー契約・citation 書式は変わりません。

### 追加

- `SKILL.md` 鉄則 3 に「通達を先に引いたら、法律本文へ戻る」を追加。`nta_get_tsutatsu` の `base_laws`、`nta_search_tsutatsu` の `base_laws_by_tsutatsu`、成功時にも付く `next_actions` (`delegate_to_mcp` → houki-egov-mcp の `get_law`) の読み方と、条番号は通達の本文の参照 (「法第N条」「令第N条」) から補うことを書いた
- `workflows/tax-research.md` にステップ ④' (通達から法律本文へ戻る) を追加。シーケンス図、応答の例、`get_law` の呼び出し例 (消基通 1-7-2 → 消費税法 57 条の 2 第 4 項、所基通 49-39 → 所得税法施行令 138 条) と、`next_actions` を読まずに終えるアンチパターンを足した
- `docs/ARCHITECTURE.md` の応答契約の表に `base_laws` / `base_laws_by_tsutatsu` と成功時の `next_actions` を追加

### 更新

- 前提 MCP の houki-nta-mcp を v0.10.0 以上から **v0.11.0 以上** に上げた (`README.md` の表と `.github/workflows/release.yml` のリリースノート)。v0.10.x でもエラー契約は同じで動作はするが、上の手順のフィールドが無い

## [0.3.0] - 2026-09-10

**minor リリース** — 境界 ② (個別事案への当てはめ) で何を返し、何を返さないかを応答型として固定しました。手順・エラー契約・citation 書式は変わりません。

### 追加

- `docs/BUSINESS-LAW.md` 境界 ② に「応答型」を追加。返すもの (条文・通達・裁決の提示 / 制度の概観と改正履歴 / 論点の列挙 / 何が事実認定に依存するかの明示 / `legal_status` の階層) と、返さないもの (結論 / 可否の判定 / 金額・税額の確定 / 書類の起案・文案 / 推測) を表で固定した。**返さないものは注意喚起を添えても返さない**
- 同じ節に「なぜ返さないのか — 基準が書けないからではない」を追加。当てはめの基準は条文と通達に書いてあり、返さない理由は §1 の独占規定であることを明示した。「資料が揃えば将来は結論を返してよくなる」という読みを残さないため
- `docs/BUSINESS-LAW.md` §2 冒頭に、当てはめが判定の置き場所として **系の外** にあたることを追加。[houki-hub](https://github.com/shuji-bonji/houki-hub) の「判定の置き場所は 3 つではなく 4 つ」と語彙を揃えた
- `SKILL.md` 鉄則 1 に同じ応答型の表を置き、`docs/BUSINESS-LAW.md` の応答型へ導線を張った

### 修正

- `SKILL.md` 関連リンクの `README.md` が `skills/houki-research/README.md` を指していたのを `../../README.md` に修正 (リポジトリルートの README)

### 更新

- `docs/CITATION.md` の「ユーザーの問いと citation の最低粒度」で、個別事案への当てはめの行に応答型への参照を追加
- `README.md` の「業法独占への配慮」に、返すもの / 返さないものの要約を追加
- `README.md` の「何を提供するのか」を書き直した。「`npm install` するものではない」という否定形をやめ、**何の行動方針なのか** を 4 つの表 (業法独占規定への注意喚起 / 横断オーケストレーション / citation の標準化 / 業務外利用の境界設定) で示し、配布が claude-plugins marketplace 経由であることを書いた。図はそのまま
- `README.md` の「業法独占への配慮」を、応答型の表 + GitHub アラート (`[!IMPORTANT]` / `[!WARNING]`) に組み替えた。長い一続きの段落をやめた
- `README.md` のスコープ注記と推奨最小バージョン注記を `[!NOTE]` アラートにした
- `docs/BUSINESS-LAW.md` §6 メンテナンス方針に、応答型を変えるときは houki-hub と語彙を揃える旨を追加

## [0.2.1] - 2026-09-08

**patch リリース** — SKILL.md の記述の修正だけです。手順・エラー契約・citation 書式は変わりません。

### Fixed

- 鉄則 3 の「法律本文 (③) の入口は 3 つある」を「4 つ」に修正。v0.2.0 で `get_law` / `get_toc` / `search_law` / `search_fulltext` の 4 行の表を足したとき、直前の文が 3 つのままだった（plugin 経由で読み込んだ SKILL.md を確認して発見）

## [0.2.0] - 2026-09-07

MCP 側の更新（houki-egov-mcp 0.5.3 / houki-nta-mcp 0.10.2）に合わせた追随。Skill の正典（エラーコードの語彙・citation 書式・業法の注意喚起）は変えていない。

### 修正

- examples / workflows の `get_law` 呼び出し例が、存在しない引数 `lawNumber` を使っていたのを `law_name` に修正（6 か所）。egov 0.5.3 以降は `tools/list` の `inputSchema` で引数を検証するため、旧例文のままだと `INVALID_ARGUMENT` になる
- `examples/error-recovery-patterns.md` の `OUT_OF_SCOPE` シナリオを、実際に `OUT_OF_SCOPE` が返る呼び出し（`nta_get_tsutatsu` に法令名を渡す）に差し替え。旧例（`nta_get_tax_answer` に `id`）は引数名が `no` なので `INVALID_ARGUMENT` になっていた。`source_mcp_hint` の値も実装どおり `"houki-egov"` に修正

- `resolve_abbreviation` の呼び出し例が `name` を渡していたのを `abbr`（両 MCP の必須引数）に修正（2 か所）。`source_mcp_hint` の値も `"houki-nta"` / `"houki-egov"` に

### 追加

- `SKILL.md` 鉄則 3 と `workflows/tax-research.md` ステップ ③ に、法律本文の入口 4 つ（`get_law` / `get_toc` / `search_law` / `search_fulltext`）の使い分け表を追加。`search_fulltext` の `source: "api-fallback"` のときの振る舞い（本文検索が行われていないことを回答に明示し、`bulk_download_everything` を案内）を記載
- `docs/ERROR-HANDLING.md` / `docs/ERROR-CODES.md` の `INVALID_ARGUMENT` に、`detail.issues[].path` でどの引数かを特定する手順を追加

### 更新

- `examples/error-recovery-patterns.md` 末尾の対応表: houki-nta-mcp の構造化エラーを「Unreleased」から「v0.10.0+」に。引数検証の行を追加
- `docs/ARCHITECTURE.md` の配布形態を plugin 化後の状態に（`.claude-plugin/plugin.json` + claude-plugins marketplace）
- `README.md` と `release.yml` のリリースノートの推奨最小バージョンを egov 0.5.3 / nta 0.10.0 に

## [0.1.0] - 2026-05

初版。plugin 化と GitHub Release の自動化。
