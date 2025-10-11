/**
 * トースト通知ユーティリティ
 */

/**
 * トースト表示機能
 * @param {string} message - 表示するメッセージ
 * @param {string} type - トーストのタイプ ('success', 'error', 'warning', 'loading', 'info')
 * @param {number} duration - 表示時間（ミリ秒、0の場合は自動削除しない）
 * @returns {HTMLElement} 作成されたトースト要素
 */
export function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    // タイプに応じたスタイル設定
    let backgroundColor, icon;
    switch (type) {
        case 'success':
            backgroundColor = '#27ae60';
            icon = '✅';
            break;
        case 'error':
            backgroundColor = '#e74c3c';
            icon = '❌';
            break;
        case 'warning':
            backgroundColor = '#f39c12';
            icon = '⚠️';
            break;
        case 'loading':
            backgroundColor = '#3498db';
            icon = '⏳';
            break;
        default:
            backgroundColor = '#3498db';
            icon = 'ℹ️';
    }
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        word-wrap: break-word;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease-in-out;
    `;
    
    toast.innerHTML = `
        <span style="font-size: 16px;">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // アニメーション表示
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // 自動削除
    if (duration > 0) {
        setTimeout(() => {
            hideToast(toast);
        }, duration);
    }
    
    return toast;
}

/**
 * トーストを手動で削除する関数
 * @param {HTMLElement} toast - 削除するトースト要素
 */
export function hideToast(toast) {
    if (toast && document.body.contains(toast)) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }
}

/**
 * 成功メッセージ表示
 * @param {string} message - 表示するメッセージ
 */
export function showSuccessToast(message) {
    showToast(message, 'success');
}

/**
 * エラーメッセージ表示
 * @param {string} message - 表示するメッセージ
 */
export function showErrorToast(message) {
    showToast(message, 'error');
}

/**
 * 警告メッセージ表示
 * @param {string} message - 表示するメッセージ
 */
export function showWarningToast(message) {
    showToast(message, 'warning');
}

/**
 * 情報メッセージ表示
 * @param {string} message - 表示するメッセージ
 */
export function showInfoToast(message) {
    showToast(message, 'info');
}

/**
 * ローディングメッセージ表示
 * @param {string} message - 表示するメッセージ
 * @returns {HTMLElement} 作成されたトースト要素
 */
export function showLoadingToast(message) {
    return showToast(message, 'loading', 0); // 0 = 自動削除しない
}

// グローバルに公開（既存コードとの互換性のため）
window.showToast = showToast;
window.hideToast = hideToast;
window.showSuccessToast = showSuccessToast;
window.showErrorToast = showErrorToast;
window.showWarningToast = showWarningToast;
window.showInfoToast = showInfoToast;
window.showLoadingToast = showLoadingToast;
