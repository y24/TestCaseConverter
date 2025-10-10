# WYSIWYGプレビュー機能 実装計画書

## 📋 **概要**

現在のテキストベースのプレビュー機能を拡張し、Markdown出力時にWYSIWYG（What You See Is What You Get）プレビューを提供する機能を実装します。ユーザーは従来のテキストプレビューとWYSIWYGプレビューを自由に切り替えることができます。

## 🎯 **目的・目標**

### 主な目的
- Markdown変換結果を視覚的に分かりやすく表示
- ユーザーの編集効率とユーザー体験の向上
- 最終的な出力結果の事前確認を容易にする

### 目標
- 既存機能への影響を最小限に抑える
- パフォーマンスを維持しながら新機能を提供
- 直感的で使いやすいUI/UXの実現

## 🔍 **現状分析**

### 現在のプレビュー機能
- **表示方式**: `<pre>`タグを使用したテキスト表示
- **内容**: `conversionResult.rendered_text`の生のMarkdownテキスト
- **切り替え**: なし（テキスト表示のみ）
- **ファイル選択**: プルダウンメニューまたは単一ファイル表示

### 技術スタック
- **フロントエンド**: Vanilla HTML5 + CSS + JavaScript
- **バックエンド**: Python 3.11+ + FastAPI
- **Markdown処理**: サーバーサイドでJinja2テンプレートを使用

## 🛠 **技術選定**

### WYSIWYGライブラリの選定

#### 候補ライブラリ
1. **marked.js** ⭐ **推奨**
   - 軽量（約25KB）
   - 高速なMarkdownパーサー
   - 豊富なプラグインエコシステム
   - カスタマイズ性が高い

2. **markdown-it**
   - 高機能なMarkdownパーサー
   - プラグインシステムが充実
   - やや重い（約50KB）

3. **showdown.js**
   - 古くからある安定したライブラリ
   - 機能は標準的

#### 選定理由
**marked.js**を選定する理由：
- 軽量で高速
- 既存のVanilla JavaScript環境に適している
- カスタマイズが容易
- コミュニティサポートが充実

### セキュリティ対策
- **DOMPurify**: XSS攻撃防止のためのHTMLサニタイズ
- 信頼できないHTMLの除去
- スクリプトタグの無効化

## 🎨 **UI/UX設計**

### プレビューモード切り替えUI

#### 切り替えボタンの配置
```
[プレビューコントロール]
┌─────────────────────────────────────────┐
│ [ファイル選択] [📄 Plain] [👁 Preview] [📥 ダウンロード] │
└─────────────────────────────────────────┘
```

#### ボタンデザイン
- **テキストモード**: 📄 アイコン + "Plain"
- **WYSIWYGモード**: 👁 アイコン + "Preview"
- **アクティブ状態**: 背景色変更 + ボーダー強調

### プレビューエリアの拡張

#### 現在の構造
```html
<div class="preview-content">
    <pre id="preview-content"></pre>
</div>
```

#### 新しい構造
```html
<div class="preview-content">
    <!-- テキストプレビュー -->
    <pre id="preview-content" class="preview-mode-text"></pre>
    
    <!-- WYSIWYGプレビュー -->
    <div id="preview-content-wysiwyg" class="preview-mode-wysiwyg" style="display: none;"></div>
</div>
```

## 🔧 **実装詳細**

### 1. フロントエンド実装

#### 1.1 HTML構造の変更
```html
<!-- プレビューコントロールに切り替えボタンを追加 -->
<div class="preview-controls">
    <select id="preview-file-select">
        <option value="">ファイルを選択してください</option>
    </select>
    
    <!-- 新規追加: プレビューモード切り替えボタン -->
    <div class="preview-mode-switcher">
        <button type="button" id="text-preview-btn" class="preview-mode-btn active" onclick="switchPreviewMode('text')">
            📄 Plain
        </button>
        <button type="button" id="wysiwyg-preview-btn" class="preview-mode-btn" onclick="switchPreviewMode('wysiwyg')">
            👁 Preview
        </button>
    </div>
    
    <button type="button" onclick="downloadAll()">📥 ダウンロード</button>
</div>

<!-- プレビューコンテンツエリアの拡張 -->
<div class="preview-content">
    <pre id="preview-content" class="preview-mode-text"></pre>
    <div id="preview-content-wysiwyg" class="preview-mode-wysiwyg" style="display: none;"></div>
</div>
```

