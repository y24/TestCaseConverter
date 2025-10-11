/**
 * UI制御モジュール
 */

import { 
    DOM_IDS, 
    CSS_CLASSES, 
    TIMER_CONSTANTS, 
    ERROR_MESSAGES, 
    SUCCESS_MESSAGES 
} from '../constants/config.js';
import { 
    setElementValue, 
    setElementChecked, 
    toggleElementEnabled,
    toggleElementVisibility,
    addElementClass,
    removeElementClass 
} from '../utils/dom-utils.js';
import { showSuccess, showError } from '../utils/error-utils.js';
import { configManager } from '../core/config.js';
import { appState } from '../core/state.js';

/**
 * UI制御クラス
 */
class UIController {
    constructor() {
        this.setupEventListeners();
        this.initializeCollapsibleSections();
    }
    
    /**
     * イベントリスナーを設定する
     */
    setupEventListeners() {
        // 自動変換用のイベントリスナー設定
        this.setupAutoConvertListeners();
        
        // サイドバー切り替え
        this.setupSidebarToggle();
        
        // 設定モーダル
        this.setupSettingsModal();
        
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeSettingsModal();
            }
        });
    }
    
    /**
     * 自動変換用のイベントリスナー設定
     */
    setupAutoConvertListeners() {
        // プルダウン（select）の変更時
        const selectElements = document.querySelectorAll('.sidebar-content select');
        selectElements.forEach(select => {
            select.addEventListener('change', () => {
                // 出力フォーマット変更時は特別処理
                if (select.id === DOM_IDS.OUTPUT_FORMAT) {
                    this.toggleOutputLanguageSelect();
                    this.togglePreviewModeSwitcher();
                }
                this.updateSettings();
                this.triggerAutoConvert();
            });
        });
        
        // チェックボックスの変更時
        const checkboxElements = document.querySelectorAll('.sidebar-content input[type="checkbox"]');
        checkboxElements.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                // 「ケースIDを採番」チェックボックスの場合は特別処理
                if (checkbox.id === DOM_IDS.OUTPUT_CASE_ID) {
                    this.toggleCaseIdInputs(checkbox.checked);
                }
                this.updateSettings();
                this.triggerAutoConvert();
            });
        });
        
        // テキストボックスの入力時のみ自動変換
        const textInputs = document.querySelectorAll('.sidebar-content input[type="text"], .sidebar-content input[type="number"]');
        textInputs.forEach(input => {
            // フォーカス時の初期値を保存
            let initialValue = input.value;
            
            input.addEventListener('focus', () => {
                // フォーカス時の値を保存
                initialValue = input.value;
            });
            
            input.addEventListener('blur', () => {
                // 値が実際に変更された場合のみ自動変換
                if (input.value !== initialValue) {
                    this.updateSettings();
                    this.triggerAutoConvert();
                }
            });
            
            // 入力中にもリアルタイムで変換（デバウンス付き）
            let timeoutId;
            input.addEventListener('input', () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    this.updateSettings();
                    this.triggerAutoConvert();
                }, TIMER_CONSTANTS.DEBOUNCE_DELAY);
            });
        });
    }
    
    /**
     * サイドバー切り替えの設定
     */
    setupSidebarToggle() {
        // サイドバートグルボタンが存在する場合のイベントリスナー設定
        // 実際のボタンはHTMLに依存するため、ここでは基本的な設定のみ
    }
    
    /**
     * 設定モーダルの設定
     */
    setupSettingsModal() {
        // 設定モーダルのイベントリスナー設定
        // 実際のモーダルはHTMLに依存するため、ここでは基本的な設定のみ
    }
    
    /**
     * 設定をUIに適用する
     */
    applySettingsToUI() {
        try {
            const settings = configManager.getSettings();
            
            // 出力設定
            setElementValue(DOM_IDS.OUTPUT_FORMAT, settings.output_format || 'markdown');
            setElementValue(DOM_IDS.SPLIT_MODE, settings.split_mode || 'per_sheet');
            setElementValue(DOM_IDS.OUTPUT_LANGUAGE, settings.output_language || 'ja');
            setElementChecked(DOM_IDS.OUTPUT_BASIC_INFO, settings.output_basic_info !== false);
            setElementChecked(DOM_IDS.OUTPUT_META_INFO, settings.output_meta_info !== false);
            setElementChecked(DOM_IDS.OUTPUT_SOURCE_INFO, settings.output_source_info !== false);
            
            // ケースID設定
            setElementValue(DOM_IDS.ID_PREFIX, settings.id_prefix || 'TC-');
            setElementValue(DOM_IDS.ID_PADDING, settings.id_padding !== undefined ? settings.id_padding : 1);
            setElementValue(DOM_IDS.ID_START_NUMBER, settings.id_start_number || 1);
            setElementChecked(DOM_IDS.OUTPUT_CASE_ID, settings.output_case_id !== false);
            
            // ケースID関連のテキストボックスの有効/無効を設定
            this.toggleCaseIdInputs(settings.output_case_id !== false);
            
            // 出力言語プルダウンの有効/無効を設定
            this.toggleOutputLanguageSelect();
            
            // プレビューモード切り替えスイッチの表示/非表示を設定
            this.togglePreviewModeSwitcher();
            
            // 文字列処理設定
            setElementChecked(DOM_IDS.TRIM_WHITESPACES, settings.trim_whitespaces !== false);
            setElementChecked(DOM_IDS.FORWARD_FILL_CATEGORY, settings.forward_fill_category !== false);
            setElementChecked(DOM_IDS.NORMALIZE_ZENKAKU, settings.normalize_zenkaku_alphanumeric !== false);
            setElementChecked(DOM_IDS.NORMALIZE_STEP_NUMBERS, settings.normalize_step_numbers !== false);
            
            // シート名設定
            setElementValue(DOM_IDS.SHEET_SEARCH_KEYS, 
                settings.sheet_search_keys ? settings.sheet_search_keys.join(',') : 'テスト項目');
            
            // 読み取り設定
            const header = settings.header || { search_col: "A", search_key: "#" };
            setElementValue(DOM_IDS.HEADER_SEARCH_COL, header.search_col || "A");
            setElementValue(DOM_IDS.HEADER_SEARCH_KEY, header.search_key || "#");
            
            const categoryRow = settings.category_row || { keys: ["大項目", "中項目", "小項目1", "小項目2"] };
            setElementValue(DOM_IDS.CATEGORY_KEYS, 
                categoryRow.keys ? categoryRow.keys.join(',') : "大項目,中項目,小項目1,小項目2");
            
            // その他の設定も同様に適用
            this.applyRowSettings(settings);
            
        } catch (error) {
            console.error(`${ERROR_MESSAGES.SETTINGS_APPLY_FAILED}:`, error);
            showError(`${ERROR_MESSAGES.SETTINGS_APPLY_FAILED}: ${error.message}`);
        }
    }
    
    /**
     * 行設定を適用する
     * @param {Object} settings - 設定オブジェクト
     */
    applyRowSettings(settings) {
        const rowSettings = [
            { key: 'title_row', domId: DOM_IDS.TITLE_KEYS, default: '' },
            { key: 'step_row', domId: DOM_IDS.STEP_KEYS, default: '手順' },
            { key: 'tobe_row', domId: DOM_IDS.TOBE_KEYS, default: '結果,(実施結果)' },
            { key: 'test_type_row', domId: DOM_IDS.TEST_TYPE_KEYS, default: 'テスト種別' },
            { key: 'priority_row', domId: DOM_IDS.PRIORITY_KEYS, default: '優先度' },
            { key: 'precondition_row', domId: DOM_IDS.PRECONDITION_KEYS, default: '前提条件' },
            { key: 'note_row', domId: DOM_IDS.NOTE_KEYS, default: '備考,補足情報' }
        ];
        
        rowSettings.forEach(({ key, domId, default: defaultValue }) => {
            const row = settings[key] || { keys: [defaultValue], ignores: [] };
            const display = [];
            
            if (row.keys) {
                display.push(...row.keys);
            }
            if (row.ignores) {
                display.push(...row.ignores.map(ignore => `(${ignore})`));
            }
            
            setElementValue(domId, display.join(',') || defaultValue);
        });
    }
    
    /**
     * 設定を更新する
     */
    updateSettings() {
        configManager.updateSettingsFromUI();
    }
    
    /**
     * 設定を保存する
     */
    async saveSettings() {
        try {
            this.updateSettings();
            
            if (configManager.saveSettings()) {
                showSuccess(SUCCESS_MESSAGES.SETTINGS_SAVED);
            } else {
                throw new Error(ERROR_MESSAGES.SETTINGS_SAVE_FAILED);
            }
        } catch (error) {
            showError(`${ERROR_MESSAGES.SETTINGS_SAVE_FAILED}: ${error.message}`);
        }
    }
    
    /**
     * デフォルト設定に戻す
     */
    resetToDefaultSettings() {
        // 確認ダイアログを表示
        const confirmed = confirm('設定をデフォルトに戻しますか？\n\nこの操作により、現在の設定はすべて失われます。');
        
        if (!confirmed) {
            return;
        }
        
        try {
            configManager.resetToDefault();
            this.applySettingsToUI();
            showSuccess(SUCCESS_MESSAGES.DEFAULT_SETTINGS_RESTORED);
        } catch (error) {
            showError(`${ERROR_MESSAGES.SETTINGS_LOAD_FAILED}: ${error.message}`);
        }
    }
    
    /**
     * ケースID関連のテキストボックスの有効/無効を切り替える
     * @param {boolean} enabled - 有効にするかどうか
     */
    toggleCaseIdInputs(enabled) {
        const inputs = [
            DOM_IDS.ID_PREFIX,
            DOM_IDS.ID_PADDING,
            DOM_IDS.ID_START_NUMBER
        ];
        
        inputs.forEach(inputId => {
            toggleElementEnabled(inputId, enabled);
        });
    }
    
    /**
     * 出力言語プルダウンの有効/無効を切り替える
     */
    toggleOutputLanguageSelect() {
        const outputFormatSelect = document.getElementById(DOM_IDS.OUTPUT_FORMAT);
        const outputLanguageSelect = document.getElementById(DOM_IDS.OUTPUT_LANGUAGE);
        
        if (outputFormatSelect && outputLanguageSelect) {
            const isYamlFormat = outputFormatSelect.value === 'yaml';
            const shouldDisableLanguage = isYamlFormat;
            
            toggleElementEnabled(DOM_IDS.OUTPUT_LANGUAGE, !shouldDisableLanguage);
        }
        
        // CSVフォーマットの場合のチェックボックス制御
        this.toggleCsvCheckboxes();
    }
    
    /**
     * CSVフォーマットの場合のチェックボックス制御
     */
    toggleCsvCheckboxes() {
        const outputFormatSelect = document.getElementById(DOM_IDS.OUTPUT_FORMAT);
        const metaInfoCheckbox = document.getElementById(DOM_IDS.OUTPUT_META_INFO);
        const sourceInfoCheckbox = document.getElementById(DOM_IDS.OUTPUT_SOURCE_INFO);
        
        if (outputFormatSelect && metaInfoCheckbox && sourceInfoCheckbox) {
            const isCsvFormat = outputFormatSelect.value === 'csv';
            
            // CSVフォーマットの場合はメタ情報と変換元情報のチェックボックスを無効化
            toggleElementEnabled(DOM_IDS.OUTPUT_META_INFO, !isCsvFormat);
            toggleElementEnabled(DOM_IDS.OUTPUT_SOURCE_INFO, !isCsvFormat);
            
            // CSVフォーマットの場合は強制的にチェックを外す
            if (isCsvFormat) {
                setElementChecked(DOM_IDS.OUTPUT_META_INFO, false);
                setElementChecked(DOM_IDS.OUTPUT_SOURCE_INFO, false);
            }
        }
    }
    
    /**
     * プレビューモード切り替えスイッチの表示/非表示制御
     */
    togglePreviewModeSwitcher() {
        const outputFormatSelect = document.getElementById(DOM_IDS.OUTPUT_FORMAT);
        const previewModeSwitcher = document.querySelector(CSS_CLASSES.PREVIEW_MODE_SWITCHER);
        
        if (outputFormatSelect && previewModeSwitcher) {
            const outputFormat = outputFormatSelect.value;
            const isMarkdownFormat = outputFormat === 'markdown';
            
            if (isMarkdownFormat) {
                // Markdown形式の場合は表示
                previewModeSwitcher.style.display = 'flex';
            } else {
                // Markdown形式以外の場合は非表示
                previewModeSwitcher.style.display = 'none';
                // 非表示の場合はテキストモードに強制切り替え
                appState.setCurrentPreviewMode('text');
                // プレビューモード切り替えイベントを発火
                const event = new CustomEvent('switchPreviewMode', { detail: 'text' });
                document.dispatchEvent(event);
            }
        }
    }
    
    /**
     * サイドメニューを切り替える
     */
    toggleSidebar() {
        const sidebar = document.getElementById(DOM_IDS.SIDEBAR);
        const overlay = document.getElementById(DOM_IDS.SIDEBAR_OVERLAY);
        
        if (sidebar) {
            if (sidebar.classList.contains(CSS_CLASSES.OPEN)) {
                sidebar.classList.remove(CSS_CLASSES.OPEN);
                if (overlay) {
                    overlay.classList.remove(CSS_CLASSES.SHOW);
                }
            } else {
                sidebar.classList.add(CSS_CLASSES.OPEN);
                if (overlay) {
                    overlay.classList.add(CSS_CLASSES.SHOW);
                }
            }
        }
    }
    
    /**
     * 設定モーダルを開く
     */
    openSettingsModal() {
        const modal = document.getElementById(DOM_IDS.SETTINGS_MODAL);
        if (modal) {
            modal.classList.add(CSS_CLASSES.SHOW);
            // ボディのスクロールを無効化
            document.body.style.overflow = 'hidden';
        }
    }
    
    /**
     * 設定モーダルを閉じる
     * @param {Event} event - イベントオブジェクト（オプション）
     */
    closeSettingsModal(event) {
        // イベントが渡された場合（オーバーレイクリック）は、オーバーレイ以外のクリックは無視
        if (event && event.target !== event.currentTarget) {
            return;
        }
        
        const modal = document.getElementById(DOM_IDS.SETTINGS_MODAL);
        if (modal) {
            modal.classList.remove(CSS_CLASSES.SHOW);
            // ボディのスクロールを有効化
            document.body.style.overflow = '';
        }
    }
    
    /**
     * 折りたたみ可能セクションの初期化
     */
    initializeCollapsibleSections() {
        const collapsibleSections = document.querySelectorAll(CSS_CLASSES.SECTION_TITLE_COLLAPSIBLE);
        collapsibleSections.forEach(sectionTitle => {
            const sectionContent = sectionTitle.nextElementSibling;
            const toggleIcon = sectionTitle.querySelector(CSS_CLASSES.SECTION_TOGGLE_ICON);
            
            // 「アウトプット設定」セクションは初期表示時に展開
            if (sectionTitle.textContent.includes('アウトプット設定')) {
                sectionContent.classList.add(CSS_CLASSES.EXPANDED);
                toggleIcon.classList.add(CSS_CLASSES.EXPANDED);
            } else {
                // その他のセクションはデフォルトで折りたたみ状態に設定
                sectionContent.classList.remove(CSS_CLASSES.EXPANDED);
                toggleIcon.classList.remove(CSS_CLASSES.EXPANDED);
            }
        });
    }
    
    /**
     * セクション折りたたみ機能
     * @param {HTMLElement} sectionTitle - セクションタイトル要素
     */
    toggleSection(sectionTitle) {
        const sectionContent = sectionTitle.nextElementSibling;
        const toggleIcon = sectionTitle.querySelector(CSS_CLASSES.SECTION_TOGGLE_ICON);
        
        if (sectionContent.classList.contains(CSS_CLASSES.EXPANDED)) {
            // 折りたたみ
            sectionContent.classList.remove(CSS_CLASSES.EXPANDED);
            toggleIcon.classList.remove(CSS_CLASSES.EXPANDED);
        } else {
            // 展開
            sectionContent.classList.add(CSS_CLASSES.EXPANDED);
            toggleIcon.classList.add(CSS_CLASSES.EXPANDED);
        }
    }
    
    /**
     * シート検索キーを設定する
     * @param {string} key - 設定するシート検索キー
     */
    setSheetSearchKey(key) {
        setElementValue(DOM_IDS.SHEET_SEARCH_KEYS, key);
        this.updateSettings();
        this.triggerAutoConvert();
    }
    
    /**
     * 自動変換をトリガーする
     */
    triggerAutoConvert() {
        const event = new CustomEvent('autoConvert');
        document.dispatchEvent(event);
    }
}

// シングルトンインスタンスを作成
export const uiController = new UIController();

// グローバル関数として公開（既存コードとの互換性のため）
window.toggleSidebar = () => uiController.toggleSidebar();
window.saveSettings = () => uiController.saveSettings();
window.resetToDefaultSettings = () => uiController.resetToDefaultSettings();
window.openSettingsModal = () => uiController.openSettingsModal();
window.closeSettingsModal = (event) => uiController.closeSettingsModal(event);
window.toggleSection = (sectionTitle) => uiController.toggleSection(sectionTitle);
window.updateSettings = () => uiController.updateSettings();
window.setSheetSearchKey = (key) => uiController.setSheetSearchKey(key);
