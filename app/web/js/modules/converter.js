/**
 * 変換処理モジュール
 */

import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants/config.js';
import { handleApiError, handleGenericError } from '../utils/error-utils.js';
import { appState } from '../core/state.js';
import { configManager } from '../core/config.js';
import { showLoadingToast, hideToast, showErrorToast } from '../utils/toast-utils.js';

/**
 * 変換処理クラス
 */
class Converter {
    constructor() {
        this.isConverting = false;
        this.loadingToast = null;
        this.loadingStartTime = null;
    }
    
    /**
     * 自動変換を実行する
     */
    async autoConvert() {
        // ファイルがアップロードされていない場合は何もしない
        const files = appState.getUploadedFiles();
        if (files.length === 0) {
            return;
        }
        
        // 既に変換中の場合は何もしない
        if (this.isConverting) {
            return;
        }
        
        try {
            this.isConverting = true;
            
            // 設定を更新
            configManager.updateSettingsFromUI();
            
            // ローディング表示
            this.showLoading(true);
            this.hideError();
            
            // 変換開始時に古い結果をクリア
            appState.clearConversionResult();
            
            // 変換実行
            const result = await this.performConversion(files);
            appState.setConversionResult(result);
            
            // プレビュー表示イベントを発火
            const event = new CustomEvent('showPreview');
            document.dispatchEvent(event);
            
        } catch (error) {
            console.error('Conversion error:', error);
            const errorMessage = handleGenericError(error, 'autoConvert');
            this.showPreviewError('Conversion Error: ' + errorMessage);
            
            // 変換に失敗した場合はプレビューをクリア
            appState.clearConversionResult();
        } finally {
            this.isConverting = false;
            this.showLoading(false);
        }
    }
    
    /**
     * 手動変換を実行する
     */
    async convertFiles() {
        const files = appState.getUploadedFiles();
        if (files.length === 0) {
            this.showError(ERROR_MESSAGES.FILE_SELECT_REQUIRED);
            return;
        }
        
        // 既に変換中の場合は何もしない
        if (this.isConverting) {
            return;
        }
        
        try {
            this.isConverting = true;
            
            // 設定を更新
            configManager.updateSettingsFromUI();
            
            // ローディング表示
            this.showLoading(true);
            this.hideError();
            
            // 変換実行
            const result = await this.performConversion(files);
            appState.setConversionResult(result);
            
            // プレビュー表示イベントを発火
            const event = new CustomEvent('showPreview');
            document.dispatchEvent(event);
            
        } catch (error) {
            console.error('Conversion error:', error);
            const errorMessage = handleGenericError(error, 'convertFiles');
            this.showPreviewError('変換に失敗しました: ' + errorMessage);
        } finally {
            this.isConverting = false;
            this.showLoading(false);
        }
    }
    
    /**
     * 変換処理を実行する
     * @param {Array} files - 変換するファイル配列
     * @returns {Object} 変換結果
     */
    async performConversion(files) {
        // フォームデータ作成
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        
        const settings = configManager.getSettings();
        formData.append('settings_json', JSON.stringify(settings));
        
        const selectedLanguage = settings.output_language || 'ja';
        formData.append('language', selectedLanguage);
        
        // 変換実行
        const response = await fetch(API_ENDPOINTS.CONVERT, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorMessage = await handleApiError(response);
            throw new Error(errorMessage);
        }
        
        return await response.json();
    }
    
