/**
 * プレビュー機能モジュール
 */

import { 
    PREVIEW_MODES, 
    OUTPUT_FORMATS, 
    FILE_EXTENSIONS, 
    TIMER_CONSTANTS 
} from '../constants/config.js';
import { appState } from '../core/state.js';
import { configManager } from '../core/config.js';
import { 
    setElementValue, 
    setElementText, 
    setElementHTML, 
    toggleElementVisibility,
    resetElementScroll 
} from '../utils/dom-utils.js';

/**
 * プレビュー機能クラス
 */
class PreviewManager {
    constructor() {
        this.setupEventListeners();
    }
    
    /**
     * イベントリスナーを設定する
     */
    setupEventListeners() {
        // プレビューファイル選択
        const fileSelect = document.getElementById('preview-file-select');
        if (fileSelect) {
            fileSelect.addEventListener('change', this.handlePreviewFileChange.bind(this));
        }
        
        // プレビューモード切り替えトグル
        const toggleSwitch = document.getElementById('preview-toggle');
        if (toggleSwitch) {
            toggleSwitch.addEventListener('change', this.togglePreviewMode.bind(this));
        }
        
        // プレビュー表示イベント
        document.addEventListener('showPreview', this.showPreview.bind(this));
        
        // プレビューエリアのCtrl+A全選択機能
        this.setupPreviewSelectAll();
    }
    
    /**
     * プレビューを表示する
     */
    showPreview() {
        const previewSection = document.getElementById('preview-section');
        const fileSelect = document.getElementById('preview-file-select');
        const previewControls = document.querySelector('.preview-controls');
        
        // プレビューエラーを非表示
        this.hidePreviewError();
        
        const conversionResult = appState.getConversionResult();
        if (conversionResult && conversionResult.rendered_text) {
            const fileKeys = Object.keys(conversionResult.rendered_text);
            
            // 空でないコンテンツを持つファイルのみをフィルタリング
            const validFileKeys = fileKeys.filter(filename => {
                const content = conversionResult.rendered_text[filename];
                return content && content.trim() !== '';
            });
            
            // 表示すべきファイルがない場合はプレビューセクションを非表示にする
            if (validFileKeys.length === 0) {
                if (previewSection) {
                    previewSection.style.display = 'none';
                }
                return;
            }
            
            if (validFileKeys.length === 1) {
                // ファイルが1件の場合：プルダウンを非表示にしてファイル名を直接表示
                this.showSingleFilePreview(validFileKeys[0], conversionResult, previewControls);
            } else {
                // ファイルが複数の場合：従来のプルダウン表示
                this.showMultipleFilePreview(validFileKeys, conversionResult, fileSelect, previewControls);
            }
            
            // プレビューセクションを表示
            if (previewSection) {
                previewSection.style.display = 'block';
            }
            
            // トグルスイッチの状態を確実に設定（Markdown形式のときのみ表示）
            this.updatePreviewModeSwitcher();
            
            // WYSIWYGモードの場合は更新
            if (appState.getCurrentPreviewMode() === PREVIEW_MODES.WYSIWYG) {
                this.updateWysiwygPreview();
            }
        } else {
            // conversionResultまたはrendered_textが存在しない場合はプレビューセクションを非表示
            if (previewSection) {
                previewSection.style.display = 'none';
            }
        }
    }
    
    /**
     * 単一ファイルプレビューを表示する
     * @param {string} fileName - ファイル名
     * @param {Object} conversionResult - 変換結果
     * @param {HTMLElement} previewControls - プレビューコントロール要素
     */
    showSingleFilePreview(fileName, conversionResult, previewControls) {
        const fileSelect = document.getElementById('preview-file-select');
        if (fileSelect) {
            fileSelect.value = fileName;
            fileSelect.style.display = 'none';
        }
        
        // ファイル名表示用の要素を作成
        let fileNameDisplay = document.getElementById('file-name-display');
        if (!fileNameDisplay && previewControls) {
            fileNameDisplay = document.createElement('div');
            fileNameDisplay.id = 'file-name-display';
            fileNameDisplay.className = 'file-name-display';
            previewControls.insertBefore(fileNameDisplay, fileSelect);
        }
        
        if (fileNameDisplay) {
            fileNameDisplay.textContent = fileName;
            fileNameDisplay.style.display = 'block';
        }
        
        // ダウンロードボタンのテキストを変更
        this.updateDownloadButtonText();
        
        // プレビュー内容を直接設定
        const previewContent = document.getElementById('preview-content');
        if (previewContent && conversionResult.rendered_text[fileName]) {
            previewContent.textContent = conversionResult.rendered_text[fileName];
        }
    }
    