#### 1.2 CSS追加
```css
/* プレビューモード切り替えボタン */
.preview-mode-switcher {
    display: flex;
    gap: 2px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 2px;
}

.preview-mode-btn {
    background: transparent;
    border: none;
    padding: 6px 12px;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    color: var(--text-secondary);
}

.preview-mode-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.preview-mode-btn.active {
    background: var(--accent-color);
    color: white;
}

/* WYSIWYGプレビューエリア */
.preview-mode-wysiwyg {
    padding: 20px;
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.preview-mode-wysiwyg h1,
.preview-mode-wysiwyg h2,
.preview-mode-wysiwyg h3,
.preview-mode-wysiwyg h4,
.preview-mode-wysiwyg h5,
.preview-mode-wysiwyg h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
}

.preview-mode-wysiwyg h1 { font-size: 2em; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
.preview-mode-wysiwyg h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; }
.preview-mode-wysiwyg h3 { font-size: 1.25em; }
.preview-mode-wysiwyg h4 { font-size: 1em; }
.preview-mode-wysiwyg h5 { font-size: 0.875em; }
.preview-mode-wysiwyg h6 { font-size: 0.85em; color: var(--text-secondary); }

.preview-mode-wysiwyg p {
    margin-bottom: 16px;
}

.preview-mode-wysiwyg ul,
.preview-mode-wysiwyg ol {
    margin-bottom: 16px;
    padding-left: 24px;
}

.preview-mode-wysiwyg li {
    margin-bottom: 4px;
}

.preview-mode-wysiwyg table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 16px;
}

.preview-mode-wysiwyg th,
.preview-mode-wysiwyg td {
    border: 1px solid var(--border-color);
    padding: 8px 12px;
    text-align: left;
}

.preview-mode-wysiwyg th {
    background: var(--bg-secondary);
    font-weight: 600;
}

.preview-mode-wysiwyg code {
    background: var(--bg-secondary);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
}

.preview-mode-wysiwyg pre {
    background: var(--bg-secondary);
    padding: 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin-bottom: 16px;
}

.preview-mode-wysiwyg blockquote {
    border-left: 4px solid var(--accent-color);
    padding-left: 16px;
    margin: 16px 0;
    color: var(--text-secondary);
}
```

