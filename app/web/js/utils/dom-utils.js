/**
 * DOM操作ユーティリティ
 */

import { DOM_IDS, ERROR_MESSAGES } from '../constants/config.js';

/**
 * 要素の値を安全に設定する
 * @param {string} elementId - 要素のID
 * @param {string} value - 設定する値
 */
export function setElementValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
    } else {
        console.warn(`${ERROR_MESSAGES.ELEMENT_NOT_FOUND}: ${elementId}`);
    }
}

/**
 * チェックボックスの値を安全に設定する
 * @param {string} elementId - 要素のID
 * @param {boolean} checked - チェック状態
 */
export function setElementChecked(elementId, checked) {
    const element = document.getElementById(elementId);
    if (element) {
        element.checked = checked;
    } else {
        console.warn(`${ERROR_MESSAGES.ELEMENT_NOT_FOUND}: ${elementId}`);
    }
}

/**
 * 要素の値を安全に取得する
 * @param {string} elementId - 要素のID
 * @param {string} defaultValue - デフォルト値
 * @returns {string} 要素の値
 */
export function getElementValue(elementId, defaultValue = '') {
    const element = document.getElementById(elementId);
    return element ? element.value : defaultValue;
}

/**
 * チェックボックスの値を安全に取得する
 * @param {string} elementId - 要素のID
 * @param {boolean} defaultValue - デフォルト値
 * @returns {boolean} チェック状態
 */
export function getElementChecked(elementId, defaultValue = false) {
    const element = document.getElementById(elementId);
    return element ? element.checked : defaultValue;
}

/**
 * 数値要素の値を安全に取得する
 * @param {string} elementId - 要素のID
 * @param {number} defaultValue - デフォルト値
 * @returns {number} 数値
 */
export function getElementNumber(elementId, defaultValue = 0) {
    const element = document.getElementById(elementId);
    return element ? parseInt(element.value) || defaultValue : defaultValue;
}

/**
 * 要素の表示/非表示を切り替える
 * @param {string} elementId - 要素のID
 * @param {boolean} show - 表示するかどうか
 */
export function toggleElementVisibility(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

/**
 * 要素の有効/無効を切り替える
 * @param {string} elementId - 要素のID
 * @param {boolean} enabled - 有効にするかどうか
 */
export function toggleElementEnabled(elementId, enabled) {
    const element = document.getElementById(elementId);
    if (element) {
        element.disabled = !enabled;
        element.style.opacity = enabled ? '1' : '0.6';
        element.style.cursor = enabled ? 'default' : 'not-allowed';
    }
}

/**
 * 要素にクラスを追加する
 * @param {string} elementId - 要素のID
 * @param {string} className - 追加するクラス名
 */
export function addElementClass(elementId, className) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add(className);
    }
}

/**
 * 要素からクラスを削除する
 * @param {string} elementId - 要素のID
 * @param {string} className - 削除するクラス名
 */
export function removeElementClass(elementId, className) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove(className);
    }
}

/**
 * 要素のテキストコンテンツを設定する
 * @param {string} elementId - 要素のID
 * @param {string} text - 設定するテキスト
 */
export function setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

/**
 * 要素のHTMLコンテンツを設定する
 * @param {string} elementId - 要素のID
 * @param {string} html - 設定するHTML
 */
export function setElementHTML(elementId, html) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = html;
    }
}

/**
 * 要素のスクロール位置をリセットする
 * @param {string} elementId - 要素のID
 */
export function resetElementScroll(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollTop = 0;
    }
}

/**
 * 要素をフォーカス可能にする
 * @param {string} elementId - 要素のID
 */
export function makeElementFocusable(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.setAttribute('tabindex', '0');
        element.style.cursor = 'text';
    }
}

/**
 * テキストを全選択する
 * @param {HTMLElement} element - 対象要素
 */
export function selectAllText(element) {
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
