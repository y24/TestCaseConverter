/**
 * バリデーション・データ処理ユーティリティ
 */

import { FILE_CONSTANTS } from '../constants/config.js';

/**
 * カンマ区切りの文字列を配列に変換する
 * @param {string} value - カンマ区切りの文字列
 * @returns {Array} 配列
 */
export function parseCommaSeparated(value) {
    if (!value || value.trim() === '') return [];
    return value.split(',').map(item => item.trim()).filter(item => item !== '');
}

/**
 * 括弧付きの文字列をkeysとignoresに分離する
 * @param {string} value - 括弧付きの文字列
 * @returns {Object} {keys: Array, ignores: Array}
 */
export function parseKeysAndIgnores(value) {
    if (!value || value.trim() === '') return { keys: [], ignores: [] };
    
    const keys = [];
    const ignores = [];
    
    value.split(',').forEach(item => {
        item = item.trim();
        if (item === '') return;
        
        // 括弧で囲まれている場合はignoresに追加
        if (item.startsWith('(') && item.endsWith(')')) {
            ignores.push(item.slice(1, -1)); // 括弧を除去
        } else {
            keys.push(item);
        }
    });
    
    return { keys, ignores };
}

/**
 * ファイルが有効かどうかをチェックする
 * @param {File} file - チェックするファイル
 * @returns {boolean} 有効かどうか
 */
export function isValidFile(file) {
    const isValidType = file.name.match(/\.(xlsx|xls)$/i);
    const isValidSize = file.size <= FILE_CONSTANTS.MAX_FILE_SIZE;
    return isValidType && isValidSize;
}

/**
 * ファイル名の重複をチェックする
 * @param {string} filename - チェックするファイル名
 * @param {Array} existingFiles - 既存のファイル配列
 * @returns {boolean} 重複しているかどうか
 */
export function isFilenameDuplicate(filename, existingFiles) {
    return existingFiles.some(file => file.name === filename);
}

/**
 * 重複しないファイル名を生成する
 * @param {File} file - 元のファイル
 * @param {Array} existingFiles - 既存のファイル配列
 * @returns {string} 重複しないファイル名
 */
export function generateUniqueFilename(file, existingFiles) {
    let finalFilename = file.name;
    let counter = 1;
    
    while (isFilenameDuplicate(finalFilename, existingFiles)) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const extension = file.name.match(/\.[^/.]+$/)?.[0] || '';
        finalFilename = `${nameWithoutExt} (${counter})${extension}`;
        counter++;
    }
    
    return finalFilename;
}

/**
 * ファイルサイズをフォーマットする
 * @param {number} bytes - バイト数
 * @returns {string} フォーマットされたファイルサイズ
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 設定値の検証
 * @param {Object} settings - 検証する設定オブジェクト
 * @returns {Object} 検証結果 {isValid: boolean, errors: Array}
 */
export function validateSettings(settings) {
    const errors = [];
    
    // 必須フィールドのチェック
    if (!settings.output_format) {
        errors.push('出力フォーマットが指定されていません');
    }
    
    if (!settings.split_mode) {
        errors.push('分割モードが指定されていません');
    }
    
    // 数値フィールドのチェック
    if (settings.id_padding && (isNaN(settings.id_padding) || settings.id_padding < 1)) {
        errors.push('IDパディングは1以上の数値である必要があります');
    }
    
    if (settings.id_start_number && (isNaN(settings.id_start_number) || settings.id_start_number < 1)) {
        errors.push('ID開始番号は1以上の数値である必要があります');
    }
    
    // 文字列フィールドのチェック
    if (settings.id_prefix && typeof settings.id_prefix !== 'string') {
        errors.push('IDプレフィックスは文字列である必要があります');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 設定オブジェクトの正規化
 * @param {Object} settings - 正規化する設定オブジェクト
 * @returns {Object} 正規化された設定オブジェクト
 */
export function normalizeSettings(settings) {
    const normalized = { ...settings };
    
    // 数値フィールドの正規化
    if (normalized.id_padding) {
        normalized.id_padding = parseInt(normalized.id_padding) || 3;
    }
    
    if (normalized.id_start_number) {
        normalized.id_start_number = parseInt(normalized.id_start_number) || 1;
    }
    
    // 文字列フィールドの正規化
    if (normalized.id_prefix) {
        normalized.id_prefix = String(normalized.id_prefix).trim();
    }
    
    // 配列フィールドの正規化
    if (normalized.sheet_search_keys) {
        if (typeof normalized.sheet_search_keys === 'string') {
            normalized.sheet_search_keys = parseCommaSeparated(normalized.sheet_search_keys);
        }
    }
    
    return normalized;
}
