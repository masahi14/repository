# 歯科カルテ ワンクリックセット入力ツール

歯科医院の電子カルテ入力ソフトで、毎回同じ組み合わせで手作業により選択・入力している処置コード・指導文言を、画面隅の小さなボタンパネルからワンクリックで自動入力するためのツール(Windows / AutoHotkey v2)。

詳細は以下を参照してください。

- [docs/requirements.md](docs/requirements.md) — 背景・要件・安全制約
- [docs/architecture.md](docs/architecture.md) — 設計・アーキテクチャ
- [docs/admin-guide.md](docs/admin-guide.md) — セット内容(`config/sets.json`)の編集方法
- [docs/operation-manual.md](docs/operation-manual.md) — スタッフ向け操作マニュアル
- [deploy/deploy-readme.md](deploy/deploy-readme.md) — 20台のPCへの配布手順
- [tests/manual-test-harness/test-checklist.md](tests/manual-test-harness/test-checklist.md) — 動作確認手順

## 最重要の安全制約

本ツールは、臨床的な事実に基づく処置コード・定型文言のみを自動入力します。血圧・SpO2・実施時刻などの**実測値は一切自動生成しません**。詳細は [docs/requirements.md](docs/requirements.md) を参照してください。
