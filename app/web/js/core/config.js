/**
 * 設定管理
 */

import { 
    DEFAULT_VALUES, 
    API_ENDPOINTS, 
    ERROR_MESSAGES 
} from '../constants/config.js';
import { 
    loadSettingsFromLocalStorage, 
    saveSettingsToLocalStorage 
} from '../utils/storage-utils.js';
import { 
    validateSettings, 
    normalizeSettings 
} from '../utils/validation-utils.js';
import { 
    getElementValue, 
    getElementChecked, 
    getElementNumber 
} from '../utils/dom-utils.js';
import { showError } from '../utils/error-utils.js';

/**
 * 設定管理クラス
 */
class ConfigManager {
    constructor() {
        this.settings = {};
        this.isInitialized = false;
    }
    
    /**
     * 設定を初期化する
     */
    async initialize() {
        try {
            // まずlocalStorageから保存された設定を読み込み
            const savedSettings = loadSettingsFromLocalStorage();
            if (savedSettings) {
                this.settings = savedSettings;
                return;
            }
            
            // localStorageに設定がない場合は、サーバーからデフォルト設定を読み込み
            const response = await fetch(API_ENDPOINTS.CONFIG_DEFAULTS);
            if (response.ok) {
                this.settings = await response.json();
            } else {
                // サーバーから取得できない場合はデフォルト値を使用
                this.settings = this.getDefaultSettings();
            }
        } catch (error) {
            console.error(`${ERROR_MESSAGES.SETTINGS_LOAD_FAILED}:`, error);
            // エラーの場合はデフォルト値を使用
            this.settings = this.getDefaultSettings();
        }
        
        this.isInitialized = true;
    }
    
    /**
     * デフォルト設定を取得する
     * @returns {Object} デフォルト設定
     */
    getDefaultSettings() {
        return {
            output_format: DEFAULT_VALUES.OUTPUT_FORMAT,
            split_mode: DEFAULT_VALUES.SPLIT_MODE,
            output_language: DEFAULT_VALUES.OUTPUT_LANGUAGE,
            output_basic_info: true,
            output_meta_info: true,
            output_source_info: true,
            id_prefix: DEFAULT_VALUES.ID_PREFIX,
            id_padding: DEFAULT_VALUES.ID_PADDING,
            id_start_number: DEFAULT_VALUES.ID_START_NUMBER,
            output_case_id: true,
            force_id_regenerate: false,
            sheet_search_keys: [DEFAULT_VALUES.SHEET_SEARCH_KEYS],
            sheet_search_ignores: [],
            
            // 読み取り設定
            header: {
                search_col: DEFAULT_VALUES.HEADER_SEARCH_COL,
                search_key: DEFAULT_VALUES.HEADER_SEARCH_KEY
            },
            category_row: {
                keys: DEFAULT_VALUES.CATEGORY_KEYS.split(','),
                ignores: []
            },
            step_row: { keys: [DEFAULT_VALUES.STEP_KEYS], ignores: [] },
            tobe_row: { keys: ['結果'], ignores: ['実施結果'] },
            test_type_row: { keys: [DEFAULT_VALUES.TEST_TYPE_KEYS], ignores: [] },
            priority_row: { keys: [DEFAULT_VALUES.PRIORITY_KEYS], ignores: [] },
            precondition_row: { keys: [DEFAULT_VALUES.PRECONDITION_KEYS], ignores: [] },
            note_row: { keys: ['備考', '補足情報'], ignores: [] },
            
            // 新しいセル設定
            backlog_id_cell: { keys: ['案件チケットID'], ignores: [] },
            test_type_cell: { keys: ['テスト種別', 'テストフェーズ'], ignores: [] },
            test_target_cell: { keys: ['テスト対象(機能/モジュール)', '対象モジュール'], ignores: [] },
            target_version_cell: { keys: ['テスト対象バージョン', '対象バージョン'], ignores: [] },
            test_environments_cell: {
                keys: [],
                ignores: ['テスト環境', 'テスト環境情報']
            },
            
            // 処理設定
            trim_whitespaces: true,
            normalize_zenkaku_alphanumeric: true,
            normalize_step_numbers: true,
            category_display_compress: false,
            pad_category_levels: true,
            forward_fill_category: true
        };
    }
    
