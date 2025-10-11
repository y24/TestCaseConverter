/**
 * アプリケーション定数定義
 */

// タイマー関連の定数
export const TIMER_CONSTANTS = {
    INITIALIZATION_DELAY: 50,
    DEBOUNCE_DELAY: 500,
    WYSIWYG_UPDATE_DELAY: 100,
    SCROLL_RESET_DELAY: 10,
    TOAST_DISPLAY_DURATION: 3000,
    RETRY_DELAY: 100
};

// DOM要素のID
export const DOM_IDS = {
    // ファイル関連
    UPLOAD_AREA: 'upload-area',
    FILE_INPUT: 'file-input',
    FILE_LIST: 'file-list',
    BULK_ACTIONS: 'bulk-actions',
    
    // プレビュー関連
    PREVIEW_SECTION: 'preview-section',
    PREVIEW_FILE_SELECT: 'preview-file-select',
    PREVIEW_CONTENT: 'preview-content',
    PREVIEW_CONTENT_WYSIWYG: 'preview-content-wysiwyg',
    PREVIEW_TOGGLE: 'preview-toggle',
    PREVIEW_MODE_SWITCHER: '.preview-mode-switcher',
    FILE_NAME_DISPLAY: 'file-name-display',
    
    // 設定関連
    OUTPUT_FORMAT: 'output-format',
    SPLIT_MODE: 'split-mode',
    OUTPUT_LANGUAGE: 'output-language',
    OUTPUT_BASIC_INFO: 'output-basic-info',
    OUTPUT_META_INFO: 'output-meta-info',
    OUTPUT_SOURCE_INFO: 'output-source-info',
    OUTPUT_CASE_ID: 'output-case-id',
    
    // ケースID関連
    ID_PREFIX: 'id-prefix',
    ID_PADDING: 'id-padding',
    ID_START_NUMBER: 'id-start-number',
    
    // 文字列処理設定
    TRIM_WHITESPACES: 'trim-whitespaces',
    FORWARD_FILL_CATEGORY: 'forward-fill-category',
    NORMALIZE_ZENKAKU: 'normalize-zenkaku',
    NORMALIZE_STEP_NUMBERS: 'normalize-step-numbers',
    
    // シート名設定
    SHEET_SEARCH_KEYS: 'sheet-search-keys',
    
    // 読み取り設定
    HEADER_SEARCH_COL: 'header-search-col',
    HEADER_SEARCH_KEY: 'header-search-key',
    CATEGORY_KEYS: 'category-keys',
    TITLE_KEYS: 'title-keys',
    STEP_KEYS: 'step-keys',
    TOBE_KEYS: 'tobe-keys',
    TEST_TYPE_KEYS: 'test-type-keys',
    PRIORITY_KEYS: 'priority-keys',
    PRECONDITION_KEYS: 'precondition-keys',
    NOTE_KEYS: 'note-keys',
    
    // UI関連
    CONVERT_BTN: 'convert-btn',
    LOADING: 'loading',
    ERROR_MESSAGE: 'error-message',
    PREVIEW_ERROR_MESSAGE: 'preview-error-message',
    SIDEBAR: 'sidebar',
    SIDEBAR_OVERLAY: 'sidebar-overlay',
    SETTINGS_MODAL: 'settings-modal',
    MODAL_THEME_SELECT: 'modal-theme-select'
};

// CSS クラス名
export const CSS_CLASSES = {
    DRAGOVER: 'dragover',
    FILE_LIST_DRAGOVER: 'file-list-dragover',
    EXPANDED: 'expanded',
    SHOW: 'show',
    OPEN: 'open',
    SIDEBAR_CONTENT: '.sidebar-content',
    SECTION_TITLE_COLLAPSIBLE: '.section-title.collapsible',
    SECTION_TOGGLE_ICON: '.section-toggle-icon',
    PREVIEW_CONTROLS: '.preview-controls',
    PREVIEW_CONTENT: '.preview-content',
    ERROR_TEXT: '.error-text'
};

