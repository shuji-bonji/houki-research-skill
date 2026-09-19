# Changelog

## [0.9.0] - 2026-09-19

**minor リリース** — feasibility-check の ⑤（委任先へ下りる）を、houki-egov-mcp v0.10.1 の `get_related_laws` → `get_article_references` → `get_law` の 3 手に書き直しました。ほかのステップは変わりません。

### 更新（`workflows/feasibility-check.md`）

- ⑤: 施行令・施行規則は `get_related_laws` で引く（名前の規則で作った候補のうち e-Gov に実在するものだけが `related[]` に、無かった候補は `not_found[]` に入る）。条文の「政令で定める」「財務省令で定める」がどの下位法令を指すかは `get_article_references` の `delegations[].target_law`（法令単位。条は決めない）。条は `next_actions` の `search_fulltext`（ローカル DB）か `get_toc` の見出しで探す
- ⑤: 施行規則の条に `get_article_references` を当てると、準用先（二段目の委任）が `references[]` に `get_law` の引数の形で入る。「法第N条」は親の法律に解決される。「第二条第二項第二号及び第六項第五号」の後半は `article_from` 付きで 2 条の項になる（egov 0.10.1 以上）
- ⑤: `references[].kind` の読み方の表。`relative`（「前項」「同条第六項第五号」）は解決されないので、本文を読んで指す先を決める。`resolved: false` の `external` は「未確認」に書く
- ⑤: egov が v0.10.0 より前のときの手順（`law_type` 指定の `search_law`）は残した
- アンチパターンに 2 つ追加（`references` が空でも「引いていない」と書かない / `relative` を解決済みとして citation に書かない）
- `examples/electronic-bookkeeping.md` の末尾に、⑤ を egov 0.10.1 で通し直した再実測を追加

### 前提の版

- houki-egov-mcp v0.10.1 以上で ⑤ の 3 手が使える（0.10.0 では「第六項第五号」を 4 条の項として返す）。それより前でも動作はする

## [0.8.1] - 2026-09-19

**patch リリース** — feasibility-check を実際の問いで 1 回通し、その記録を `examples/electronic-bookkeeping.md` に置きました。通してみて分かったことを手順書に 4 点戻しています。手順の骨は v0.8.0 と同じです。

### 追加

- **`examples/electronic-bookkeeping.md`**: 「メールで届いた領収書の PDF を保存する機能」を題材に、houki-egov-mcp v0.6.1 / houki-nta-mcp v0.18.1 の dev サーバーで 2026-09-19 に実測した記録。12 回の呼び出しで、電帳法 7 条 → 2 条 1 項 5 号（定義に「領収書」）→ 施行規則 4 条 → 準用先の 2 条 6 項 5 号（検索要件）→ 法人税法施行規則 59 条（7 年）→ タックスアンサー 5930 → 2027-01-01 施行の未施行改正（`at` で取った 7 条は現行と同一）まで揃え、仕様の要素 × 条文 × 要件の表で返す形を示した

### 更新（`workflows/feasibility-check.md`）

- ②: 同じ語を使う別分野の法令（関税法）が当たることがあるので、**除外した法令と理由も「探した語」と一緒に回答に書く**
- ⑤: ローカル DB があると `search_fulltext` 1 回で法律の条と施行規則の条が両方当たる。当たっていればそのまま取り、無いときだけ `law_type` で探す
- ⑤: **規則の条がさらに同じ規則の別の条を準用している**（二段目の委任）ことがある。準用先も取り、取らなかったものは「未確認」に書く
- ⑥: 未施行の改正があるときは `get_law` の `at` にその施行日を入れると、その版の条文が取れる。どの条が変わるかは追わない（`revision-tracking.md`）
- 「例」を予定から実測へ差し替え

## [0.8.0] - 2026-09-19

**minor リリース** — 「実装する前に、その仕様が法令のどこに触れるかを条文で確かめる」問いのための workflow を足し、workflow を問いの形で選ぶ表を SKILL.md に置きました。既存の手順 (tax-research・鉄則・citation) は変わりません。