    /**
     * ダウンロードを実行する
     */
    async downloadAll() {
        const conversionResult = appState.getConversionResult();
        if (!conversionResult || !conversionResult.cache_key) {
            this.showError(ERROR_MESSAGES.NO_DOWNLOADABLE_FILES);
            return;
        }
        
        try {
            const fileKeys = Object.keys(conversionResult.rendered_text || {});
            
            // 空でないコンテンツを持つファイルのみをフィルタリング
            const validFileKeys = fileKeys.filter(filename => {
                const content = conversionResult.rendered_text[filename];
                return content && content.trim() !== '';
            });
            
            // 表示すべきファイルがない場合はエラーメッセージを表示
            if (validFileKeys.length === 0) {
                this.showError(ERROR_MESSAGES.NO_DOWNLOADABLE_FILES);
                return;
            }
            
            if (validFileKeys.length === 1) {
                // ファイルが1件の場合：単体ファイルダウンロード
                await this.downloadSingleFile(validFileKeys[0], conversionResult);
            } else {
                // ファイルが複数の場合：ZIPダウンロード
                await this.downloadZip(conversionResult);
            }
            
        } catch (error) {
            console.error('Download error:', error);
            const errorMessage = handleGenericError(error, 'downloadAll');
            this.showError(`${ERROR_MESSAGES.DOWNLOAD_FAILED}: ${errorMessage}`);
        }
    }
    
    /**
     * 単体ファイルをダウンロードする
     * @param {string} fileName - ファイル名
     * @param {Object} conversionResult - 変換結果
     */
    async downloadSingleFile(fileName, conversionResult) {
        const fileContent = conversionResult.rendered_text[fileName];
        const settings = configManager.getSettings();
        const outputFormat = settings.output_format || 'markdown';
        
        // ファイル拡張子を取得
        let extension;
        let mimeType;
        
        switch (outputFormat) {
            case 'yaml':
                extension = 'yaml';
                mimeType = 'text/yaml';
                break;
            case 'csv':
                extension = 'csv';
                mimeType = 'text/csv';
                break;
            default:
                extension = 'md';
                mimeType = 'text/markdown';
                break;
        }
        
        const downloadFileName = fileName.endsWith(`.${extension}`) ? fileName : `${fileName}.${extension}`;
        
        // Blobを作成してダウンロード
        const blob = new Blob([fileContent], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    /**
     * ZIPファイルをダウンロードする
     * @param {Object} conversionResult - 変換結果
     */
    async downloadZip(conversionResult) {
        const formData = new FormData();
        formData.append('cache_key', conversionResult.cache_key);
        
        const settings = configManager.getSettings();
        const outputFormat = settings.output_format || 'markdown';
        formData.append('output_format', outputFormat);
        
        const response = await fetch(API_ENDPOINTS.DOWNLOAD, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(ERROR_MESSAGES.DOWNLOAD_FAILED);
        }
        
        // ファイルダウンロード
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'test_cases.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    /**
     * 変換中かどうかを確認する
     * @returns {boolean} 変換中かどうか
     */
    isConvertingNow() {
        return this.isConverting;
    }
    
    // UI制御メソッド
    showLoading(show) {
        const convertBtn = document.getElementById('convert-btn');
        
        if (show) {
            this.loadingStartTime = Date.now();
            // 少し遅延してからトーストを表示（一瞬で終わる場合は表示しない）
            setTimeout(() => {
                const elapsed = Date.now() - this.loadingStartTime;
                if (this.loadingStartTime && elapsed >= 500) {
                    this.loadingToast = showLoadingToast('変換中...');
                }
            }, 500);
        } else {
            // ローディング終了
            if (this.loadingToast) {
                hideToast(this.loadingToast);
                this.loadingToast = null;
            }
            this.loadingStartTime = null;
        }
        
        if (convertBtn) {
            convertBtn.disabled = show || appState.getUploadedFiles().length === 0;
        }
    }
    
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
    
    hideError() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
    
    showPreviewError(message) {
        const previewErrorDiv = document.getElementById('preview-error-message');
        if (previewErrorDiv) {
            const errorTextDiv = previewErrorDiv.querySelector('.error-text');
            if (errorTextDiv) {
                errorTextDiv.textContent = message;
            }
            previewErrorDiv.style.display = 'flex';
            
            // プレビュー内容を非表示
            const previewContent = document.getElementById('preview-content');
            if (previewContent) {
                previewContent.style.display = 'none';
            }
        }
    }
}

// シングルトンインスタンスを作成
export const converter = new Converter();

// グローバル関数として公開（既存コードとの互換性のため）
window.autoConvert = () => converter.autoConvert();
window.convertFiles = () => converter.convertFiles();
window.downloadAll = () => converter.downloadAll();
