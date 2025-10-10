/**
 * ローカルストレージ操作ユーティリティ
 */

import { STORAGE_KEYS, ERROR_MESSAGES } from '../constants/config.js';

/**
 * 設定をローカルストレージから読み込む
 * @returns {Object|null} 設定オブジェクトまたはnull
 */
export function loadSettingsFromLocalStorage() {
    try {
        const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
    } catch (error) {
        console.error(`${ERROR_MESSAGES.SETTINGS_LOAD_FAILED}:`, error);
    }
    return null;
}

/**
 * 設定をローカルストレージに保存する
 * @param {Object} settings - 保存する設定オブジェクト
 * @returns {boolean} 保存成功かどうか
 */
export function saveSettingsToLocalStorage(settings) {
    try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error(`${ERROR_MESSAGES.SETTINGS_SAVE_FAILED}:`, error);
        return false;
    }
}

/**
 * テーマ設定をローカルストレージから読み込む
 * @returns {string} テーマ設定
 */
export function loadThemeFromLocalStorage() {
    try {
        return localStorage.getItem(STORAGE_KEYS.THEME) || 'system';
    } catch (error) {
        console.warn('テーマ設定の読み込みに失敗しました:', error);
        return 'system';
    }
}

/**
 * テーマ設定をローカルストレージに保存する
 * @param {string} theme - テーマ設定
 */
export function saveThemeToLocalStorage(theme) {
    try {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (error) {
        console.warn('テーマ設定の保存に失敗しました:', error);
    }
}

/**
 * プレビューモード設定をローカルストレージから読み込む
 * @returns {string} プレビューモード
 */
export function loadPreviewModeFromLocalStorage() {
    try {
        const savedMode = localStorage.getItem(STORAGE_KEYS.PREVIEW_MODE);
        if (savedMode && (savedMode === 'text' || savedMode === 'wysiwyg')) {
            return savedMode;
        }
    } catch (error) {
        console.warn(ERROR_MESSAGES.PREVIEW_MODE_LOAD_FAILED, error);
    }
    return 'text'; // デフォルトはテキストモード
}

/**
 * プレビューモード設定をローカルストレージに保存する
 * @param {string} mode - プレビューモード
 */
export function savePreviewModeToLocalStorage(mode) {
    try {
        localStorage.setItem(STORAGE_KEYS.PREVIEW_MODE, mode);
    } catch (error) {
        console.warn(ERROR_MESSAGES.PREVIEW_MODE_SAVE_FAILED, error);
    }
}

/**
 * 設定をローカルストレージから削除する
 */
export function clearSettingsFromLocalStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    } catch (error) {
        console.warn('設定の削除に失敗しました:', error);
    }
}

/**
 * テーマ設定をローカルストレージから削除する
 */
export function clearThemeFromLocalStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.THEME);
    } catch (error) {
        console.warn('テーマ設定の削除に失敗しました:', error);
    }
}

/**
 * プレビューモード設定をローカルストレージから削除する
 */
export function clearPreviewModeFromLocalStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.PREVIEW_MODE);
    } catch (error) {
        console.warn('プレビューモード設定の削除に失敗しました:', error);
    }
}
