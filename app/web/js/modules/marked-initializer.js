/**
 * marked.js初期化モジュール
 */

import { appState } from '../core/state.js';

/**
 * marked.js初期化クラス
 */
class MarkedInitializer {
    constructor() {
        this.isInitialized = false;
    }
    
    /**
     * marked.jsを初期化する
     */
    async initialize() {
        try {
            // marked.jsが読み込まれているかチェック
            if (typeof marked !== 'undefined') {
                appState.setMarkedInstance(marked);
                this.configureMarked();
                this.isInitialized = true;
                console.log('marked.js が正常に初期化されました');
                return true;
            } else {
                console.warn('marked.js が読み込まれていません。WYSIWYGプレビューは利用できません。');
                this.handleMarkedNotAvailable();
                return false;
            }
        } catch (error) {
            console.error('marked.js の初期化に失敗しました:', error);
            this.handleMarkedNotAvailable();
            return false;
        }
    }
    
    /**
     * marked.jsの設定を行う
     */
    configureMarked() {
        const markedInstance = appState.getMarkedInstance();
        if (!markedInstance) return;
        
        markedInstance.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false
        });
    }
    
    /**
     * marked.jsが利用できない場合の処理
     */
    handleMarkedNotAvailable() {
        // WYSIWYGボタンを無効化
        const wysiwygBtn = document.getElementById('wysiwyg-preview-btn');
        if (wysiwygBtn) {
            wysiwygBtn.disabled = true;
            wysiwygBtn.title = 'marked.jsが読み込まれていません';
        }
        
        // プレビューモードをテキストに強制切り替え
        const toggleSwitch = document.getElementById('preview-toggle');
        if (toggleSwitch) {
            toggleSwitch.checked = false;
            toggleSwitch.disabled = true;
        }
        
        // 状態をテキストモードに設定
        appState.setCurrentPreviewMode('text');
    }
    
    /**
     * 初期化済みかどうかを確認する
     * @returns {boolean} 初期化済みかどうか
     */
    isReady() {
        return this.isInitialized;
    }
    
    /**
     * marked.jsインスタンスを取得する
     * @returns {Object|null} marked.jsインスタンス
     */
    getMarkedInstance() {
        return appState.getMarkedInstance();
    }
}

// シングルトンインスタンスを作成
export const markedInitializer = new MarkedInitializer();