#### 1.3 JavaScript実装
```javascript
// グローバル変数に追加
let currentPreviewMode = 'text'; // 'text' または 'wysiwyg'

// marked.js の初期化
let markedInstance = null;

// 初期化時にmarked.jsを読み込み
async function initializeMarked() {
    if (typeof marked === 'undefined') {
        // CDNからmarked.jsを動的に読み込み
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js';
        script.onload = () => {
            markedInstance = marked;
            configureMarked();
        };
        document.head.appendChild(script);
    } else {
        markedInstance = marked;
        configureMarked();
    }
}

// marked.jsの設定
function configureMarked() {
    if (!markedInstance) return;
    
    markedInstance.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
    });
}

// プレビューモード切り替え
function switchPreviewMode(mode) {
    if (mode === currentPreviewMode) return;
    
    currentPreviewMode = mode;
    
    // ボタンの状態更新
    document.getElementById('text-preview-btn').classList.toggle('active', mode === 'text');
    document.getElementById('wysiwyg-preview-btn').classList.toggle('active', mode === 'wysiwyg');
    
    // プレビューエリアの表示切り替え
    const textPreview = document.getElementById('preview-content');
    const wysiwygPreview = document.getElementById('preview-content-wysiwyg');
    
    if (mode === 'text') {
        textPreview.style.display = 'block';
        wysiwygPreview.style.display = 'none';
    } else {
        textPreview.style.display = 'none';
        wysiwygPreview.style.display = 'block';
        
        // WYSIWYGプレビューを更新
        updateWysiwygPreview();
    }
    
    // 設定をローカルストレージに保存
    savePreviewModeToLocalStorage(mode);
}

// WYSIWYGプレビューの更新
function updateWysiwygPreview() {
    if (currentPreviewMode !== 'wysiwyg') return;
    
    const fileSelect = document.getElementById('preview-file-select');
    const selectedFile = fileSelect.value;
    const wysiwygPreview = document.getElementById('preview-content-wysiwyg');
    
    if (selectedFile && conversionResult && conversionResult.rendered_text) {
        const markdownContent = conversionResult.rendered_text[selectedFile];
        
        if (markdownContent && markdownContent.trim() !== '') {
            // MarkdownをHTMLに変換
            if (markedInstance) {
                const htmlContent = markedInstance.parse(markdownContent);
                // DOMPurifyでサニタイズ（セキュリティ対策）
                const sanitizedHtml = DOMPurify.sanitize(htmlContent);
                wysiwygPreview.innerHTML = sanitizedHtml;
            } else {
                wysiwygPreview.innerHTML = '<p>WYSIWYGプレビューを読み込み中...</p>';
            }
        } else {
            wysiwygPreview.innerHTML = '<p>このファイルには表示可能なコンテンツがありません。</p>';
        }
    } else {
        wysiwygPreview.innerHTML = '';
    }
}

// プレビューモード設定の保存・読み込み
function savePreviewModeToLocalStorage(mode) {
    try {
        localStorage.setItem('testCaseConverter_previewMode', mode);
    } catch (error) {
        console.warn('プレビューモード設定の保存に失敗しました:', error);
    }
}

function loadPreviewModeFromLocalStorage() {
    try {
        const savedMode = localStorage.getItem('testCaseConverter_previewMode');
        if (savedMode && (savedMode === 'text' || savedMode === 'wysiwyg')) {
            return savedMode;
        }
    } catch (error) {
        console.warn('プレビューモード設定の読み込みに失敗しました:', error);
    }
    return 'text'; // デフォルトはテキストモード
}

// 既存のshowPreview関数を拡張
function showPreview() {
    // 既存のロジック...
    
    // プレビューセクションを表示
    previewSection.style.display = 'block';
    
    // WYSIWYGモードの場合は更新
    if (currentPreviewMode === 'wysiwyg') {
        updateWysiwygPreview();
    }
}

// 既存のhandlePreviewFileChange関数を拡張
function handlePreviewFileChange() {
    // 既存のロジック...
    
    // WYSIWYGモードの場合は更新
    if (currentPreviewMode === 'wysiwyg') {
        updateWysiwygPreview();
    }
}

// アプリケーション初期化時に追加
async function initializeApp() {
    await loadDefaultSettings();
    setupEventListeners();
    initializeCollapsibleSections();
    initializeTheme();
    watchSystemTheme();
    
    // 新規追加: marked.jsの初期化とプレビューモードの復元
    await initializeMarked();
    const savedPreviewMode = loadPreviewModeFromLocalStorage();
    switchPreviewMode(savedPreviewMode);
}
```

### 2. 外部ライブラリの追加

#### 2.1 CDN経由での読み込み
```html
<!-- index.htmlの<head>セクションに追加 -->
<script src="https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.5/dist/purify.min.js"></script>
```

#### 2.2 代替案: ローカルファイル
セキュリティ上の理由でCDNを使用できない場合：
```bash
# ライブラリファイルをダウンロード
mkdir -p app/web/lib
curl -o app/web/lib/marked.min.js https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js
curl -o app/web/lib/purify.min.js https://cdn.jsdelivr.net/npm/dompurify@3.0.5/dist/purify.min.js
```

### 3. バックエンド変更

