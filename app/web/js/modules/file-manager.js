/**
 * ファイル管理モジュール
 */

import { FILE_CONSTANTS, ERROR_MESSAGES } from '../constants/config.js';
import { isValidFile, generateUniqueFilename, formatFileSize } from '../utils/validation-utils.js';
import { showError } from '../utils/error-utils.js';
import { appState } from '../core/state.js';

/**
 * ファイル管理クラス
 */
class FileManager {
    constructor() {
        this.setupEventListeners();
    }
    
    /**
     * イベントリスナーを設定する
     */
    setupEventListeners() {
        // ファイルアップロード
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const fileList = document.getElementById('file-list');
        
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        }
        
        // ファイルリストにもドラッグ＆ドロップ機能を追加
        if (fileList) {
            fileList.addEventListener('dragover', this.handleFileListDragOver.bind(this));
            fileList.addEventListener('dragleave', this.handleFileListDragLeave.bind(this));
            fileList.addEventListener('drop', this.handleFileListDrop.bind(this));
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
        
        // グローバルなドロップイベントを無効化（エリア外でのファイルドロップを防ぐ）
        document.addEventListener('dragover', this.handleGlobalDragOver.bind(this));
        document.addEventListener('drop', this.handleGlobalDrop.bind(this));
    }
    
    /**
     * ファイルを追加する
     * @param {Array} files - 追加するファイル配列
     */
    addFiles(files) {
        const validFiles = files.filter(file => {
            const isValid = isValidFile(file);
            if (!isValid) {
                console.warn(`Invalid file: ${file.name}`);
            }
            return isValid;
        });
        
        if (validFiles.length !== files.length) {
            showError(ERROR_MESSAGES.INVALID_FILES);
        }
        
        // 既存のファイルがある場合はクリアして新規ファイルを読み込み
        const currentFiles = appState.getUploadedFiles();
        if (currentFiles.length > 0) {
            appState.clearFiles();
            this.resetToInitialState();
        }
        
        // ファイル名の重複チェックと連番付与
        const processedFiles = this.processDuplicateFilenames(validFiles);
        
        appState.addFiles(processedFiles);
        this.updateFileList();
        this.updateConvertButton();
        
        // ファイル追加時に自動変換実行
        if (processedFiles.length > 0) {
            this.triggerAutoConvert();
        }
    }
    
    /**
     * ファイル名の重複処理
     * @param {Array} newFiles - 新しいファイル配列
     * @returns {Array} 処理済みファイル配列
     */
    processDuplicateFilenames(newFiles) {
        const processedFiles = [];
        const currentFiles = appState.getUploadedFiles();
        
        for (const file of newFiles) {
            const uniqueFilename = generateUniqueFilename(file, currentFiles);
            
            // ファイルオブジェクトのクローンを作成してファイル名を変更
            const processedFile = new File([file], uniqueFilename, {
                type: file.type,
                lastModified: file.lastModified
            });
            
            processedFiles.push(processedFile);
        }
        
        return processedFiles;
    }
    
