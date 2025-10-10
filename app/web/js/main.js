/**
 * メインエントリーポイント
 */

import { initializeApp } from './core/app.js';
import { themeManager } from './modules/theme-manager.js';
import { previewManager } from './modules/preview.js';
import { converter } from './modules/converter.js';
import { fileManager } from './modules/file-manager.js';
import { uiController } from './modules/ui-controller.js';
import { markedInitializer } from './modules/marked-initializer.js';

/**
 * アプリケーションの初期化
 */
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // テーマ管理の初期化
        themeManager.initialize();
        
        // marked.jsの初期化
        await markedInitializer.initialize();
        
        // アプリケーションの初期化
        await initializeApp();
        
        // UI設定の適用
        uiController.applySettingsToUI();
        
        // イベントリスナーの設定
        setupGlobalEventListeners();
        
        console.log('TestCase Converter が正常に初期化されました');
        
    } catch (error) {
        console.error('アプリケーションの初期化に失敗しました:', error);
        // エラー時のフォールバック処理
        showFallbackError(error);
    }
});

/**
 * グローバルイベントリスナーを設定する
 */
function setupGlobalEventListeners() {
    // 自動変換イベント
    document.addEventListener('autoConvert', () => {
        converter.autoConvert();
    });
    
    // プレビュー表示イベント
    document.addEventListener('showPreview', () => {
        previewManager.showPreview();
    });
    
    // プレビューモード切り替えイベント
    document.addEventListener('switchPreviewMode', (event) => {
        previewManager.switchPreviewMode(event.detail);
    });
}

/**
 * フォールバックエラー表示
 * @param {Error} error - エラーオブジェクト
 */
function showFallbackError(error) {
    // 基本的なエラー表示
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #e74c3c;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    errorDiv.innerHTML = `
        <h3>⚠️ 初期化エラー</h3>
        <p>アプリケーションの初期化に失敗しました。</p>
        <p style="font-size: 0.9em; margin-top: 10px;">${error.message}</p>
        <button onclick="location.reload()" style="
            margin-top: 15px;
            padding: 8px 16px;
            background: white;
            color: #e74c3c;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        ">ページを再読み込み</button>
    `;
    
    document.body.appendChild(errorDiv);
}

// グローバルエラーハンドラー
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// 開発環境でのデバッグ情報
if (process?.env?.NODE_ENV === 'development') {
    window.appDebug = {
        themeManager,
        previewManager,
        converter,
        fileManager,
        uiController
    };
    console.log('Debug information available at window.appDebug');
}