#### 3.1 変更不要
現在のバックエンド実装は変更不要です。理由：
- Markdownの生成は既存の`MarkdownRenderer`で完結
- WYSIWYG変換はクライアントサイドで実行
- 既存のAPIエンドポイントをそのまま利用

#### 3.2 オプション: HTML出力エンドポイント
将来的にサーバーサイドでのHTML生成が必要な場合：
```python
@app.post("/api/convert/html")
async def convert_to_html(
    files: List[UploadFile] = File(...),
    settings_json: str = Form(...),
    language: str = Form(default="ja")
):
    """MarkdownをHTMLに変換して返す"""
    # 既存の変換ロジック + HTMLレンダラー
    pass
```

## 📋 **実装スケジュール**

### Phase 1: 基盤実装（1-2日）
- [ ] HTML構造の変更
- [ ] CSS追加
- [ ] 基本的なJavaScript実装
- [ ] プレビューモード切り替え機能

### Phase 2: WYSIWYG機能（2-3日）
- [ ] marked.jsの統合
- [ ] DOMPurifyの統合
- [ ] WYSIWYGプレビュー表示機能
- [ ] セキュリティ対策の実装

### Phase 3: 最適化・テスト（1-2日）
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング
- [ ] ブラウザ互換性テスト
- [ ] ユーザビリティテスト

### Phase 4: 最終調整（1日）
- [ ] UI/UXの微調整
- [ ] ドキュメント更新
- [ ] 最終テスト

## 🧪 **テスト計画**

### 機能テスト
- [ ] プレビューモード切り替えの動作確認
- [ ] Markdownの正しいHTML変換
- [ ] ファイル選択時のプレビュー更新
- [ ] 設定の永続化

### セキュリティテスト
- [ ] XSS攻撃の防止確認
- [ ] 悪意のあるスクリプトの無効化
- [ ] HTMLサニタイズの動作確認

### パフォーマンステスト
- [ ] 大容量Markdownファイルの処理
- [ ] メモリ使用量の監視
- [ ] レスポンス時間の測定

### ブラウザ互換性テスト
- [ ] Chrome（最新版）
- [ ] Firefox（最新版）
- [ ] Safari（最新版）
- [ ] Edge（最新版）

## ⚠️ **リスクと対策**

### 技術的リスク
1. **ライブラリの読み込み失敗**
   - 対策: フォールバック機能の実装
   - エラー時のテキストモード自動切り替え

2. **パフォーマンスの低下**
   - 対策: デバウンス処理の実装
   - 大容量ファイルでの処理制限

3. **セキュリティリスク**
   - 対策: DOMPurifyによる厳格なサニタイズ
   - CSP（Content Security Policy）の設定

### ユーザビリティリスク
1. **UIの複雑化**
   - 対策: 直感的なボタンデザイン
   - ツールチップによる説明

2. **学習コストの増加**
   - 対策: デフォルトはテキストモード
   - 段階的な機能公開

## 📊 **成功指標**

### 定量的指標
- WYSIWYGモードの利用率: 30%以上
- プレビュー切り替えの応答時間: 100ms以下
- エラー発生率: 1%以下

### 定性的指標
- ユーザーからの肯定的なフィードバック
- プレビュー機能の使いやすさ向上
- 既存機能への影響なし

## 🔄 **将来の拡張可能性**

### 短期拡張
- プレビューモードの設定保存
- カスタムCSSテーマの適用
- プレビューエリアのズーム機能

### 中期拡張
- リアルタイム編集機能
- プレビューエリアでの直接編集
- 複数ファイルの並列プレビュー

### 長期拡張
- プレビューテンプレートのカスタマイズ
- エクスポート機能の拡張（HTML、PDF）
- コラボレーション機能

## 📝 **まとめ**

この実装計画により、既存の機能を損なうことなく、ユーザーに価値のあるWYSIWYGプレビュー機能を提供できます。段階的な実装により、リスクを最小化しながら、確実に機能をリリースできます。

実装完了後は、ユーザーフィードバックを収集し、継続的な改善を行っていく予定です。
