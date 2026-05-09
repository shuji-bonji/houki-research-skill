# Workflows

`houki-research-skill` が想定する **横断 orchestration の典型ワークフロー**。分野ごとに 1 ファイルずつ。

## スコープ

このスキルは日本の **全法規** を対象とするため、本ディレクトリも **特定分野に限定しない**。現状は family の MCP がカバーする範囲が限られるため税務のサンプルから始まっているが、将来分野が増えても同じ構造で並べる。

## 一覧

| ファイル | 分野 | 主に使う MCP | 状態 |
|---|---|---|---|
| [`tax-research.md`](tax-research.md) | 税務リサーチ | houki-egov + houki-nta + pdf-reader | ✅ 利用可能 |
| `revision-tracking.md` | 改正履歴の追跡 (分野不問) | houki-egov + houki-nta + pdf-reader | 📅 (税務 / 労務などで具体化次第) |
| `labor-research.md` | 労務 (労基法・社会保険) | houki-egov + houki-mhlw-mcp (計画中) | 📅 houki-mhlw-mcp 完成後 |
| `civil-research.md` | 民事 (民法・民訴・民執) | houki-egov + houki-court-mcp (構想中) | 💭 houki-court-mcp 完成後 |
| `corporate-research.md` | 会社法・金商法 | houki-egov + 関連通達 | 💭 |
| `ip-research.md` | 知的財産 (特許・著作権) | houki-egov + houki-saiketsu-mcp (特許庁審判部) | 💭 |

新規ワークフローを追加するときは:

1. このディレクトリに `<topic>.md` を作成
2. 上記表に行を追加
3. SKILL.md / [`../examples/`](../examples/) に対応する実例を追加 (任意)

## 共通の構成

すべての workflow は以下の構成に従う:

1. **このワークフローを使う場面** — 適用条件と非適用条件
2. **フロー全体像** — Mermaid sequenceDiagram で MCP 呼び出し順を可視化
3. **各ステップの詳細** — どの MCP のどの tool を、どの引数で呼ぶか
4. **アンチパターン** — やってはいけない呼び方

## 鉄則 (全 workflow 共通)

- **業法独占判定** ([`../docs/BUSINESS-LAW.md`](../docs/BUSINESS-LAW.md)) を最初に行う
- **略称解決** (houki-abbreviations 系) を必ず通す
- **法律 → 通達 → 改正 → 添付 PDF** の順で引く
- **citation の階層を明示** ([`../docs/CITATION.md`](../docs/CITATION.md))
