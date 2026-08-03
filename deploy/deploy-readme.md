# 配布手順(桐生さん向け)

## 1. ビルド(リリースのたびに1回)

AutoHotkey v2 がインストールされているPC(開発・ビルド用の1台でよい)で実行する。

```powershell
pwsh -File build\build.ps1
```

`dist\` フォルダに `DentalKartePanel.exe` と `config\` 一式が出力される。

## 2. 共有フォルダへ配置

`dist\` フォルダの中身を、20台のPCから見える共有フォルダにそのままコピーする(例: `\\FILESERVER\dental-tools\karte-panel\dist\`)。既存のセットの中身(`config\sets.json`)を直接この共有フォルダ上で編集しても構わない(その場合は `build.ps1` の再実行は不要)。

## 3. 各PCへのスタートアップ登録(初回のみ、20台それぞれで1回)

各PCで、共有フォルダにアクセスできる状態で以下を実行する。

```powershell
pwsh -File deploy\install-startup.ps1 -SharedDistPath "\\FILESERVER\dental-tools\karte-panel\dist"
```

これにより、次回ログオン時から自動的にパネルが起動するようになる。ログオフ・再ログオンするか、手順の最後に表示されるコマンドで即座に試すこともできる。

## 動作の仕組み

各PCはログオン時に共有フォルダの最新版をローカル(`%LOCALAPPDATA%\DentalKartePanel\app`)へコピーしてから起動する。これは、共有フォルダ上のexeを直接実行するとネットワークの瞬断やファイルロックの競合が起きやすいためである。**設定(`config\sets.json`)を更新したい場合は、共有フォルダ上のファイルを書き換えるだけでよく、各PCへの個別作業は不要。次回ログオン時に全PCへ自動反映される。**

パネル起動中に設定を反映させたい場合は、パネルのトレイアイコンを右クリックし「設定を再読み込み」を選ぶ。

## ウイルス対策ソフトの誤検知について

`DentalKartePanel.exe` はキーボード入力を送信するツールという性質上、Windows Defender等のウイルス対策ソフトに誤ってブロックされることがある。導入時に、院内で利用しているウイルス対策ソフトの管理コンソールで、このexeのファイルハッシュまたはパスを許可リストに追加してほしい。可能であればコード署名証明書の取得も検討する。

## 導入前の確認事項

- `config\sets.json` 内の `"TODO: 実コードに差し替え"` という注記が付いた項目を、実際の5桁コードに置き換えること。
- `config\settings.json` の `test_mode` を `false` に変更する前に、`tests\manual-test-harness\` を使った動作確認、および1〜2台での実機パイロット運用でキー送信の待機時間(`timing.after_code_ms` / `after_enter_ms`)を調整すること。詳細は `tests\manual-test-harness\test-checklist.md` を参照。
