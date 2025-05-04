# LocalHouse デスクトップアプリケーション

React + TypeScript + Vite + Tauri を組み合わせたローカル公共交通情報ビューアです。

## 主な機能

- 鉄道・バスの運行情報表示
- 残り時間カウントダウン
- 日本の祝日データ（public/syukujitsu.csv）を利用したカレンダー連携
- クロスプラットフォーム（macOS・Windows・Linux）

## デモスクリーンショット

![アプリ画面](public/vite.svg)

## 前提条件

- Node.js v16 以上（または bun）
- Rust & Cargo
- Tauri CLI
  ```bash
  cargo install tauri-cli
  ```

## セットアップ

```bash
# パッケージインストール
npm install
# または
bun install
```

## 開発モードで実行

```bash
# フロントエンドのみ起動 (Vite)
npm run dev
# Tauri アプリケーションとして起動
npm run tauri dev
``` 

アプリが自動的にビルドされ、デスクトップウィンドウで起動します。

## 本番ビルド

```bash
# 型チェック & Vite ビルド
tnpm run build
# Tauri でバイナリを生成
npm run tauri build
```

生成されたバイナリは `src-tauri/target/release` フォルダ内に出力されます。

## プロジェクト構成

```
├── public/              # 静的アセット (画像・CSV など)
│   └── syukujitsu.csv   # 日本の祝日データ
├── src/                 # フロントエンド (React + TypeScript)
│   ├── components/      # 再利用コンポーネント
│   ├── utils/           # API・時間計算ユーティリティ
│   └── App.tsx          # エントリポイント
├── src-tauri/           # Tauri (Rust) サイドコード
│   ├── main.rs          # エントリポイント
│   └── tauri.conf.json  # 設定ファイル
├── package.json         # スクリプト & 依存関係
├── vite.config.ts       # Vite 設定
├── tsconfig.json        # TypeScript 設定
└── README.md            # このファイル
```

## 環境変数

必要があれば `src-tauri/tauri.conf.json` を編集してアプリ設定を変更してください。

## 貢献

バグ報告や機能改善のプルリクエストは大歓迎です。Issue を立てていただくか、Fork して Pull Request をお送りください。
