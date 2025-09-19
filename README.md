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
```powershell
.\scripts\install.bat
```

### 起動
```powershell
.\scripts\run.bat
```

起動後、ブラウザで `http://localhost:8000` にアクセスしてください。

## 使用方法

1. WebUIを開く
2. 設定を確認/調整
3. Excelファイルをドラッグ&ドロップで追加
4. 変換実行
5. プレビュー確認
6. ダウンロード（個別/一括）

## 技術仕様

- **バックエンド**: Python 3.11+ + FastAPI + Uvicorn
- **Excel処理**: openpyxl
- **フロントエンド**: Vanilla HTML5 + CSS + JavaScript
- **出力形式**: YAML / Markdown
