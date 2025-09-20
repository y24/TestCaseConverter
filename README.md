# テストケース Excel → Markdown/YAML 変換ツール

Excel形式のテストケースをMarkdownまたはYAMLに変換するWebアプリケーションです。

## 機能

- Excelファイルの一括変換（複数ファイル対応）
- Markdown/YAML形式での出力
- WebUIでの設定変更・プレビュー
- ドラッグ&ドロップでのファイルアップロード
- 個別/一括ダウンロード

## セットアップ

### 初回インストール
`install.bat` を実行します。

### 起動
`run.bat` を実行するとサーバーが起動します。
起動後、ブラウザでWebUIが開きます。開かない場合、`http://localhost:8765` にアクセスします。

## 使用方法

1. WebUIを開く
2. 設定を確認/調整
3. Excelファイルをドラッグ&ドロップで追加
4. プレビュー確認
5. ダウンロード

## 技術仕様

- **バックエンド**: Python 3.11+ + FastAPI + Uvicorn
- **Excel処理**: openpyxl
- **フロントエンド**: Vanilla HTML5 + CSS + JavaScript
- **出力形式**: Markdown / YAML
