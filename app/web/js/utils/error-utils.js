/**
 * エラーハンドリングユーティリティ
 */

import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants/config.js';

/**
 * エラーメッセージを表示する
 * @param {string} message - エラーメッセージ
 */
export function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        // 改行文字を<br>タグに変換して表示
        const formattedMessage = message.replace(/\n/g, '<br>');
        errorDiv.innerHTML = formattedMessage;
        errorDiv.style.display = 'block';
    }
}

/**
 * エラーメッセージを非表示にする
 */
export function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

/**
 * プレビューエラーメッセージを表示する
 * @param {string} message - エラーメッセージ
 */
export function showPreviewError(message) {
    const previewErrorDiv = document.getElementById('preview-error-message');
    if (previewErrorDiv) {
        const errorTextDiv = previewErrorDiv.querySelector('.error-text');
        if (errorTextDiv) {
            // 改行文字を<br>タグに変換して表示
            const formattedMessage = message.replace(/\n/g, '<br>');
            errorTextDiv.innerHTML = formattedMessage;
        }
        previewErrorDiv.style.display = 'flex';
        
        // プレビューコントロールを非表示
        const previewControls = document.querySelector('.preview-controls');
        if (previewControls) {
            previewControls.style.display = 'none';
        }
        
        // プレビュー内容を非表示
        const previewContent = document.getElementById('preview-content');
        if (previewContent) {
            previewContent.style.display = 'none';
        }
    }
}

/**
 * プレビューエラーメッセージを非表示にする
 */
export function hidePreviewError() {
    const previewErrorDiv = document.getElementById('preview-error-message');
    if (previewErrorDiv) {
        previewErrorDiv.style.display = 'none';
        
        // プレビューコントロールを表示
        const previewControls = document.querySelector('.preview-controls');
        if (previewControls) {
            previewControls.style.display = 'flex';
        }
        
        // プレビュー内容を表示
        const previewContent = document.getElementById('preview-content');
        if (previewContent) {
            previewContent.style.display = 'block';
        }
    }
}

/**
 * 成功メッセージを表示する（トースト通知）
 * @param {string} message - 成功メッセージ
 */
export function showSuccess(message) {
    // 簡単なトースト通知
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    }, 3000);
}

/**
 * API エラーレスポンスを処理する
 * @param {Response} response - レスポンスオブジェクト
 * @returns {Promise<string>} エラーメッセージ
 */
export async function handleApiError(response) {
    let errorMessage = ERROR_MESSAGES.CONVERSION_FAILED;
    
    try {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        console.error('Error data type:', typeof errorData);
        console.error('Error data keys:', Object.keys(errorData));
        
        // 複数のフィールドからエラーメッセージを取得を試行
        if (errorData.detail) {
            errorMessage = errorData.detail;
        } else if (errorData.error) {
            errorMessage = errorData.error;
        } else if (errorData.message) {
            errorMessage = errorData.message;
        } else if (typeof errorData === 'string') {
            errorMessage = errorData;
        }
    } catch (jsonError) {
        console.error('Failed to parse error response:', jsonError);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        console.log('Using fallback error message:', errorMessage);
    }
    
    return errorMessage;
}

/**
 * 汎用エラーハンドラー
 * @param {Error} error - エラーオブジェクト
 * @param {string} context - エラーが発生したコンテキスト
 * @returns {string} ユーザーフレンドリーなエラーメッセージ
 */
export function handleGenericError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    // APIエラーの場合は元のメッセージを保持（詳細なエラーメッセージが含まれている可能性がある）
    if (error.message && (
        error.message.includes('変換結果が空です') ||
        error.message.includes('対象シートが見つかりません') ||
        error.message.includes('ファイル') ||
        error.message.includes('シート')
    )) {
        return error.message;
    }
    
    // エラーの種類に応じてメッセージを決定
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
    }
    
    if (error.name === 'SyntaxError') {
        return 'データの解析中にエラーが発生しました。';
    }
    
    if (error.message.includes('設定')) {
        return ERROR_MESSAGES.SETTINGS_LOAD_FAILED;
    }
    
    if (error.message.includes('ダウンロード')) {
        return ERROR_MESSAGES.DOWNLOAD_FAILED;
    }
    
    // デフォルトのエラーメッセージ
    return error.message || '予期しないエラーが発生しました。';
}

/**
 * エラーログを構造化して出力する
 * @param {string} level - ログレベル ('error', 'warn', 'info')
 * @param {string} message - メッセージ
 * @param {Object} context - コンテキスト情報
 * @param {Error} error - エラーオブジェクト（オプション）
 */
export function logError(level, message, context = {}, error = null) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    if (error) {
        logEntry.error = {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
    }
    
    console[level](`[${level.toUpperCase()}] ${message}`, logEntry);
}
