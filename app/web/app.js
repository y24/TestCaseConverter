// グローバル変数
let uploadedFiles = [];
let conversionResult = null;
let currentSettings = {};

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// アプリケーション初期化
async function initializeApp() {
    await loadDefaultSettings();
    setupEventListeners();
    initializeCollapsibleSections();
    initializeTheme();
    watchSystemTheme();
}

// イベントリスナー設定
function setupEventListeners() {
    // ファイルアップロード
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // 設定変更 - 自動変換対応
    setupAutoConvertListeners();
    
    // プレビューファイル選択
    document.getElementById('preview-file-select').addEventListener('change', handlePreviewFileChange);
    
    // プレビューエリアのCtrl+A全選択機能
    setupPreviewSelectAll();
}

// 自動変換用のイベントリスナー設定
function setupAutoConvertListeners() {
    // プルダウン（select）の変更時
    const selectElements = document.querySelectorAll('.sidebar-content select');
    selectElements.forEach(select => {
        select.addEventListener('change', () => {
            updateSettings();
            autoConvert();
        });
    });
    
    // チェックボックスの変更時
    const checkboxElements = document.querySelectorAll('.sidebar-content input[type="checkbox"]');
    checkboxElements.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // 「ケースIDを採番」チェックボックスの場合は特別処理
            if (checkbox.id === 'output-case-id') {
                toggleCaseIdInputs(checkbox.checked);
            }
            updateSettings();
            autoConvert();
        });
    });
    
    // テキストボックスのフォーカスOFF時
    const textInputs = document.querySelectorAll('.sidebar-content input[type="text"], .sidebar-content input[type="number"]');
    textInputs.forEach(input => {
        input.addEventListener('blur', () => {
            updateSettings();
            autoConvert();
        });
        // 入力中にもリアルタイムで変換（デバウンス付き）
        let timeoutId;
        input.addEventListener('input', () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                updateSettings();
                autoConvert();
            }, 500); // 500ms後に実行
        });
    });
}

// localStorageから設定を読み込み
function loadSettingsFromLocalStorage() {
    try {
        const savedSettings = localStorage.getItem('testCaseConverter_settings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
    } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
    }
    return null;
}

