/**
 * メインアプリケーション
 */

import { TIMER_CONSTANTS } from '../constants/config.js';
import { appState, initializeGlobalState } from './state.js';
import { configManager } from './config.js';
import { loadPreviewModeFromLocalStorage, savePreviewModeToLocalStorage } from '../utils/storage-utils.js';
import { showError } from '../utils/error-utils.js';

/**
 * アプリケーション初期化
 */
export async function initializeApp() {
    try {
        // グローバル状態の初期化
        initializeGlobalState();
        
        // 設定管理の初期化
        await configManager.initialize();
        
        // プレビューモードの復元
        const savedPreviewMode = loadPreviewModeFromLocalStorage();
        appState.setCurrentPreviewMode(savedPreviewMode);
        
        // トグルスイッチの初期状態を確実に設定
        setTimeout(() => {
            const toggleSwitch = document.getElementById('preview-toggle');
            if (toggleSwitch) {
                toggleSwitch.checked = (savedPreviewMode === 'wysiwyg');
                toggleSwitch.style.display = 'block';
            }
            
            // プレビューエリアの表示切り替えを確実に実行
            ensurePreviewModeDisplay(savedPreviewMode);
        }, TIMER_CONSTANTS.INITIALIZATION_DELAY);
        
        console.log('アプリケーションが正常に初期化されました');
        
    } catch (error) {
        console.error('アプリケーションの初期化に失敗しました:', error);
        showError('アプリケーションの初期化に失敗しました: ' + error.message);
    }
}

/**
 * プレビューモードの表示切り替えを確実に実行する関数
 * @param {string} mode - プレビューモード
 */
function ensurePreviewModeDisplay(mode) {
    const textPreview = document.getElementById('preview-content');
    const wysiwygPreview = document.getElementById('preview-content-wysiwyg');
    
    if (textPreview && wysiwygPreview) {
        if (mode === 'text') {
            textPreview.style.display = 'block';
            wysiwygPreview.style.display = 'none';
        } else if (mode === 'wysiwyg') {
            textPreview.style.display = 'none';
            wysiwygPreview.style.display = 'block';
        }
    } else {
        console.warn('Preview elements not found, retrying...');
        // 要素が見つからない場合は少し待ってから再試行
        setTimeout(() => {
            ensurePreviewModeDisplay(mode);
        }, TIMER_CONSTANTS.RETRY_DELAY);
    }
}

/**
 * アプリケーションの状態をリセットする
 */
export function resetApp() {
    appState.reset();
    configManager.resetToDefault();
}

/**
 * アプリケーションの状態を取得する
 * @returns {Object} アプリケーションの状態
 */
export function getAppState() {
    return {
        uploadedFiles: appState.getUploadedFiles(),
        conversionResult: appState.getConversionResult(),
        currentSettings: appState.getCurrentSettings(),
        currentPreviewMode: appState.getCurrentPreviewMode(),
        markedInstance: appState.getMarkedInstance()
    };
}

/**
 * アプリケーションの設定を取得する
 * @returns {Object} 設定オブジェクト
 */
export function getAppSettings() {
    return configManager.getSettings();
}

/**
 * アプリケーションの設定を更新する
 */
export function updateAppSettings() {
    configManager.updateSettingsFromUI();
}

/**
 * アプリケーションの設定を保存する
 * @returns {boolean} 保存成功かどうか
 */
export function saveAppSettings() {
    return configManager.saveSettings();
}

/**
 * アプリケーションの設定をリセットする
 */
export function resetAppSettings() {
    configManager.resetToDefault();
}

/**
 * プレビューモードを切り替える
 * @param {string} mode - プレビューモード
 */
export function switchPreviewMode(mode) {
    appState.setCurrentPreviewMode(mode);
    savePreviewModeToLocalStorage(mode);
    ensurePreviewModeDisplay(mode);
}

/**
 * プレビューモードを取得する
 * @returns {string} プレビューモード
 */
export function getCurrentPreviewMode() {
    return appState.getCurrentPreviewMode();
}

/**
 * アップロードされたファイルを取得する
 * @returns {Array} ファイル配列
 */
export function getUploadedFiles() {
    return appState.getUploadedFiles();
}

/**
 * アップロードされたファイルを設定する
 * @param {Array} files - ファイル配列
 */
export function setUploadedFiles(files) {
    appState.setUploadedFiles(files);
}

/**
 * ファイルを追加する
 * @param {Array} files - 追加するファイル配列
 */
export function addFiles(files) {
    appState.addFiles(files);
}

/**
 * ファイルを削除する
 * @param {number} index - 削除するファイルのインデックス
 */
export function removeFile(index) {
    appState.removeFile(index);
}

/**
 * すべてのファイルを削除する
 */
export function clearFiles() {
    appState.clearFiles();
}

/**
 * 変換結果を取得する
 * @returns {Object|null} 変換結果
 */
export function getConversionResult() {
    return appState.getConversionResult();
}

/**
 * 変換結果を設定する
 * @param {Object|null} result - 変換結果
 */
export function setConversionResult(result) {
    appState.setConversionResult(result);
}

/**
 * 変換結果をクリアする
 */
export function clearConversionResult() {
    appState.clearConversionResult();
}

/**
 * marked.jsインスタンスを取得する
 * @returns {Object|null} marked.jsインスタンス
 */
export function getMarkedInstance() {
    return appState.getMarkedInstance();
}

/**
 * marked.jsインスタンスを設定する
 * @param {Object|null} instance - marked.jsインスタンス
 */
export function setMarkedInstance(instance) {
    appState.setMarkedInstance(instance);
}

/**
 * WYSIWYG更新タイマーを取得する
 * @returns {number|null} タイマーID
 */
export function getUpdateWysiwygTimeout() {
    return appState.getUpdateWysiwygTimeout();
}

/**
 * WYSIWYG更新タイマーを設定する
 * @param {number|null} timeout - タイマーID
 */
export function setUpdateWysiwygTimeout(timeout) {
    appState.setUpdateWysiwygTimeout(timeout);
}