### 追加

- **`workflows/feasibility-check.md`**: 仕様の各要素が、どの法令のどの条に触れ、その条は何を求めているかを、条文・委任先 (施行令・施行規則)・施行日まで揃えて返す手順。7 ステップ
  - ② 仕様の語を法令の語に置き換える工程を明示し、**探した語と探せなかった語を回答に残す**ことを要件にした。設計語と法令語の置き換えは LLM の推測なので、見せないと利用者が探し漏れに気づけない
  - ⑤ 委任先へ下りる工程。法律の条に「政令で定める」「〜省令で定める」があれば、`search_law` に `law_type: "CabinetOrder"` / `"MinisterialOrdinance"` を付けて施行令・施行規則を引く。houki-egov-mcp に委任先を辿るツールが無い間 (houki-egov-mcp#20 で予定) の手順
  - ⑥ `get_law_revisions` で `current_revision_status: "UnEnforced"` (公布済み未施行) を見る。実装が稼働するのは数か月先なので、現行だけでは足りない
  - ⑦ 回答は「仕様の要素 × 触れる条文 × 条文が求めること × 委任先 × 通達・Q&A (`legal_status`) × 施行日 × 未確認」の表。**「適法です」「問題ありません」は返さない** (自己の事務なので進めてよいが、可否に答えた時点で当てはめになる)
  - houki-nta-mcp の基本通達 4 種に電子帳簿保存法の取扱通達が無いことを書き、無いときは「対象外」と答えて国税庁の URL を案内する
- **SKILL.md「典型ワークフロー」に「問いの形 → workflow」の表**: 利用者が名乗る立場 (エンジニア / 納税者本人 / MCP を組む開発者) ではなく、問いの形で選ぶ。同じ人の問いが途中で別の行に移ったら行を変える。MCP を組み込む開発者には workflow ではなく `docs/ARCHITECTURE.md` / `ERROR-CODES.md` / `tools/list` を案内する
- **SKILL.md の `description` と「いつこの skill を使うか」**: 「この仕様は法令のどこに触れるか」「この機能の法令上の要件は」でも発火するようにした。`description` の先頭は「全法規を横断調査する Skill」のままにし、問いの形を 4 つ並べる形にした (先頭を実装前の確認に絞ると、通達の根拠や個別の事案の問いで発火しなくなるため。README や marketplace の「入口の 1 行」とは役割が違う)

### 更新

- `workflows/README.md` と `examples/README.md` の一覧に feasibility-check を足した。`electronic-bookkeeping.md` (予定) の関連 workflow を tax-research から feasibility-check に変えた
- `.claude-plugin/plugin.json` の `description` に、問いの形ごとの手順 (実装前の確認 / 通達から根拠条文へ / 改正はいつから) と「法律で決まっている」と「通達でそうなっている」を混ぜないことを足した (houki-hub#22 の (c))

### 背景

houki-hub#22 の (c) で、family の入口の 1 行を「実装する前に、その仕様が法令のどこに触れるかを条文で確かめる」に決めた。名前に掲げた問いの形に対応する手順書が無かったので、この版で足した。利用者ごとの違いを MCP ではなく Skill の workflow に置く方針 (houki-hub の `docs/notes/2026-09-19-job-name-and-listing.md` §8) の最初の実装。

## [0.7.0] - 2026-09-14

**minor リリース** — この skill を入れると、前提の MCP 2 つ (`houki-egov-mcp` / `houki-nta-mcp`) も一緒に入るようにしました。手順そのものは v0.6.0 と同じです。

### 追加

- **`.claude-plugin/plugin.json` に `dependencies`**: `["houki-egov-mcp", "houki-nta-mcp"]`。marketplace 経由で `houki-research` を install すると、この 2 つも解決して install される。有効化も連動する (この skill を有効にすると 2 つも有効になり、どちらかを単独で無効にしようとすると止められる)
  - 版の範囲は付けず、名前だけを書いた。範囲を付けると `houki-egov-mcp--v0.6.0` の形の git tag が要るが、各 MCP のタグは `v0.6.0` の形なので解決できない。名前だけなら marketplace の最新が入る
  - `@shuji-bonji/pdf-reader-mcp` は入れていない。PDF に当たったときだけ要るもので、条文と通達を引く流れでは使わない。houki-nta-mcp #36 (改正通達の PDF の読み方) の結論が出てから決める
  - `@shuji-bonji/houki-abbreviations` は各 MCP に内蔵されるライブラリで、plugin ではないため対象外
- **`shuji-bonji/claude-plugins` の `marketplace.json`** の `houki-research` にも同じ `dependencies` を書いた (pdf-publish / pdf-trust / pdf-read と同じ形)

### 背景

houki-hub#22 (発見性 — 1 種類の仕事を 1 回の導入で終わらせる)。これまでは `houki-research` / `houki-egov-mcp` / `houki-nta-mcp` を 3 回入れる必要があった。

なお、これで減るのは導入の**手数**であって**時間**ではない。入れた直後に houki-egov-mcp は約 290 MB、houki-nta-mcp は 6 種別で約 100 分の取り込みが要る。時間のほうは houki-nta-mcp #35 で扱う。

## [0.6.0] - 2026-09-13

**minor リリース** — houki-nta-mcp v0.16.0 / v0.17.0 への追随。国税庁の索引から外れた文書を、現在の取扱いの根拠として引用しない手順を足しました。取得ツールが返す `source` で取得時刻の意味が変わる点も足しました。業法の注意喚起・citation の階層は変わりません。

### 追加

- **`SKILL.md` 鉄則 3 に「索引から消えた文書は現行の取扱いとして引用しない」**: `nta_search_*` の各件と `nta_get_*` の応答に `index_status: "removed_from_index"` と `orphaned_at` が付く (houki-nta-mcp v0.17.0 以上)。houki-nta-mcp は索引から外れた文書を削除せず残すので、検索結果には索引にある文書と同じ形で並ぶ。過去の課税期間を調べるときは引けるが、現在の取扱いを答える根拠にはしない。現行の文書を探し直し、見つからなければ断定しない
  - `freshness` の `stale` / `outdated` とは別のことを指す点も書いた。`freshness` は「最後に取得してから日が経った」、`index_status` は「国税庁の索引から外れた」で、ローカル DB が新しくても印は付く
  - houki-nta-mcp が v0.16.x 以前だと印が付かないため、`sourceUrl` が 404 になる文書に当たったらその旨を citation に書く、という退避も書いた
- **`SKILL.md` 鉄則 3 に「取得ツールの `source` は取得時刻の意味を変える」**: `nta_get_qa` / `nta_get_tax_answer` は v0.16.0 からローカル DB を先に引く。`source: "db"` のときの `fetchedAt` は bulk download で取り込んだ日時で、呼び出した時刻ではない。citation にはその値をそのまま書き、呼び出した時刻に置き換えない
- **`docs/CITATION.md` の基本原則に 6 つ目**: 索引から消えた文書には印を添える。見出しは元の種別 (行政解釈 / 参考情報) のままにし、専用の見出しは作らない。標準フォーマットの「行政解釈」に書き方の例を 1 件足した
- **`docs/CITATION.md` の基本原則 3**: 取得時刻は `source: "db"` ならローカル DB に取り込んだ日時である旨を足した
- **`docs/CITATION.md` の階層ラベルの対応表**: 索引から外れた資料の行を足した
- **`docs/ARCHITECTURE.md` の応答契約の表**: `source` と `index_status` / `orphaned_at` の行を足した

### 更新

- 前提 MCP の注記に houki-nta-mcp v0.16.0 (取得ツールの `source`) と v0.17.0 (`index_status`) を足した (`README.md` の表と `.github/workflows/release.yml` のリリースノート)。推奨最小バージョンは v0.12.0 のまま据え置き。どちらも応答に項目が増えるだけで、無くても手順は動く

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
