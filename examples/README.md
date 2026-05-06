# Examples

`houki-research-skill` の **具体的な session 例** (LLM 向け few-shot)。`workflows/` の抽象フローを実際のユーザー問いに当てはめた完全 walkthrough。

## スコープ

[`../workflows/README.md`](../workflows/README.md) と同じく、特定分野に限定しない。日本の **全法規** が対象。

## 一覧

| ファイル | 分野 | 関連 workflow | 状態 |
|---|---|---|---|
| [`invoice-registration.md`](invoice-registration.md) | 税務 (インボイス制度・登録番号) | [`../workflows/tax-research.md`](../workflows/tax-research.md) | ✅ |
| `electronic-bookkeeping.md` | 税務 (電子帳簿保存法) | tax-research | 📅 (実利用で追加) |
| `inheritance-tax-revision.md` | 税務 (相続税法の改正追跡) | tax-research / revision-tracking | 📅 |
| `working-hours-cap.md` | 労務 (時間外労働の上限規制) | labor-research | 📅 houki-mhlw-mcp 完成後 |
| `civil-procedure-revision.md` | 民事 (民訴法 IT 化改正) | civil-research | 💭 houki-court-mcp 完成後 |

## 何を例として残すか

例は「Skill が役立った具体的な問い」をそのまま記録する。以下の 5 要素が揃っていること:

1. **問い** — ユーザーの自然文 (略称・個別 / 一般の境界がわかる形)
2. **Skill の動作** — 8 ステップ (`workflows/tax-research.md` 参照) のどこをどう実行したか
3. **MCP 呼び出しの引数** — 実行可能な JSON スニペット
4. **期待される回答** — citation 含む完全な Markdown 出力
5. **アンチパターン** — このユースケースで避けるべき呼び方

## なぜ examples を分けるか

- workflows/ は **抽象化された手順書** (どんな問いにも適用可能)
- examples/ は **具体化された walkthrough** (実例をそのまま見せる)

LLM は few-shot 学習が強いので、抽象 + 具体の両方を提示することで「どんな問いに、どんな順序で、どんな回答を返すか」をパターンとして取り込みやすくなる。