    /**
     * 現在の設定を取得する
     * @returns {Object} 設定オブジェクト
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * 設定を更新する（UIから）
     */
    updateSettingsFromUI() {
        try {
            this.settings = {
                output_format: getElementValue('output-format', DEFAULT_VALUES.OUTPUT_FORMAT),
                split_mode: getElementValue('split-mode', DEFAULT_VALUES.SPLIT_MODE),
                output_language: getElementValue('output-language', DEFAULT_VALUES.OUTPUT_LANGUAGE),
                output_basic_info: getElementChecked('output-basic-info', true),
                output_meta_info: getElementChecked('output-meta-info', true),
                output_source_info: getElementChecked('output-source-info', true),
                id_prefix: getElementValue('id-prefix', DEFAULT_VALUES.ID_PREFIX),
                id_padding: getElementNumber('id-padding', DEFAULT_VALUES.ID_PADDING),
                id_start_number: getElementNumber('id-start-number', DEFAULT_VALUES.ID_START_NUMBER),
                output_case_id: getElementChecked('output-case-id', true),
                force_id_regenerate: false,
                sheet_search_keys: this.parseCommaSeparated(getElementValue('sheet-search-keys', DEFAULT_VALUES.SHEET_SEARCH_KEYS)),
                sheet_search_ignores: [],
                
                // 読み取り設定
                header: {
                    search_col: getElementValue('header-search-col', DEFAULT_VALUES.HEADER_SEARCH_COL),
                    search_key: getElementValue('header-search-key', DEFAULT_VALUES.HEADER_SEARCH_KEY)
                },
                category_row: {
                    keys: this.parseCommaSeparated(getElementValue('category-keys', DEFAULT_VALUES.CATEGORY_KEYS)),
                    ignores: []
                },
                step_row: this.parseKeysAndIgnores(getElementValue('step-keys', DEFAULT_VALUES.STEP_KEYS)),
                tobe_row: this.parseKeysAndIgnores(getElementValue('tobe-keys', DEFAULT_VALUES.TOBE_KEYS)),
                test_type_row: this.parseKeysAndIgnores(getElementValue('test-type-keys', DEFAULT_VALUES.TEST_TYPE_KEYS)),
                priority_row: this.parseKeysAndIgnores(getElementValue('priority-keys', DEFAULT_VALUES.PRIORITY_KEYS)),
                precondition_row: this.parseKeysAndIgnores(getElementValue('precondition-keys', DEFAULT_VALUES.PRECONDITION_KEYS)),
                note_row: this.parseKeysAndIgnores(getElementValue('note-keys', DEFAULT_VALUES.NOTE_KEYS)),
                
                // 新しいセル設定
                backlog_id_cell: this.parseKeysAndIgnores(getElementValue('backlog-id-keys', '案件チケットID')),
                test_type_cell: this.parseKeysAndIgnores(getElementValue('test-type-cell-keys', 'テスト種別,テストフェーズ')),
                test_target_cell: this.parseKeysAndIgnores(getElementValue('test-target-keys', 'テスト対象(機能/モジュール),対象モジュール')),
                target_version_cell: this.parseKeysAndIgnores(getElementValue('target-version-keys', 'テスト対象バージョン,対象バージョン')),
                test_environments_cell: {
                    keys: [],
                    ignores: ['テスト環境', 'テスト環境情報']
                },
                
                // 処理設定
                trim_whitespaces: getElementChecked('trim-whitespaces', true),
                normalize_zenkaku_alphanumeric: getElementChecked('normalize-zenkaku', true),
                normalize_step_numbers: getElementChecked('normalize-step-numbers', true),
                category_display_compress: false,
                pad_category_levels: true,
                forward_fill_category: getElementChecked('forward-fill-category', true)
            };
            
            // 設定の正規化と検証
            this.settings = normalizeSettings(this.settings);
            const validation = validateSettings(this.settings);
            
            if (!validation.isValid) {
                console.warn('設定の検証でエラーが発生しました:', validation.errors);
            }
            
        } catch (error) {
            console.error(`${ERROR_MESSAGES.SETTINGS_UPDATE_FAILED}:`, error);
            showError(`${ERROR_MESSAGES.SETTINGS_UPDATE_FAILED}: ${error.message}`);
        }
    }
    
    /**
     * 設定を保存する
     * @returns {boolean} 保存成功かどうか
     */
    saveSettings() {
        try {
            return saveSettingsToLocalStorage(this.settings);
        } catch (error) {
            console.error(`${ERROR_MESSAGES.SETTINGS_SAVE_FAILED}:`, error);
            return false;
        }
    }
    
    /**
     * 設定をリセットする
     */
    resetToDefault() {
        this.settings = this.getDefaultSettings();
    }
    
    /**
     * カンマ区切りの文字列を配列に変換する
     * @param {string} value - カンマ区切りの文字列
     * @returns {Array} 配列
     */
    parseCommaSeparated(value) {
        if (!value || value.trim() === '') return [];
        return value.split(',').map(item => item.trim()).filter(item => item !== '');
    }
    
    /**
     * 括弧付きの文字列をkeysとignoresに分離する
     * @param {string} value - 括弧付きの文字列
     * @returns {Object} {keys: Array, ignores: Array}
     */
    parseKeysAndIgnores(value) {
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
     * 初期化済みかどうかを確認する
     * @returns {boolean} 初期化済みかどうか
     */
    isReady() {
        return this.isInitialized;
    }
}

// シングルトンインスタンスを作成
export const configManager = new ConfigManager();
