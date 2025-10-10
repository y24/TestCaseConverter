/**
 * グローバル状態管理
 */

import { PREVIEW_MODES } from '../constants/config.js';

/**
 * アプリケーションの状態管理クラス
 */
class AppState {
    constructor() {
        this.uploadedFiles = [];
        this.conversionResult = null;
        this.currentSettings = {};
        this.currentPreviewMode = PREVIEW_MODES.TEXT;
        this.markedInstance = null;
        this.updateWysiwygTimeout = null;
        
        // 状態変更のリスナー
        this.listeners = new Map();
    }
    
    /**
     * アップロードされたファイルを取得
     * @returns {Array} ファイル配列
     */
    getUploadedFiles() {
        return [...this.uploadedFiles];
    }
    
    /**
     * アップロードされたファイルを設定
     * @param {Array} files - ファイル配列
     */
    setUploadedFiles(files) {
        this.uploadedFiles = [...files];
        this.notifyListeners('uploadedFiles', this.uploadedFiles);
    }
    
    /**
     * ファイルを追加
     * @param {Array} files - 追加するファイル配列
     */
    addFiles(files) {
        this.uploadedFiles.push(...files);
        this.notifyListeners('uploadedFiles', this.uploadedFiles);
    }
    
    /**
     * ファイルを削除
     * @param {number} index - 削除するファイルのインデックス
     */
    removeFile(index) {
        if (index >= 0 && index < this.uploadedFiles.length) {
            this.uploadedFiles.splice(index, 1);
            this.notifyListeners('uploadedFiles', this.uploadedFiles);
        }
    }
    
    /**
     * すべてのファイルを削除
     */
    clearFiles() {
        this.uploadedFiles = [];
        this.notifyListeners('uploadedFiles', this.uploadedFiles);
    }
    
    /**
     * 変換結果を取得
     * @returns {Object|null} 変換結果
     */
    getConversionResult() {
        return this.conversionResult;
    }
    
    /**
     * 変換結果を設定
     * @param {Object|null} result - 変換結果
     */
    setConversionResult(result) {
        this.conversionResult = result;
        this.notifyListeners('conversionResult', this.conversionResult);
    }
    
    /**
     * 変換結果をクリア
     */
    clearConversionResult() {
        this.conversionResult = null;
        this.notifyListeners('conversionResult', this.conversionResult);
    }
    
    /**
     * 現在の設定を取得
     * @returns {Object} 設定オブジェクト
     */
    getCurrentSettings() {
        return { ...this.currentSettings };
    }
    
    /**
     * 現在の設定を設定
     * @param {Object} settings - 設定オブジェクト
     */
    setCurrentSettings(settings) {
        this.currentSettings = { ...settings };
        this.notifyListeners('currentSettings', this.currentSettings);
    }
    
    /**
     * プレビューモードを取得
     * @returns {string} プレビューモード
     */
    getCurrentPreviewMode() {
        return this.currentPreviewMode;
    }
    
    /**
     * プレビューモードを設定
     * @param {string} mode - プレビューモード
     */
    setCurrentPreviewMode(mode) {
        if (mode === PREVIEW_MODES.TEXT || mode === PREVIEW_MODES.WYSIWYG) {
            this.currentPreviewMode = mode;
            this.notifyListeners('currentPreviewMode', this.currentPreviewMode);
        }
    }
    
    /**
     * marked.jsインスタンスを取得
     * @returns {Object|null} marked.jsインスタンス
     */
    getMarkedInstance() {
        return this.markedInstance;
    }
    
    /**
     * marked.jsインスタンスを設定
     * @param {Object|null} instance - marked.jsインスタンス
     */
    setMarkedInstance(instance) {
        this.markedInstance = instance;
        this.notifyListeners('markedInstance', this.markedInstance);
    }
    
    /**
     * WYSIWYG更新タイマーを取得
     * @returns {number|null} タイマーID
     */
    getUpdateWysiwygTimeout() {
        return this.updateWysiwygTimeout;
    }
    
    /**
     * WYSIWYG更新タイマーを設定
     * @param {number|null} timeout - タイマーID
     */
    setUpdateWysiwygTimeout(timeout) {
        this.updateWysiwygTimeout = timeout;
    }
    
    /**
     * 状態変更リスナーを追加
     * @param {string} key - 監視する状態のキー
     * @param {Function} callback - コールバック関数
     */
    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }
    
    /**
     * 状態変更リスナーを削除
     * @param {string} key - 監視する状態のキー
     * @param {Function} callback - コールバック関数
     */
    removeListener(key, callback) {
        if (this.listeners.has(key)) {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * リスナーに通知
     * @param {string} key - 状態のキー
     * @param {*} value - 新しい値
     */
    notifyListeners(key, value) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error(`Error in state listener for ${key}:`, error);
                }
            });
        }
    }
    
    /**
     * すべてのリスナーをクリア
     */
    clearAllListeners() {
        this.listeners.clear();
    }
    
    /**
     * 状態をリセット
     */
    reset() {
        this.uploadedFiles = [];
        this.conversionResult = null;
        this.currentSettings = {};
        this.currentPreviewMode = PREVIEW_MODES.TEXT;
        this.markedInstance = null;
        this.updateWysiwygTimeout = null;
        this.clearAllListeners();
    }
}

// シングルトンインスタンスを作成
export const appState = new AppState();

// 後方互換性のためのグローバル変数
export function initializeGlobalState() {
    // グローバル変数として公開（既存コードとの互換性のため）
    window.uploadedFiles = appState.uploadedFiles;
    window.conversionResult = appState.conversionResult;
    window.currentSettings = appState.currentSettings;
    window.currentPreviewMode = appState.currentPreviewMode;
    window.markedInstance = appState.markedInstance;
    window.updateWysiwygTimeout = appState.updateWysiwygTimeout;
    
    // 状態変更時にグローバル変数も更新
    appState.addListener('uploadedFiles', (files) => {
        window.uploadedFiles = files;
    });
    
    appState.addListener('conversionResult', (result) => {
        window.conversionResult = result;
    });
    
    appState.addListener('currentSettings', (settings) => {
        window.currentSettings = settings;
    });
    
    appState.addListener('currentPreviewMode', (mode) => {
        window.currentPreviewMode = mode;
    });
    
    appState.addListener('markedInstance', (instance) => {
        window.markedInstance = instance;
    });
}