    /**
     * ファイルリストを更新する
     */
    updateFileList() {
        const fileList = document.getElementById('file-list');
        const uploadArea = document.getElementById('upload-area');
        const bulkActions = document.getElementById('bulk-actions');
        
        if (!fileList) return;
        
        fileList.innerHTML = '';
        
        const files = appState.getUploadedFiles();
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <span class="file-icon">📗</span>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${formatFileSize(file.size)})</span>
                </div>
                <button type="button" class="remove-btn" onclick="removeFile(${index})">✖ 削除</button>
            `;
            fileList.appendChild(fileItem);
        });
        
        // ファイルが1件以上ある場合はドロップエリアを非表示、0件の場合は表示
        if (files.length > 0) {
            if (uploadArea) uploadArea.style.display = 'none';
            // 複数ファイルがある場合のみ一括削除ボタンを表示
            if (bulkActions) {
                bulkActions.style.display = files.length > 1 ? 'block' : 'none';
            }
        } else {
            if (uploadArea) uploadArea.style.display = 'block';
            if (bulkActions) bulkActions.style.display = 'none';
        }
    }
    
    /**
     * ファイルを削除する
     * @param {number} index - 削除するファイルのインデックス
     */
    removeFile(index) {
        appState.removeFile(index);
        this.updateFileList();
        this.updateConvertButton();
        
        // ファイルが0件になった場合は初期表示に戻す
        if (appState.getUploadedFiles().length === 0) {
            this.resetToInitialState();
            return;
        }
        
        // ファイル削除時に自動変換実行
        this.triggerAutoConvert();
    }
    
    /**
     * すべてのファイルを一括削除する
     */
    removeAllFiles() {
        // ファイルが0件の場合は何もしない
        if (appState.getUploadedFiles().length === 0) {
            return;
        }
        
        appState.clearFiles();
        this.updateFileList();
        this.updateConvertButton();
        this.resetToInitialState();
    }
    
    /**
     * 変換ボタンの状態を更新する
     */
    updateConvertButton() {
        const convertBtn = document.getElementById('convert-btn');
        if (convertBtn) {
            convertBtn.disabled = appState.getUploadedFiles().length === 0;
        }
    }
    
    /**
     * 初期状態に戻す
     */
    resetToInitialState() {
        // プレビューセクションを非表示
        const previewSection = document.getElementById('preview-section');
        if (previewSection) {
            previewSection.style.display = 'none';
        }
        
        // 変換結果をクリア
        appState.clearConversionResult();
        
        // エラーメッセージを非表示
        this.hideError();
        this.hidePreviewError();
        
        // ローディングを非表示
        this.showLoading(false);
        
        // プレビューファイル選択をリセット
        const fileSelect = document.getElementById('preview-file-select');
        if (fileSelect) {
            fileSelect.innerHTML = '<option value="">ファイルを選択してください</option>';
            fileSelect.style.display = 'block';
        }
        
        // ファイル名表示を非表示
        const fileNameDisplay = document.getElementById('file-name-display');
        if (fileNameDisplay) {
            fileNameDisplay.style.display = 'none';
        }
        
        // ダウンロードボタンのテキストを元に戻す
        const downloadBtn = document.querySelector('.preview-controls button[onclick="downloadAll()"]');
        if (downloadBtn) {
            downloadBtn.textContent = '📥 すべてダウンロード (.zip)';
        }
        
        // プレビュー内容をクリア
        const previewContent = document.getElementById('preview-content');
        if (previewContent) {
            previewContent.textContent = '';
        }
    }
    
    /**
     * 自動変換をトリガーする
     */
    triggerAutoConvert() {
        // 自動変換イベントを発火
        const event = new CustomEvent('autoConvert');
        document.dispatchEvent(event);
    }
    
    // ドラッグ&ドロップイベントハンドラー
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }
    
    handleFileListDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('file-list-dragover');
    }
    
    handleFileListDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('file-list-dragover');
    }
    
    handleFileListDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('file-list-dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }
    
    handleGlobalDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleGlobalDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // ドロップされた要素がアップロードエリアまたはファイルリスト内でない場合は何もしない
        const uploadArea = document.getElementById('upload-area');
        const fileList = document.getElementById('file-list');
        
        if (!uploadArea.contains(e.target) && !fileList.contains(e.target)) {
            return;
        }
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }
    
    // エラー表示関連
    hideError() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
    
    hidePreviewError() {
        const previewErrorDiv = document.getElementById('preview-error-message');
        if (previewErrorDiv) {
            previewErrorDiv.style.display = 'none';
        }
    }
    
    showLoading(show) {
        const loading = document.getElementById('loading');
        const convertBtn = document.getElementById('convert-btn');
        
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
        
        if (convertBtn) {
            convertBtn.disabled = show || appState.getUploadedFiles().length === 0;
        }
    }
}

// シングルトンインスタンスを作成
export const fileManager = new FileManager();

// グローバル関数として公開（既存コードとの互換性のため）
window.addFiles = (files) => fileManager.addFiles(files);
window.removeFile = (index) => fileManager.removeFile(index);
window.removeAllFiles = () => fileManager.removeAllFiles();