    /**
     * 複数ファイルプレビューを表示する
     * @param {Array} validFileKeys - 有効なファイルキー配列
     * @param {Object} conversionResult - 変換結果
     * @param {HTMLElement} fileSelect - ファイル選択要素
     * @param {HTMLElement} previewControls - プレビューコントロール要素
     */
    showMultipleFilePreview(validFileKeys, conversionResult, fileSelect, previewControls) {
        if (fileSelect) {
            fileSelect.style.display = 'block';
        }
        
        // ファイル名表示を非表示
        const fileNameDisplay = document.getElementById('file-name-display');
        if (fileNameDisplay) {
            fileNameDisplay.style.display = 'none';
        }
        
        // ファイル選択肢を更新（有効なファイルのみ）
        if (fileSelect) {
            fileSelect.innerHTML = '<option value="">ファイルを選択してください</option>';
            validFileKeys.forEach(filename => {
                const option = document.createElement('option');
                option.value = filename;
                option.textContent = filename;
                fileSelect.appendChild(option);
            });
            
            // 最初のファイルを選択
            if (fileSelect.options.length > 1) {
                fileSelect.selectedIndex = 1;
                this.handlePreviewFileChange();
            }
        }
        
        // ダウンロードボタンのテキストを元に戻す
        const downloadBtn = previewControls?.querySelector('button[onclick="downloadAll()"]');
        if (downloadBtn) {
            downloadBtn.textContent = '📥 すべてダウンロード (.zip)';
        }
    }
    
    /**
     * プレビューファイル変更を処理する
     */
    handlePreviewFileChange() {
        const fileSelect = document.getElementById('preview-file-select');
        const previewContent = document.getElementById('preview-content');
        
        const selectedFile = fileSelect ? fileSelect.value : '';
        const conversionResult = appState.getConversionResult();
        
        if (selectedFile && conversionResult && conversionResult.rendered_text) {
            const content = conversionResult.rendered_text[selectedFile];
            
            // コンテンツが存在し、空でない場合のみ表示
            if (content && content.trim() !== '') {
                if (previewContent) {
                    previewContent.textContent = content;
                }
            } else {
                if (previewContent) {
                    previewContent.textContent = 'このファイルには表示可能なコンテンツがありません。';
                }
            }
        } else {
            if (previewContent) {
                previewContent.textContent = '';
            }
        }
        
        // WYSIWYGモードの場合は更新
        if (appState.getCurrentPreviewMode() === PREVIEW_MODES.WYSIWYG) {
            this.updateWysiwygPreview();
        }
        
        // ファイル変更時のみスクロール位置をリセット
        this.resetPreviewScrollPosition();
    }
    
    /**
     * プレビューモードを切り替える（トグルスイッチ用）
     */
    togglePreviewMode() {
        const toggleSwitch = document.getElementById('preview-toggle');
        if (!toggleSwitch) return;
        
        const mode = toggleSwitch.checked ? PREVIEW_MODES.WYSIWYG : PREVIEW_MODES.TEXT;
        
        // WYSIWYGモードが選択されたが、marked.jsが利用できない場合はテキストモードにフォールバック
        if (mode === PREVIEW_MODES.WYSIWYG && !appState.getMarkedInstance()) {
            console.warn('marked.jsが利用できないため、テキストモードに切り替えます');
            toggleSwitch.checked = false;
            return;
        }
        
        this.switchPreviewMode(mode);
        
        // 設定をローカルストレージに保存
        import('../utils/storage-utils.js').then(({ savePreviewModeToLocalStorage }) => {
            savePreviewModeToLocalStorage(mode);
        });
    }
    
    /**
     * プレビューモードを切り替える
     * @param {string} mode - プレビューモード
     */
    switchPreviewMode(mode) {
        const toggleSwitch = document.getElementById('preview-toggle');
        if (toggleSwitch) {
            toggleSwitch.checked = (mode === PREVIEW_MODES.WYSIWYG);
            toggleSwitch.style.display = 'block';
        }
        
        appState.setCurrentPreviewMode(mode);
        this.ensurePreviewModeDisplay(mode);
        
        // WYSIWYGモードの場合は更新
        if (mode === PREVIEW_MODES.WYSIWYG) {
            this.updateWysiwygPreview();
        }
        
        // プレビューモード切り替え時はスクロール位置をリセットしない
        // （ユーザーのスクロール位置を保持する）
    }
    
