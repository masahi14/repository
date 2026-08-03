# アーキテクチャ・設計原則

## 設計原則(最優先事項)

**本ツールは、術式コードの入力とEnter送信のみを行い、いかなる測定値・時刻・数量も生成・入力しない。**

これはこのプロジェクトにおける唯一かつ最も重要な制約であり、以下のコードを変更・追加する際は必ずこの原則に反していないかを確認すること。この制約が必要な理由は [requirements.md](./requirements.md) の「最重要の安全制約」を参照。

## 全体アーキテクチャ

```
[常時表示パネル(ボタン群)] --クリック--> [InputEngine]
                                            |
        SelectionEngine(パターンB専用) <----+---- [ConfigLoader] <--- config/sets.json
                                            |                          config/settings.json
                                            v
                                     SendInput(コード) -> Sleep -> SendInput(Enter) -> Sleep -> 次のコード...
```

- `main.ahk` が起動時に `ConfigLoader` で JSON を読み込み、`Panel` を生成する。
- ボタン押下 → `InputEngine.RunSet(setId)` が呼ばれる。
- パターンA(固定フルセット)は `items` 配列を先頭から順番に流すだけ。
- パターンB(ランダム抽出セット)のみ `SelectionEngine` が「コードの選択」をランダムに行う。**数値の生成は一切行わない**。
- `then: "leave_blank_manual_entry"` フラグが付いた項目は、コード確定後は自動で何も送らず処理を終了する。

## 主要コンポーネント

| ファイル | 役割 |
|---|---|
| `src/main.ahk` | エントリポイント。起動時に設定を読み込みパネルを表示する。 |
| `src/lib/ConfigLoader.ahk` | `config/sets.json` / `config/settings.json` の読込・スキーマ検証。 |
| `src/lib/Panel.ahk` | 常時表示ボタンパネルGUI。位置の保存・復元も担当。 |
| `src/lib/InputEngine.ahk` | `SendCodeAndEnter(code)` のみを提供し、固定順序送信とランダム抽出結果の送信を実行する。**数値・時刻を送信する関数は実装しない。** |
| `src/lib/SelectionEngine.ahk` | プールからN個を重複なくランダム選択してコード配列を返すのみ。数値そのものを返す機能は持たない。 |
| `src/lib/Logger.ahk` | 実行ログ(セットID・時刻のみ、患者情報は含めない)。 |

## ボタンパネルGUIの実装方式

`Gui +AlwaysOnTop +ToolWindow -Caption` で枠なし・タスクバー非表示の小パネルを作成する。

重要ポイント: **拡張スタイル `WS_EX_NOACTIVATE` (0x08000000) を付与**し、パネルをクリックしてもWindowsのフォアグラウンドウィンドウが切り替わらないようにする。これにより「ボタンを押した瞬間にカルテソフトの入力欄からフォーカスが外れる」問題を回避する。これが本ツールの技術的な要である。

念のためのフォールバックとして、送信直前に記録しておいた直近のアクティブウィンドウへ `WinActivate` で明示的に戻す処理も用意する(NOACTIVATEが一部Windows環境で効かないケースへの保険)。

パネル位置はドラッグ移動可能にし、終了時の座標を `%LOCALAPPDATA%\DentalKartePanel\panel_position.json` に保存、次回起動時に復元する。

## キー送信の安全性

```ahk
SendMode "Input"        ; 高信頼なSendInput APIを使用
SetKeyDelay -1, 10       ; キー間隔を明示制御
```

1コードごとの処理:

1. `SendInput` で5桁の数字を送信する。
2. `Sleep after_code_ms` (候補表示待ち)。
3. `SendInput {Enter}` を送信する。
4. `Sleep after_enter_ms` (リスト確定待ち)。

待機時間は `config/settings.json` の `timing` に外出しし、実機での反応速度に応じて現地調整できるようにする。実行中はパネルの全ボタンを一時無効化し、誤操作による二重実行を防ぐ。

`settings.json` の `test_mode: true` のときは実際のキー送信を行わず、`Logger` が「送信されたはずの内容」をログファイルに書き出すだけの安全確認モードで動作する。

## 数値自動生成を行わないことの担保(多層防御)

1. **関数レベルでの分離**: `InputEngine.ahk` には `SendCodeAndEnter(code)` のみが存在する。「数値・時刻を生成して送信する関数」自体をコードベースに一切実装しない。
2. **`SelectionEngine.ahk` の役割を限定**: `Random()` の使用は「プールからN個のコードを重複なく選ぶ」ためだけに限定する。数値そのもの(血圧値、実施時間等)を返す関数は存在しない。
3. **スキーマバリデーションのガード**: `config/sets.schema.json` で `additionalProperties: false` にし、`value`・`time`・`bp`・`spo2` のような数値系フィールド名が将来誤って追加されても起動時エラーで弾く。
4. **`leave_blank_manual_entry` の実装**: この値が来た項目は「Enter送信後、処理を終了」のみ。ここに追加のキー送信ロジックを書けないよう、コードコメントで明示する。
5. **静的チェック**: `tests/config-validation/check-forbidden-patterns.ps1` が、疑わしい数値送信パターンをリポジトリ全体からスキャンし検出する。

## 設定ファイルの形式

`config/sets.json` の `pattern` フィールドは `"fixed_sequence"` (パターンA) または `"random_pool"` (パターンB) のみを許容する。`fixed_sequence` の `items` はコードを実行順に並べた配列のみで、値の自動入力に関わるフィールド(`value`, `time`, `mmHg` など)はスキーマ上そもそも存在しない。詳細は `config/sets.schema.json` を参照。

## ディレクトリ構成

```
repository/
├── docs/                         # requirements.md, architecture.md, admin-guide.md, operation-manual.md
├── config/                       # sets.json, settings.json, sets.schema.json
├── src/
│   ├── main.ahk
│   └── lib/                      # ConfigLoader, Panel, InputEngine, SelectionEngine, Logger
├── vendor/                       # サードパーティJSONパーサ
├── build/                        # build.ps1 (exe化)
├── deploy/                       # deploy-readme.md, install-startup.ps1
└── tests/
    ├── manual-test-harness/      # Notepad等を相手にした動作確認用モック
    └── config-validation/        # 禁止パターン静的チェック
```
