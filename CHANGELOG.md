# Changelog

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