// localStorageに設定を保存
function saveSettingsToLocalStorage(settings) {
    try {
        localStorage.setItem('testCaseConverter_settings', JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('設定の保存に失敗しました:', error);
        return false;
    }
}

// デフォルト設定読み込み
async function loadDefaultSettings() {
    try {
        // まずlocalStorageから保存された設定を読み込み
        const savedSettings = loadSettingsFromLocalStorage();
        if (savedSettings) {
            currentSettings = savedSettings;
            applySettingsToUI();
            return;
        }
        
        // localStorageに設定がない場合は、サーバーからデフォルト設定を読み込み
        const response = await fetch('/api/config/defaults');
        if (response.ok) {
            currentSettings = await response.json();
            applySettingsToUI();
        }
    } catch (error) {
        showError('設定の読み込みに失敗しました: ' + error.message);
    }
}

// 設定をUIに適用
function applySettingsToUI() {
    try {
        // 出力設定
        setElementValue('output-format', currentSettings.output_format || 'markdown');
        setElementValue('split-mode', currentSettings.split_mode || 'per_sheet');
        
        // ケースID設定
        setElementValue('id-prefix', currentSettings.id_prefix || 'TC');
        setElementValue('id-padding', currentSettings.id_padding || 3);
        setElementValue('id-start-number', currentSettings.id_start_number || 1);
        setElementChecked('output-case-id', currentSettings.output_case_id !== false);
        
        // ケースID関連のテキストボックスの有効/無効を設定
        toggleCaseIdInputs(currentSettings.output_case_id !== false);
        
        // 文字列処理設定
        setElementChecked('trim-whitespaces', currentSettings.trim_whitespaces !== false);
        setElementChecked('forward-fill-category', currentSettings.forward_fill_category !== false);
        setElementChecked('normalize-zenkaku', currentSettings.normalize_zenkaku_numbers !== false);
        setElementChecked('normalize-step-numbers', currentSettings.normalize_step_numbers !== false);
        
        // シート名設定
        setElementValue('sheet-search-keys', currentSettings.sheet_search_keys ? currentSettings.sheet_search_keys.join(',') : 'テスト項目');
        
        // 読み取り設定
        const header = currentSettings.header || { search_col: "A", search_key: "#" };
        setElementValue('header-search-col', header.search_col || "A");
        setElementValue('header-search-key', header.search_key || "#");
        
        const categoryRow = currentSettings.category_row || { keys: ["大項目", "中項目", "小項目1", "小項目2"] };
        setElementValue('category-keys', categoryRow.keys ? categoryRow.keys.join(',') : "大項目,中項目,小項目1,小項目2");
        
        const stepRow = currentSettings.step_row || { keys: ["手順"], ignores: [] };
        // keysとignoresを統合して表示
        const stepDisplay = [];
        if (stepRow.keys) {
            stepDisplay.push(...stepRow.keys);
        }
        if (stepRow.ignores) {
            stepDisplay.push(...stepRow.ignores.map(ignore => `(${ignore})`));
        }
        setElementValue('step-keys', stepDisplay.join(',') || "手順");
        
        const tobeRow = currentSettings.tobe_row || { keys: ["結果"], ignores: ["実施結果"] };
        // keysとignoresを統合して表示
        const tobeDisplay = [];
        if (tobeRow.keys) {
            tobeDisplay.push(...tobeRow.keys);
        }
        if (tobeRow.ignores) {
            tobeDisplay.push(...tobeRow.ignores.map(ignore => `(${ignore})`));
        }
        setElementValue('tobe-keys', tobeDisplay.join(',') || "結果,(実施結果)");
        
        const testTypeRow = currentSettings.test_type_row || { keys: ["テスト種別"], ignores: [] };
        // keysとignoresを統合して表示
        const testTypeDisplay = [];
        if (testTypeRow.keys) {
            testTypeDisplay.push(...testTypeRow.keys);
        }
        if (testTypeRow.ignores) {
            testTypeDisplay.push(...testTypeRow.ignores.map(ignore => `(${ignore})`));
        }
        setElementValue('test-type-keys', testTypeDisplay.join(',') || "テスト種別");
        
        const priorityRow = currentSettings.priority_row || { keys: ["優先度"], ignores: [] };
        // keysとignoresを統合して表示
        const priorityDisplay = [];
        if (priorityRow.keys) {
            priorityDisplay.push(...priorityRow.keys);
        }
        if (priorityRow.ignores) {
            priorityDisplay.push(...priorityRow.ignores.map(ignore => `(${ignore})`));
        }
        setElementValue('priority-keys', priorityDisplay.join(',') || "優先度");
        
        const preconditionRow = currentSettings.precondition_row || { keys: ["前提条件"], ignores: [] };
        // keysとignoresを統合して表示
        const preconditionDisplay = [];
        if (preconditionRow.keys) {
            preconditionDisplay.push(...preconditionRow.keys);
        }
        if (preconditionRow.ignores) {
            preconditionDisplay.push(...preconditionRow.ignores.map(ignore => `(${ignore})`));
        }
        setElementValue('precondition-keys', preconditionDisplay.join(',') || "前提条件");
        
        const noteRow = currentSettings.note_row || { keys: ["備考", "補足情報"], ignores: [] };
        // keysとignoresを統合して表示
        const noteDisplay = [];
        if (noteRow.keys) {
            noteDisplay.push(...noteRow.keys);
        }
        if (noteRow.ignores) {
            noteDisplay.push(...noteRow.ignores.map(ignore => `(${ignore})`));
        }
        setElementValue('note-keys', noteDisplay.join(',') || "備考,補足情報");
        
        
    } catch (error) {
        console.error('設定のUI適用中にエラーが発生しました:', error);
        showError('設定の適用に失敗しました: ' + error.message);
    }
}

// 要素の値を安全に設定するヘルパー関数
function setElementValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value;
    } else {
        console.warn(`要素が見つかりません: ${elementId}`);
    }
}