// ファイル関連の定数
export const FILE_CONSTANTS = {
    MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
    ALLOWED_EXTENSIONS: ['.xlsx', '.xls'],
    MIME_TYPES: {
        XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        XLS: 'application/vnd.ms-excel'
    }
};

// API エンドポイント
export const API_ENDPOINTS = {
    CONVERT: '/api/convert',
    DOWNLOAD: '/api/download',
    CONFIG_DEFAULTS: '/api/config/defaults'
};

// ローカルストレージのキー
export const STORAGE_KEYS = {
    SETTINGS: 'testCaseConverter_settings',
    THEME: 'testCaseConverter_theme',
    PREVIEW_MODE: 'testCaseConverter_previewMode'
};

// デフォルト設定値
export const DEFAULT_VALUES = {
    OUTPUT_FORMAT: 'markdown',
    SPLIT_MODE: 'per_sheet',
    OUTPUT_LANGUAGE: 'ja',
    ID_PREFIX: 'TC-',
    ID_PADDING: 1,
    ID_START_NUMBER: 1,
    HEADER_SEARCH_COL: 'A',
    HEADER_SEARCH_KEY: '#',
    SHEET_SEARCH_KEYS: 'テスト項目',
    CATEGORY_KEYS: '大項目,中項目,小項目1,小項目2',
    TITLE_KEYS: '概要,テスト項目名,項目名',
    STEP_KEYS: '手順',
    TOBE_KEYS: '結果,(実施結果)',
    TEST_TYPE_KEYS: 'テスト種別',
    PRIORITY_KEYS: '優先度',
    PRECONDITION_KEYS: '前提条件',
    NOTE_KEYS: '備考,補足情報',
    PREVIEW_MODE: 'text',
    THEME: 'system'
};

// エラーメッセージ
export const ERROR_MESSAGES = {
    SETTINGS_LOAD_FAILED: '設定の読み込みに失敗しました',
    SETTINGS_SAVE_FAILED: '設定の保存に失敗しました',
    SETTINGS_APPLY_FAILED: '設定の適用に失敗しました',
    SETTINGS_UPDATE_FAILED: '設定の更新に失敗しました',
    CONVERSION_FAILED: '変換に失敗しました',
    DOWNLOAD_FAILED: 'ダウンロードに失敗しました',
    FILE_SELECT_REQUIRED: 'ファイルを選択してください',
    INVALID_FILES: '一部のファイルが無効です。Excelファイル（.xlsx, .xls）で20MB以下のファイルを選択してください。',
    NO_DOWNLOADABLE_FILES: 'ダウンロード可能なファイルがありません',
    ELEMENT_NOT_FOUND: '要素が見つかりません',
    MARKED_JS_NOT_LOADED: 'marked.jsが読み込まれていません。WYSIWYGプレビューは利用できません。',
    PREVIEW_MODE_SAVE_FAILED: 'プレビューモード設定の保存に失敗しました',
    PREVIEW_MODE_LOAD_FAILED: 'プレビューモード設定の読み込みに失敗しました'
};

// 成功メッセージ
export const SUCCESS_MESSAGES = {
    SETTINGS_SAVED: '設定を保存しました',
    DEFAULT_SETTINGS_RESTORED: 'デフォルト設定に戻しました'
};

// ファイルサイズの単位
export const FILE_SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB'];

// テーマ関連
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
};

// プレビューモード
export const PREVIEW_MODES = {
    TEXT: 'text',
    WYSIWYG: 'wysiwyg'
};

// 出力フォーマット
export const OUTPUT_FORMATS = {
    MARKDOWN: 'markdown',
    YAML: 'yaml',
    CSV: 'csv'
};

// MIME タイプ
export const MIME_TYPES = {
    MARKDOWN: 'text/markdown',
    YAML: 'text/yaml',
    CSV: 'text/csv'
};

// ファイル拡張子
export const FILE_EXTENSIONS = {
    MARKDOWN: 'md',
    YAML: 'yaml',
    CSV: 'csv'
};