    /**
     * プレビューモードの表示切り替えを確実に実行する
     * @param {string} mode - プレビューモード
     */
    ensurePreviewModeDisplay(mode) {
        const textPreview = document.getElementById('preview-content');
        const wysiwygPreview = document.getElementById('preview-content-wysiwyg');
        
        if (textPreview && wysiwygPreview) {
            if (mode === PREVIEW_MODES.TEXT) {
                textPreview.style.display = 'block';
                wysiwygPreview.style.display = 'none';
            } else if (mode === PREVIEW_MODES.WYSIWYG) {
                textPreview.style.display = 'none';
                wysiwygPreview.style.display = 'block';
            }
        } else {
            console.warn('Preview elements not found, retrying...');
            // 要素が見つからない場合は少し待ってから再試行
            setTimeout(() => {
                this.ensurePreviewModeDisplay(mode);
            }, TIMER_CONSTANTS.RETRY_DELAY);
        }
    }
    
    /**
     * WYSIWYGプレビューを更新する
     */
    updateWysiwygPreview() {
        if (appState.getCurrentPreviewMode() !== PREVIEW_MODES.WYSIWYG) return;
        
        // 既存のタイマーをクリア
        const existingTimeout = appState.getUpdateWysiwygTimeout();
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        
        // デバウンス付きで更新
        const timeout = setTimeout(() => {
            this.updateWysiwygPreviewImmediate();
        }, TIMER_CONSTANTS.WYSIWYG_UPDATE_DELAY);
        
        appState.setUpdateWysiwygTimeout(timeout);
    }
    
    /**
     * WYSIWYGプレビューを即座に更新する
     */
    updateWysiwygPreviewImmediate() {
        if (appState.getCurrentPreviewMode() !== PREVIEW_MODES.WYSIWYG) return;
        
        const fileSelect = document.getElementById('preview-file-select');
        const selectedFile = fileSelect ? fileSelect.value : '';
        const wysiwygPreview = document.getElementById('preview-content-wysiwyg');
        
        if (!wysiwygPreview) return;
        
        const conversionResult = appState.getConversionResult();
        if (selectedFile && conversionResult && conversionResult.rendered_text) {
            const markdownContent = conversionResult.rendered_text[selectedFile];
            
            if (markdownContent && markdownContent.trim() !== '') {
                // MarkdownをHTMLに変換
                const markedInstance = appState.getMarkedInstance();
                if (markedInstance) {
                    try {
                        const htmlContent = markedInstance.parse(markdownContent);
                        // DOMPurifyでサニタイズ（セキュリティ対策）
                        if (typeof DOMPurify !== 'undefined') {
                            const sanitizedHtml = DOMPurify.sanitize(htmlContent);
                            wysiwygPreview.innerHTML = sanitizedHtml;
                        } else {
                            // DOMPurifyが利用できない場合はエスケープ処理
                            wysiwygPreview.innerHTML = htmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                            console.warn('DOMPurifyが利用できないため、基本的なエスケープ処理を実行しました');
                        }
                    } catch (error) {
                        console.error('Markdown変換エラー:', error);
                        wysiwygPreview.innerHTML = '<div style="color: #e74c3c; padding: 20px; text-align: center;">' +
                            '<p>⚠️ プレビューの変換中にエラーが発生しました</p>' +
                            '<p style="font-size: 0.9em; color: #7f8c8d;">エラー詳細: ' + error.message + '</p>' +
                            '</div>';
                    }
                } else {
                    // marked.jsが初期化されていない場合は、テキストモードにフォールバック
                    console.warn('marked.jsが初期化されていません。テキストモードに切り替えます。');
                    appState.setCurrentPreviewMode(PREVIEW_MODES.TEXT);
                    this.ensurePreviewModeDisplay(PREVIEW_MODES.TEXT);
                    
                    // トグルスイッチを更新
                    const toggleSwitch = document.getElementById('preview-toggle');
                    if (toggleSwitch) {
                        toggleSwitch.checked = false;
                    }
                }
            } else {
                wysiwygPreview.innerHTML = '<div style="color: #95a5a6; padding: 20px; text-align: center;">' +
                    '<p>📄 このファイルには表示可能なコンテンツがありません</p>' +
                    '</div>';
            }
        } else {
            wysiwygPreview.innerHTML = '';
        }
        
        // WYSIWYGプレビュー更新時はスクロール位置をリセットしない
        // （ユーザーのスクロール位置を保持する）
    }
    