// チェックボックスの値を安全に設定するヘルパー関数
function setElementChecked(elementId, checked) {
    const element = document.getElementById(elementId);
    if (element) {
        element.checked = checked;
    } else {
        console.warn(`要素が見つかりません: ${elementId}`);
    }
}

// ケースID関連のテキストボックスの有効/無効を切り替える関数
function toggleCaseIdInputs(enabled) {
    const idPrefixInput = document.getElementById('id-prefix');
    const idPaddingInput = document.getElementById('id-padding');
    const idStartNumberInput = document.getElementById('id-start-number');
    
    if (idPrefixInput) {
        idPrefixInput.disabled = !enabled;
    }
    if (idPaddingInput) {
        idPaddingInput.disabled = !enabled;
    }
    if (idStartNumberInput) {
        idStartNumberInput.disabled = !enabled;
    }
}

// 設定更新
function updateSettings() {
    try {
        // カンマ区切りの文字列を配列に変換するヘルパー関数
        function parseCommaSeparated(value) {
            if (!value || value.trim() === '') return [];
            return value.split(',').map(item => item.trim()).filter(item => item !== '');
        }
        
        // 括弧付きの文字列をkeysとignoresに分離するヘルパー関数
        function parseKeysAndIgnores(value) {
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
        
        
        // 要素の値を安全に取得するヘルパー関数
        function getElementValue(elementId, defaultValue = '') {
            const element = document.getElementById(elementId);
            return element ? element.value : defaultValue;
        }
        
        function getElementChecked(elementId, defaultValue = false) {
            const element = document.getElementById(elementId);
            return element ? element.checked : defaultValue;
        }
        
        function getElementNumber(elementId, defaultValue = 0) {
            const element = document.getElementById(elementId);
            return element ? parseInt(element.value) || defaultValue : defaultValue;
        }
        
        // 新しい構造で設定を構築
        currentSettings = {
            output_format: getElementValue('output-format', 'markdown'),
            split_mode: getElementValue('split-mode', 'per_sheet'),
            id_prefix: getElementValue('id-prefix', 'TC'),
            id_padding: getElementNumber('id-padding', 3),
            id_start_number: getElementNumber('id-start-number', 1),
            output_case_id: getElementChecked('output-case-id', true),
            force_id_regenerate: false,
            sheet_search_keys: parseCommaSeparated(getElementValue('sheet-search-keys', 'テスト項目')),
            sheet_search_ignores: [],
            
            // 読み取り設定
            header: {
                search_col: getElementValue('header-search-col', 'A'),
                search_key: getElementValue('header-search-key', '#')
            },
            category_row: {
                keys: parseCommaSeparated(getElementValue('category-keys', '大項目,中項目,小項目1,小項目2')),
                ignores: []
            },
            step_row: parseKeysAndIgnores(getElementValue('step-keys', '手順')),
            tobe_row: parseKeysAndIgnores(getElementValue('tobe-keys', '結果,(実施結果)')),
            test_type_row: parseKeysAndIgnores(getElementValue('test-type-keys', 'テスト種別')),
            priority_row: parseKeysAndIgnores(getElementValue('priority-keys', '優先度')),
            precondition_row: parseKeysAndIgnores(getElementValue('precondition-keys', '前提条件')),
            note_row: parseKeysAndIgnores(getElementValue('note-keys', '備考,補足情報')),
            
            // 処理設定
            trim_whitespaces: getElementChecked('trim-whitespaces', true),
            normalize_zenkaku_alphanumeric: getElementChecked('normalize-zenkaku', true),
            normalize_step_numbers: getElementChecked('normalize-step-numbers', true),
            category_display_compress: false,
            pad_category_levels: true,
            forward_fill_category: getElementChecked('forward-fill-category', true)
        };
        
    } catch (error) {
        console.error('設定の更新中にエラーが発生しました:', error);
        showError('設定の更新に失敗しました: ' + error.message);
    }
}

// ドラッグオーバー処理
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

// ドラッグリーブ処理
function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
}

