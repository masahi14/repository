# アライナー矯正ワークフロー管理ボード

アライナー矯正の4段階工程をカンバンボードで管理するWebアプリです。

## セットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. Supabaseプロジェクト作成

[supabase.com](https://supabase.com) でプロジェクトを作成し、接続文字列を取得してください。

### 3. 環境変数設定

`.env.local` を作成して接続文字列を設定：

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

### 4. DBマイグレーション

```bash
npx prisma db push
```

### 5. 開発サーバー起動

```bash
npm run dev
```

## 機能

- **カンバンボード** (`/`) — 4段階ワークフロー管理（オートセグメント・プランニング・サポート設定・プリンティング）
- **アーカイブ** (`/archive`) — 完了済み患者一覧
- **担当者管理** (`/staff`) — スタッフの追加・削除

## 技術スタック

- Next.js 14（App Router）
- Prisma 7 + `@prisma/adapter-pg`
- Supabase（PostgreSQL）
- Tailwind CSS
