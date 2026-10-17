# アライナー矯正ワークフロー管理ボード

アライナー矯正の4段階工程をカンバンボードで管理するWebアプリです。

## ローカルでのセットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. データベースの選択

環境変数 `DATABASE_URL` の有無で、自動的に接続先が切り替わります。

**a. まずはSQLiteだけで試す場合**（環境変数の設定は不要）

```bash
npx prisma migrate dev
npm run dev
```

**b. Neon（本番と同じPostgres）につなぐ場合**

1. プロジェクト直下（`package.json` と同じ階層）に `.env` という名前のファイルを新規作成し、接続文字列を1行だけ書く：

   ```
   DATABASE_URL="postgresql://..."
   ```

   Vercelプロジェクトの Storage タブでNeonを追加した場合、この値はVercelの `Settings → Environment Variables` に表示されているものをそのままコピーしてください。

2. 初回のみ、Neon上にテーブルを作成する：

   ```bash
   npx prisma db push
   ```

3. 開発サーバーを起動：

   ```bash
   npm run dev
   ```

`.env` は `.gitignore` で除外されているため、Gitにはコミットされません。

## Vercelへのデプロイ

1. [vercel.com](https://vercel.com) にアクセスし、GitHubアカウントでサインアップ/ログイン
2. 「Add New...」→「Project」から `masahi14/repository` をImport
   - **Root Directory は空欄（デフォルト）のままでOK** — このリポジトリはルート直下がアプリ本体です
3. プロジェクト作成後、「Storage」タブ →「Neon」を追加してPostgresデータベースを作成
   - 追加すると `DATABASE_URL` を含む環境変数が自動的にVercelプロジェクトに設定されます
4. 上記「ローカルでのセットアップ 2-b」の手順で、ローカルから一度だけ `npx prisma db push` を実行し、Neon上にテーブルを作成する
5. Vercelの「Deployments」タブでビルドが成功していることを確認し、発行されたURLにアクセスする

## 機能

- **カンバンボード** (`/`) — 4段階ワークフロー管理（オートセグメント・プランニング・サポート設定・プリンティング）。1患者が複数の治療ケース（初回・再治療・リテーナー再作製など）を持てる
- **アーカイブ** (`/archive`) — 完了済みケースの一覧と操作履歴
- **担当者管理** (`/staff`) — スタッフの追加・削除

## 技術スタック

- Next.js 16（App Router、Server Actions、Turbopack）
- Prisma 7 + `@prisma/adapter-pg`（Postgres）/ `@prisma/adapter-better-sqlite3`（ローカルSQLite）
- Neon（PostgreSQL、本番）
- Tailwind CSS