// ドロップ処理
function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

// ファイル選択処理
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

// ファイル追加
function addFiles(files) {
    const validFiles = files.filter(file => {
        const isValidType = file.name.match(/\.(xlsx|xls)$/i);
        const isValidSize = file.size <= 20 * 1024 * 1024; // 20MB
        return isValidType && isValidSize;
    });
    
    if (validFiles.length !== files.length) {
        showError('一部のファイルが無効です。Excelファイル（.xlsx, .xls）で20MB以下のファイルを選択してください。');
    }
    
    // ファイル名の重複チェックと連番付与
    const processedFiles = processDuplicateFilenames(validFiles);
    
    uploadedFiles = uploadedFiles.concat(processedFiles);
    updateFileList();
    updateConvertButton();
    
    // ファイル追加時に自動変換実行
    if (processedFiles.length > 0) {
        autoConvert();
    }
}

// ファイルリスト更新
function updateFileList() {
    const fileList = document.getElementById('file-list');
    const uploadArea = document.getElementById('upload-area');
    const bulkActions = document.getElementById('bulk-actions');
    
    fileList.innerHTML = '';
    
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-icon">📗</span>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" class="remove-btn" onclick="removeFile(${index})">✖ 削除</button>
        `;
        fileList.appendChild(fileItem);
    });
    
    // ファイルが1件以上ある場合はドロップエリアを非表示、0件の場合は表示
    if (uploadedFiles.length > 0) {
        uploadArea.style.display = 'none';
        // 複数ファイルがある場合のみ一括削除ボタンを表示
        if (uploadedFiles.length > 1) {
            bulkActions.style.display = 'block';
        } else {
            bulkActions.style.display = 'none';
        }
    } else {
        uploadArea.style.display = 'block';
        bulkActions.style.display = 'none';
    }
}

// ファイル名の重複処理
function processDuplicateFilenames(newFiles) {
    const processedFiles = [];
    
    for (const file of newFiles) {
        let finalFilename = file.name;
        let counter = 1;
        
        // 既存のファイル名と重複チェック
        while (isFilenameDuplicate(finalFilename)) {
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
            const extension = file.name.match(/\.[^/.]+$/)?.[0] || '';
            finalFilename = `${nameWithoutExt} (${counter})${extension}`;
            counter++;
        }
        
        // ファイルオブジェクトのクローンを作成してファイル名を変更
        const processedFile = new File([file], finalFilename, {
            type: file.type,
            lastModified: file.lastModified
        });
        
        processedFiles.push(processedFile);
    }
    
    return processedFiles;
}

// ファイル名の重複チェック
function isFilenameDuplicate(filename) {
    return uploadedFiles.some(file => file.name === filename);
}

// ファイル削除
function removeFile(index) {
    uploadedFiles.splice(index, 1);
    updateFileList();
    updateConvertButton();
    
    // ファイルが0件になった場合は初期表示に戻す
    if (uploadedFiles.length === 0) {
        resetToInitialState();
        return;
    }
    
    // ファイル削除時に自動変換実行
    autoConvert();
}

// すべてのファイルを一括削除
function removeAllFiles() {
    // ファイルが0件の場合は何もしない
    if (uploadedFiles.length === 0) {
        return;
    }
    
    // すべてのファイルを削除
    uploadedFiles = [];
    updateFileList();
    updateConvertButton();
    
    // 初期表示に戻す
    resetToInitialState();
}

// ファイルサイズフォーマット
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 変換ボタン更新
function updateConvertButton() {
    const convertBtn = document.getElementById('convert-btn');
    convertBtn.disabled = uploadedFiles.length === 0;
}

// 初期状態に戻す
function resetToInitialState() {
    // プレビューセクションを非表示
    const previewSection = document.getElementById('preview-section');
    previewSection.style.display = 'none';
    
    // 変換結果をクリア
    conversionResult = null;
    
    // エラーメッセージを非表示
    hideError();
    hidePreviewError();
    
    // ローディングを非表示
    showLoading(false);
    
    // プレビューファイル選択をリセット
    const fileSelect = document.getElementById('preview-file-select');
    fileSelect.innerHTML = '<option value="">ファイルを選択してください</option>';
    fileSelect.style.display = 'block';
    
    // ファイル名表示を非表示
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileNameDisplay) {
        fileNameDisplay.style.display = 'none';
    }
    
    // ダウンロードボタンのテキストを元に戻す
    const downloadBtn = document.querySelector('.preview-controls button');
    if (downloadBtn) {
        downloadBtn.textContent = '📥 すべてダウンロード (.zip)';
    }
    
    // プレビュー内容をクリア
    const previewContent = document.getElementById('preview-content');
    if (previewContent) {
        previewContent.textContent = '';
    }
}

// 自動変換実行
async function autoConvert() {
    // ファイルがアップロードされていない場合は何もしない
    if (uploadedFiles.length === 0) {
        return;
    }
    
    try {
        updateSettings();
        
        // ローディング表示
        showLoading(true);
        hideError();
        
        // 変換開始時に古い結果をクリア
        conversionResult = null;
        
        // フォームデータ作成
        const formData = new FormData();
        uploadedFiles.forEach(file => {
            formData.append('files', file);
        });
        formData.append('settings_json', JSON.stringify(currentSettings));
        
        // 変換実行
        console.log('Starting conversion request...');
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });
        
        console.log('Response received:', response.status, response.statusText);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            console.log('Response not ok, processing error...');
            let errorMessage = '変換に失敗しました';
            try {
                console.log('Attempting to parse error response as JSON...');
                const errorData = await response.json();
                console.error('Server error response:', errorData);
                errorMessage = errorData.detail || errorMessage;
                console.log('Error message extracted:', errorMessage);
            } catch (jsonError) {
                console.error('Failed to parse error response:', jsonError);
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                console.log('Using fallback error message:', errorMessage);
            }
            console.log('Throwing error with message:', errorMessage);
            throw new Error(errorMessage);
        }
        
        console.log('Response ok, parsing JSON...');
        conversionResult = await response.json();
        console.log('Conversion result received:', conversionResult);
        showPreview();
        
    } catch (error) {
        console.error('Conversion error:', error);
        // プレビューセクションを表示してエラーメッセージを表示
        const previewSection = document.getElementById('preview-section');
        previewSection.style.display = 'block';
        showPreviewError('自動変換に失敗しました: ' + error.message);
        
        // 変換に失敗した場合はプレビューをクリア
        conversionResult = null;
    } finally {
        showLoading(false);
    }
}

// サイドメニュー切り替え
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) {
            overlay.classList.remove('show');
        }
    } else {
        sidebar.classList.add('open');
        if (overlay) {
            overlay.classList.add('show');
        }
    }
}

// 設定保存
async function saveSettings() {
    try {
        updateSettings();
        
        // localStorageに保存
        if (saveSettingsToLocalStorage(currentSettings)) {
            showSuccess('設定を保存しました');
        } else {
            throw new Error('設定の保存に失敗しました');
        }
    } catch (error) {
        showError('設定の保存に失敗しました: ' + error.message);
    }
}

// ファイル変換
async function convertFiles() {
    if (uploadedFiles.length === 0) {
        showError('ファイルを選択してください');
        return;
    }
    
    try {
        updateSettings();
        
        // ローディング表示
        showLoading(true);
        hideError();
        
        // フォームデータ作成
        const formData = new FormData();
        uploadedFiles.forEach(file => {
            formData.append('files', file);
        });
        formData.append('settings_json', JSON.stringify(currentSettings));
        
        // 変換実行
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            let errorMessage = '変換に失敗しました';
            try {
                const errorData = await response.json();
                console.error('Server error response:', errorData);
                errorMessage = errorData.detail || errorMessage;
            } catch (jsonError) {
                console.error('Failed to parse error response:', jsonError);
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        conversionResult = await response.json();
        showPreview();
        
    } catch (error) {
        console.error('Conversion error:', error);
        // プレビューセクションを表示してエラーメッセージを表示
        const previewSection = document.getElementById('preview-section');
        previewSection.style.display = 'block';
        showPreviewError('変換に失敗しました: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// プレビュー表示
function showPreview() {
    const previewSection = document.getElementById('preview-section');
    const fileSelect = document.getElementById('preview-file-select');
    const previewControls = document.querySelector('.preview-controls');
    
    // プレビューエラーを非表示
    hidePreviewError();
    
    if (conversionResult && conversionResult.rendered_text) {
        const fileKeys = Object.keys(conversionResult.rendered_text);
        console.log('showPreview - fileKeys:', fileKeys);
        console.log('showPreview - conversionResult.rendered_text:', conversionResult.rendered_text);
        
        if (fileKeys.length === 1) {
            // 最初のファイルの内容を表示（非表示にする前に設定）
            fileSelect.value = fileKeys[0];
            console.log('showPreview - fileSelect.value set to:', fileSelect.value);
            
            // ファイルが1件の場合：プルダウンを非表示にしてファイル名を直接表示
            fileSelect.style.display = 'none';
            
            // ファイル名表示用の要素を作成
            let fileNameDisplay = document.getElementById('file-name-display');
            if (!fileNameDisplay) {
                fileNameDisplay = document.createElement('div');
                fileNameDisplay.id = 'file-name-display';
                fileNameDisplay.className = 'file-name-display';
                previewControls.insertBefore(fileNameDisplay, fileSelect);
            }
            fileNameDisplay.textContent = fileKeys[0];
            fileNameDisplay.style.display = 'block';
            
            // ダウンロードボタンのテキストを変更
            const downloadBtn = previewControls.querySelector('button');
            downloadBtn.textContent = '📥 ダウンロード (.md)';
            
            // プレビュー内容を直接設定
            const previewContent = document.getElementById('preview-content');
            if (previewContent && conversionResult.rendered_text[fileKeys[0]]) {
                previewContent.textContent = conversionResult.rendered_text[fileKeys[0]];
                console.log('showPreview - preview content set directly');
            } else {
                console.log('showPreview - preview content not set, previewContent:', previewContent);
            }
        } else {
            // ファイルが複数の場合：従来のプルダウン表示
            fileSelect.style.display = 'block';
            
            // ファイル名表示を非表示
            const fileNameDisplay = document.getElementById('file-name-display');
            if (fileNameDisplay) {
                fileNameDisplay.style.display = 'none';
            }
            
            // ファイル選択肢を更新
            fileSelect.innerHTML = '<option value="">ファイルを選択してください</option>';
            fileKeys.forEach(filename => {
                const option = document.createElement('option');
                option.value = filename;
                option.textContent = filename;
                fileSelect.appendChild(option);
            });
            
            // ダウンロードボタンのテキストを元に戻す
            const downloadBtn = previewControls.querySelector('button');
            downloadBtn.textContent = '📥 すべてダウンロード (.zip)';
            
            // 最初のファイルを選択
            if (fileSelect.options.length > 1) {
                fileSelect.selectedIndex = 1;
                handlePreviewFileChange();
            }
        }
    }
    
    previewSection.style.display = 'block';
}

// プレビューファイル変更
function handlePreviewFileChange() {
    const fileSelect = document.getElementById('preview-file-select');
    const previewContent = document.getElementById('preview-content');
    
    const selectedFile = fileSelect.value;
    console.log('handlePreviewFileChange - selectedFile:', selectedFile);
    console.log('handlePreviewFileChange - conversionResult:', conversionResult);
    
    if (selectedFile && conversionResult && conversionResult.rendered_text) {
        console.log('handlePreviewFileChange - setting content for:', selectedFile);
        previewContent.textContent = conversionResult.rendered_text[selectedFile];
    } else {
        console.log('handlePreviewFileChange - clearing content');
        previewContent.textContent = '';
    }
}

// 全ファイルダウンロード
async function downloadAll() {
    if (!conversionResult || !conversionResult.cache_key) {
        showError('ダウンロード可能なファイルがありません');
        return;
    }
    
    try {
        const fileKeys = Object.keys(conversionResult.rendered_text || {});
        
        if (fileKeys.length === 1) {
            // ファイルが1件の場合：単体ファイルダウンロード
            const fileName = fileKeys[0];
            const fileContent = conversionResult.rendered_text[fileName];
            
            // ファイル拡張子を取得
            const outputFormat = currentSettings.出力?.output_format || currentSettings.output_format || 'markdown';
            const extension = outputFormat === 'yaml' ? 'yaml' : 'md';
            const downloadFileName = fileName.endsWith(`.${extension}`) ? fileName : `${fileName}.${extension}`;
            
            // Blobを作成してダウンロード
            const blob = new Blob([fileContent], { 
                type: outputFormat === 'yaml' ? 'text/yaml' : 'text/markdown' 
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } else {
            // ファイルが複数の場合：ZIPダウンロード
            const formData = new FormData();
            formData.append('cache_key', conversionResult.cache_key);
            const outputFormat = currentSettings.出力?.output_format || currentSettings.output_format || 'markdown';
            formData.append('output_format', outputFormat);
            
            const response = await fetch('/api/download', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('ダウンロードに失敗しました');
            }
            
            // ファイルダウンロード
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'test_cases.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
        
    } catch (error) {
        showError('ダウンロードに失敗しました: ' + error.message);
    }
}

// ローディング表示
function showLoading(show) {
    const loading = document.getElementById('loading');
    const convertBtn = document.getElementById('convert-btn');
    
    if (show) {
        loading.style.display = 'flex';
        convertBtn.disabled = true;
    } else {
        loading.style.display = 'none';
        convertBtn.disabled = uploadedFiles.length === 0;
    }
}

// エラー表示
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// エラー非表示
function hideError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'none';
}

// プレビューエラー表示
function showPreviewError(message) {
    const previewErrorDiv = document.getElementById('preview-error-message');
    const errorTextDiv = previewErrorDiv.querySelector('.error-text');
    errorTextDiv.textContent = message;
    previewErrorDiv.style.display = 'flex';
    
    // プレビュー内容を非表示
    const previewContent = document.getElementById('preview-content');
    if (previewContent) {
        previewContent.style.display = 'none';
    }
}

// プレビューエラー非表示
function hidePreviewError() {
    const previewErrorDiv = document.getElementById('preview-error-message');
    previewErrorDiv.style.display = 'none';
    
    // プレビュー内容を表示
    const previewContent = document.getElementById('preview-content');
    if (previewContent) {
        previewContent.style.display = 'block';
    }
}

// デフォルト設定に戻す
function resetToDefaultSettings() {
    // 確認ダイアログを表示
    const confirmed = confirm('設定をデフォルトに戻しますか？\n\nこの操作により、現在の設定はすべて失われます。');
    
    if (!confirmed) {
        // キャンセルがクリックされた場合は何もしない
        return;
    }
    
    try {
        // localStorageから設定を削除
        localStorage.removeItem('testCaseConverter_settings');
        
        // サーバーからデフォルト設定を読み込み
        fetch('/api/config/defaults')
            .then(response => response.json())
            .then(defaultSettings => {
                currentSettings = defaultSettings;
                applySettingsToUI();
                showSuccess('デフォルト設定に戻しました');
            })
            .catch(error => {
                showError('デフォルト設定の読み込みに失敗しました: ' + error.message);
            });
    } catch (error) {
        showError('デフォルト設定の読み込みに失敗しました: ' + error.message);
    }
}

// 成功メッセージ表示
function showSuccess(message) {
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
        document.body.removeChild(toast);
    }, 3000);
}

// 折りたたみ可能セクションの初期化
function initializeCollapsibleSections() {
    const collapsibleSections = document.querySelectorAll('.section-title.collapsible');
    collapsibleSections.forEach(sectionTitle => {
        const sectionContent = sectionTitle.nextElementSibling;
        const toggleIcon = sectionTitle.querySelector('.section-toggle-icon');
        
        // デフォルトで折りたたみ状態に設定
        sectionContent.classList.remove('expanded');
        toggleIcon.classList.remove('expanded');
    });
}

// セクション折りたたみ機能
function toggleSection(sectionTitle) {
    const sectionContent = sectionTitle.nextElementSibling;
    const toggleIcon = sectionTitle.querySelector('.section-toggle-icon');
    
    if (sectionContent.classList.contains('expanded')) {
        // 折りたたみ
        sectionContent.classList.remove('expanded');
        toggleIcon.classList.remove('expanded');
    } else {
        // 展開
        sectionContent.classList.add('expanded');
        toggleIcon.classList.add('expanded');
    }
}

// テーマ初期化
function initializeTheme() {
    const savedTheme = localStorage.getItem('testCaseConverter_theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        // デフォルトはSystem
        setTheme('system');
    }
    
    // プルダウンの選択状態を更新
    updateThemeSelector();
}

// テーマ変更
function changeTheme(theme) {
    setTheme(theme);
}

// テーマ設定
function setTheme(theme) {
    localStorage.setItem('testCaseConverter_theme', theme);
    
    let actualTheme;
    if (theme === 'system') {
        // システム設定を検出
        actualTheme = getSystemTheme();
    } else {
        actualTheme = theme;
    }
    
    document.documentElement.setAttribute('data-theme', actualTheme);
    
    // プルダウンの選択状態を更新
    updateThemeSelector();
}

// システムテーマを取得
function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    } else {
        return 'light';
    }
}

// テーマセレクターの選択状態を更新
function updateThemeSelector() {
    const themeSelect = document.getElementById('modal-theme-select');
    const savedTheme = localStorage.getItem('testCaseConverter_theme') || 'system';
    
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
}

// システムテーマ変更の監視
function watchSystemTheme() {
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            const currentTheme = localStorage.getItem('testCaseConverter_theme');
            if (currentTheme === 'system') {
                setTheme('system');
            }
        });
    }
}

// 設定モーダルを開く
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('show');
        // モーダル内のテーマセレクターの選択状態を更新
        updateThemeSelector();
        // ボディのスクロールを無効化
        document.body.style.overflow = 'hidden';
    }
}

// 設定モーダルを閉じる
function closeSettingsModal(event) {
    // イベントが渡された場合（オーバーレイクリック）は、オーバーレイ以外のクリックは無視
    if (event && event.target !== event.currentTarget) {
        return;
    }
    
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('show');
        // ボディのスクロールを有効化
        document.body.style.overflow = '';
    }
}

// プレビューエリアのCtrl+A全選択機能を設定
function setupPreviewSelectAll() {
    const previewContent = document.getElementById('preview-content');
    if (!previewContent) return;
    
    // プレビューエリアにキーボードイベントリスナーを追加
    previewContent.addEventListener('keydown', function(event) {
        // Ctrl+A または Cmd+A (Mac) が押された場合
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault(); // デフォルトの動作を防ぐ
            
            // テキストを全選択
            selectAllText(previewContent);
        }
    });
    
    // プレビューエリアをクリック可能にする（フォーカス可能にするため）
    previewContent.setAttribute('tabindex', '0');
    previewContent.style.cursor = 'text';
}

// テキストを全選択する関数
function selectAllText(element) {
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

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('settings-modal');
        if (modal && modal.classList.contains('show')) {
            closeSettingsModal();
        }
    }
});