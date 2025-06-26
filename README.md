# LocalHouse - 公共交通情報表示アプリケーション

日本の鉄道・バスの運行情報をリアルタイムで表示するデスクトップアプリケーションです。駅や公共施設でのデジタルサイネージ（キオスク端末）として利用することを想定して開発されています。

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **デスクトップフレームワーク**: Tauri 2（Rust）
- **スタイリング**: Tailwind CSS（ダークテーマ）
- **パッケージマネージャー**: Bun（推奨）または npm

## 主な機能

- 🚃 鉄道・バスの運行情報をリアルタイム表示
- ⏱️ 出発までの残り時間を秒単位でカウントダウン
- 📅 日本の祝日データ（`public/syukujitsu.csv`）による運行スケジュール調整
- 🖥️ フルスクリーン・フレームレス表示（キオスクモード）
- 🌐 クロスプラットフォーム対応（macOS・Windows・Linux）
- 🔄 自動更新機能（1秒ごとに時刻を更新）

## スクリーンショット

*準備中*

## 動作環境・前提条件

### 開発環境
- **Node.js** v16以上 または **Bun**（推奨）
- **Rust** & **Cargo**（最新の安定版）
- **Tauri CLI**
  ```bash
  cargo install tauri-cli
  ```

### 実行環境
- macOS 10.15以上 / Windows 10以上 / Linux（X11対応）
- APIサーバー（別途準備が必要）

## インストールとセットアップ

### 1. リポジトリのクローン
```bash
git clone [repository-url]
cd tauri-app
```

### 2. 依存関係のインストール
```bash
# Bunを使用（推奨）
bun install

# または npmを使用
npm install
```

### 3. 環境変数の設定
`.env`ファイルを作成し、以下の内容を設定：
```bash
# APIエンドポイント
VITE_API_BASE_URL=http://localhost:3000

# フッター表示（オプション）
VITE_SHOW_FOOTER=true

# デバッグ用の日時指定（オプション）
VITE_DEBUG_DATETIME=2024-01-01T09:00:00
```

## 開発方法

### 開発サーバーの起動

```bash
# フロントエンドのみ（ブラウザで確認）
bun dev                    # http://localhost:1420 で起動

# デスクトップアプリとして起動（推奨）
bun tauri dev              # ホットリロード対応
```

デスクトップアプリモードでは、フルスクリーンのフレームレスウィンドウで起動します。

## ビルドとデプロイ

### プロダクションビルド

```bash
# 1. フロントエンドのビルド（型チェック含む）
bun run build

# 2. ネイティブアプリケーションのビルド
bun tauri build
```

### ビルド成果物

- **macOS**: `src-tauri/target/release/bundle/dmg/` に `.dmg` ファイル
- **Windows**: `src-tauri/target/release/bundle/msi/` に `.msi` ファイル  
- **Linux**: `src-tauri/target/release/bundle/deb/` に `.deb` ファイル

### Linuxキオスクモードでの起動

```bash
# 付属のスクリプトを使用
./start.sh
```

## プロジェクト構成

```
tauri-app/
├── src/                        # フロントエンド（React + TypeScript）
│   ├── App.tsx                 # メインコンポーネント（データ取得・状態管理）
│   ├── TrainBoard.tsx          # 運行情報表示コンポーネント
│   ├── components/             # 再利用可能なUIコンポーネント
│   │   ├── BusItem.tsx         # バス情報表示
│   │   ├── StationCard.tsx     # 駅情報カード
│   │   ├── StatusScreens.tsx   # ステータス画面（エラー・ローディング）
│   │   └── common/
│   │       └── RemainingTime.tsx # 残り時間表示
│   ├── types/                  # TypeScript型定義
│   │   └── timetable.ts        # 時刻表データの型
│   ├── utils/                  # ユーティリティ関数
│   │   ├── apiUtils.ts         # API通信
│   │   ├── configUtils.ts      # 設定管理
│   │   └── timeUtils.ts        # 時間計算
│   └── assets/                 # 画像・静的ファイル
├── public/
│   └── syukujitsu.csv          # 日本の祝日データ
├── src-tauri/                  # Tauri（Rust）バックエンド
│   ├── src/
│   │   ├── main.rs             # Rustエントリーポイント
│   │   └── lib.rs              # ライブラリコード
│   ├── Cargo.toml              # Rust依存関係
│   ├── tauri.conf.json         # Tauri設定
│   └── capabilities/           # セキュリティ権限設定
├── .env                        # 環境変数（Git管理外）
├── .env.development            # 開発用環境変数（Git管理外）
├── vite.config.ts              # Viteバンドラー設定
├── tailwind.config.js          # Tailwind CSS設定
├── tsconfig.json               # TypeScript設定
├── start.sh                    # Linux起動スクリプト
└── CLAUDE.md                   # Claude Code用ガイドライン
```

## 設定とカスタマイズ

### 環境変数（`.env`）

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `VITE_API_BASE_URL` | バックエンドAPIのURL | `http://localhost:3000` |
| `VITE_SHOW_FOOTER` | フッター表示の有無 | `false` |
| `VITE_DEBUG_DATETIME` | デバッグ用の固定日時 | なし |

### Tauri設定（`src-tauri/tauri.conf.json`）

- ウィンドウサイズ、フルスクリーン設定
- アプリケーション名、バージョン
- ビルドターゲット設定

## トラブルシューティング

### よくある問題

1. **ビルドエラーが発生する**
   - Rustとcargo が最新版であることを確認
   - `cargo install tauri-cli` でTauri CLIを再インストール

2. **APIに接続できない**
   - `.env`の`VITE_API_BASE_URL`が正しく設定されているか確認
   - APIサーバーが起動しているか確認

3. **Linux で画面が表示されない**
   - X11が正しくインストールされているか確認
   - `start.sh`の実行権限があるか確認（`chmod +x start.sh`）

## ライセンス

*プロジェクトのライセンスを記載*

## 貢献について

バグ報告や機能改善のプルリクエストを歓迎します。

1. このリポジトリをフォーク
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add amazing feature'`）
4. ブランチにプッシュ（`git push origin feature/amazing-feature`）
5. プルリクエストを作成

## 関連リンク

- [Tauri公式ドキュメント](https://tauri.app/)
- [React公式ドキュメント](https://react.dev/)
- [祝日データ出典](https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html)