    /**
     * プレビューモード切り替えスイッチを更新する
     */
    updatePreviewModeSwitcher() {
        const toggleSwitch = document.getElementById('preview-toggle');
        const previewModeSwitcher = document.querySelector('.preview-mode-switcher');
        
        if (toggleSwitch && previewModeSwitcher) {
            const settings = configManager.getSettings();
            const outputFormat = settings.output_format || OUTPUT_FORMATS.MARKDOWN;
            const isMarkdownFormat = outputFormat === OUTPUT_FORMATS.MARKDOWN;
            
            if (isMarkdownFormat) {
                // Markdown形式の場合は表示
                previewModeSwitcher.style.display = 'flex';
                // 保存されたプレビューモードを復元
                const currentMode = appState.getCurrentPreviewMode();
                toggleSwitch.checked = (currentMode === PREVIEW_MODES.WYSIWYG);
                // プレビューエリアの表示切り替えを確実に実行
                this.ensurePreviewModeDisplay(currentMode);
            } else {
                // Markdown形式以外の場合は非表示
                previewModeSwitcher.style.display = 'none';
                // 非表示の場合はテキストモードに強制切り替え
                appState.setCurrentPreviewMode(PREVIEW_MODES.TEXT);
                this.switchPreviewMode(PREVIEW_MODES.TEXT);
            }
        }
    }
    
    /**
     * ダウンロードボタンのテキストを更新する
     */
    updateDownloadButtonText() {
        const downloadBtn = document.querySelector('.preview-controls button[onclick="downloadAll()"]');
        if (downloadBtn) {
            const settings = configManager.getSettings();
            const outputFormat = settings.output_format || OUTPUT_FORMATS.MARKDOWN;
            
            let buttonText;
            switch (outputFormat) {
                case OUTPUT_FORMATS.YAML:
                    buttonText = '📥 ダウンロード (.yaml)';
                    break;
                case OUTPUT_FORMATS.CSV:
                    buttonText = '📥 ダウンロード (.csv)';
                    break;
                default:
                    buttonText = '📥 ダウンロード (.md)';
                    break;
            }
            downloadBtn.textContent = buttonText;
        }
    }
    
    /**
     * プレビューエリアのCtrl+A全選択機能を設定する
     */
    setupPreviewSelectAll() {
        const previewContent = document.getElementById('preview-content');
        if (!previewContent) return;
        
        // プレビューエリアにキーボードイベントリスナーを追加
        previewContent.addEventListener('keydown', (event) => {
            // Ctrl+A または Cmd+A (Mac) が押された場合
            if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
                event.preventDefault(); // デフォルトの動作を防ぐ
                
                // テキストを全選択
                this.selectAllText(previewContent);
            }
        });
        
        // プレビューエリアをクリック可能にする（フォーカス可能にするため）
        previewContent.setAttribute('tabindex', '0');
        previewContent.style.cursor = 'text';
    }
    
    /**
     * テキストを全選択する
     * @param {HTMLElement} element - 対象要素
     */
    selectAllText(element) {
        if (window.getSelection && document.createRange) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        } else if (document.selection && document.selection.createRange) {
            // IE用のフォールバック
            const range = document.selection.createRange();
            range.selectNodeContents(element);
        }
    }
    
    /**
     * プレビューエリアのスクロール位置をリセットする
     */
    resetPreviewScrollPosition() {
        setTimeout(() => {
            const textPreview = document.getElementById('preview-content');
            const wysiwygPreview = document.getElementById('preview-content-wysiwyg');
            const previewContentContainer = document.querySelector('.preview-content');
            
            // プレビューコンテンツコンテナのスクロール位置をリセット
            if (previewContentContainer) {
                previewContentContainer.scrollTop = 0;
            }
            
            // テキストプレビューエリアのスクロール位置をリセット
            if (textPreview) {
                textPreview.scrollTop = 0;
            }
            
            // WYSIWYGプレビューエリアのスクロール位置をリセット
            if (wysiwygPreview) {
                wysiwygPreview.scrollTop = 0;
            }
        }, TIMER_CONSTANTS.SCROLL_RESET_DELAY);
    }
    
    // エラー表示関連
    hidePreviewError() {
        const previewErrorDiv = document.getElementById('preview-error-message');
        if (previewErrorDiv) {
            previewErrorDiv.style.display = 'none';
            
            // プレビュー内容を表示
            const previewContent = document.getElementById('preview-content');
            if (previewContent) {
                previewContent.style.display = 'block';
            }
        }
    }
}

// シングルトンインスタンスを作成
export const previewManager = new PreviewManager();

// グローバル関数として公開（既存コードとの互換性のため）
window.handlePreviewFileChange = () => previewManager.handlePreviewFileChange();
window.switchPreviewMode = (mode) => previewManager.switchPreviewMode(mode);
window.togglePreviewMode = () => previewManager.togglePreviewMode();
