/**
 * テーマ管理モジュール
 */

import { THEMES, STORAGE_KEYS } from '../constants/config.js';
import { 
    loadThemeFromLocalStorage, 
    saveThemeToLocalStorage 
} from '../utils/storage-utils.js';

/**
 * テーマ管理クラス
 */
class ThemeManager {
    constructor() {
        this.currentTheme = THEMES.SYSTEM;
        this.setupEventListeners();
    }
    
    /**
     * イベントリスナーを設定する
     */
    setupEventListeners() {
        // システムテーマ変更の監視
        this.watchSystemTheme();
    }
    
    /**
     * テーマを初期化する
     */
    initialize() {
        const savedTheme = loadThemeFromLocalStorage();
        this.setTheme(savedTheme);
        this.updateThemeSelector();
    }
    
    /**
     * テーマを変更する
     * @param {string} theme - テーマ名
     */
    changeTheme(theme) {
        this.setTheme(theme);
    }
    
    /**
     * テーマを設定する
     * @param {string} theme - テーマ名
     */
    setTheme(theme) {
        saveThemeToLocalStorage(theme);
        this.currentTheme = theme;
        
        let actualTheme;
        if (theme === THEMES.SYSTEM) {
            // システム設定を検出
            actualTheme = this.getSystemTheme();
        } else {
            actualTheme = theme;
        }
        
        document.documentElement.setAttribute('data-theme', actualTheme);
        
        // プルダウンの選択状態を更新
        this.updateThemeSelector();
    }
    
    /**
     * システムテーマを取得する
     * @returns {string} システムテーマ
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return THEMES.DARK;
        } else {
            return THEMES.LIGHT;
        }
    }
    
    /**
     * テーマセレクターの選択状態を更新する
     */
    updateThemeSelector() {
        const themeSelect = document.getElementById('modal-theme-select');
        const savedTheme = loadThemeFromLocalStorage() || THEMES.SYSTEM;
        
        if (themeSelect) {
            themeSelect.value = savedTheme;
        }
    }
    
    /**
     * システムテーマ変更の監視
     */
    watchSystemTheme() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                const currentTheme = loadThemeFromLocalStorage();
                if (currentTheme === THEMES.SYSTEM) {
                    this.setTheme(THEMES.SYSTEM);
                }
            });
        }
    }
    
    /**
     * 現在のテーマを取得する
     * @returns {string} 現在のテーマ
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    /**
     * 実際に適用されているテーマを取得する
     * @returns {string} 実際のテーマ
     */
    getActualTheme() {
        if (this.currentTheme === THEMES.SYSTEM) {
            return this.getSystemTheme();
        }
        return this.currentTheme;
    }
    
    /**
     * テーマがダークモードかどうかを確認する
     * @returns {boolean} ダークモードかどうか
     */
    isDarkMode() {
        return this.getActualTheme() === THEMES.DARK;
    }
    
    /**
     * テーマがライトモードかどうかを確認する
     * @returns {boolean} ライトモードかどうか
     */
    isLightMode() {
        return this.getActualTheme() === THEMES.LIGHT;
    }
    
    /**
     * テーマがシステム設定かどうかを確認する
     * @returns {boolean} システム設定かどうか
     */
    isSystemTheme() {
        return this.currentTheme === THEMES.SYSTEM;
    }
    
    /**
     * テーマをリセットする
     */
    resetTheme() {
        this.setTheme(THEMES.SYSTEM);
    }
    
    /**
     * テーマ設定をクリアする
     */
    clearTheme() {
        localStorage.removeItem(STORAGE_KEYS.THEME);
        this.setTheme(THEMES.SYSTEM);
    }
}

// シングルトンインスタンスを作成
export const themeManager = new ThemeManager();

// グローバル関数として公開（既存コードとの互換性のため）
window.changeTheme = (theme) => themeManager.changeTheme(theme);
window.initializeTheme = () => themeManager.initialize();
window.watchSystemTheme = () => themeManager.watchSystemTheme();
