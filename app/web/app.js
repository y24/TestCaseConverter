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
        // 新しい構造に対応
        const outputSettings = currentSettings.出力 || {};
        const caseIdSettings = currentSettings.ケースID || {};
        const stepSettings = currentSettings.手順 || {};
        
        // 出力設定
        setElementValue('output-format', outputSettings.output_format || currentSettings.output_format || 'markdown');
        setElementValue('split-mode', outputSettings.split_mode || currentSettings.split_mode || 'per_sheet');
        
        // ケースID設定
        setElementValue('id-prefix', caseIdSettings.id_prefix || currentSettings.id_prefix || 'TC');
        setElementValue('id-padding', caseIdSettings.id_padding || currentSettings.id_padding || 3);
        
        // 文字列処理設定
        setElementChecked('trim-whitespaces', currentSettings.trim_whitespaces !== false);
        setElementChecked('forward-fill-category', currentSettings.forward_fill_category !== false);
        setElementChecked('normalize-zenkaku', currentSettings.normalize_zenkaku_numbers !== false);
        
        // 読み取り設定
        const header = currentSettings.header || { search_col: "A", search_key: "#" };
        setElementValue('header-search-col', header.search_col || "A");
        setElementValue('header-search-key', header.search_key || "#");
        
        const categoryRow = currentSettings.category_row || { keys: ["大項目", "中項目", "小項目1", "小項目2"] };
        setElementValue('category-keys', categoryRow.keys ? categoryRow.keys.join(',') : "大項目,中項目,小項目1,小項目2");
        
        const stepRow = currentSettings.step_row || { keys: ["手順"] };
        setElementValue('step-keys', stepRow.keys ? stepRow.keys.join(',') : "手順");
        
        const tobeRow = currentSettings.tobe_row || { keys: ["期待結果"], ignores: [] };
        setElementValue('tobe-keys', tobeRow.keys ? tobeRow.keys.join(',') : "期待結果");
        
        const testTypeRow = currentSettings.test_type_row || { keys: ["テスト種別"] };
        setElementValue('test-type-keys', testTypeRow.keys ? testTypeRow.keys.join(',') : "テスト種別");
        
        const priorityRow = currentSettings.priority_row || { keys: ["優先度"] };
        setElementValue('priority-keys', priorityRow.keys ? priorityRow.keys.join(',') : "優先度");
        
        const preconditionRow = currentSettings.precondition_row || { keys: ["前提条件"] };
        setElementValue('precondition-keys', preconditionRow.keys ? preconditionRow.keys.join(',') : "前提条件");
        
        const noteRow = currentSettings.note_row || { keys: ["備考", "補足情報"] };
        setElementValue('note-keys', noteRow.keys ? noteRow.keys.join(',') : "備考,補足情報");
        
        const titleRow = currentSettings.title_row || { keys: [] };
        setElementValue('title-keys', titleRow.keys ? titleRow.keys.join(',') : "");
        
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

// 設定更新
function updateSettings() {
    try {
        // カンマ区切りの文字列を配列に変換するヘルパー関数
        function parseCommaSeparated(value) {
            if (!value || value.trim() === '') return [];
            return value.split(',').map(item => item.trim()).filter(item => item !== '');
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
            出力: {
                output_format: getElementValue('output-format', 'markdown'),
                split_mode: getElementValue('split-mode', 'per_sheet')
            },
            ケースID: {
                id_prefix: getElementValue('id-prefix', 'TC'),
                id_padding: getElementNumber('id-padding', 3),
                force_id_regenerate: false
            },
            sheet_search_keys: ["テスト項目"],
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
            step_row: {
                keys: parseCommaSeparated(getElementValue('step-keys', '手順')),
                ignores: []
            },
            tobe_row: {
                keys: parseCommaSeparated(getElementValue('tobe-keys', '期待結果')),
                ignores: []
            },
            test_type_row: {
                keys: parseCommaSeparated(getElementValue('test-type-keys', 'テスト種別')),
                ignores: []
            },
            priority_row: {
                keys: parseCommaSeparated(getElementValue('priority-keys', '優先度')),
                ignores: []
            },
            precondition_row: {
                keys: parseCommaSeparated(getElementValue('precondition-keys', '前提条件')),
                ignores: []
            },
            note_row: {
                keys: parseCommaSeparated(getElementValue('note-keys', '備考,補足情報')),
                ignores: []
            },
            title_row: {
                keys: parseCommaSeparated(getElementValue('title-keys', '')),
                ignores: []
            },
            
            // 処理設定
            trim_whitespaces: getElementChecked('trim-whitespaces', true),
            normalize_zenkaku_numbers: getElementChecked('normalize-zenkaku', true),
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
    
    fileList.innerHTML = '';
    
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-icon">📊</span>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" class="remove-btn" onclick="removeFile(${index})">削除</button>
        `;
        fileList.appendChild(fileItem);
    });
    
    // ファイルが1件以上ある場合はドロップエリアを非表示、0件の場合は表示
    if (uploadedFiles.length > 0) {
        uploadArea.style.display = 'none';
    } else {
        uploadArea.style.display = 'block';
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
        downloadBtn.textContent = 'すべてダウンロード (ZIP)';
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
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '変換に失敗しました');
        }
        
        conversionResult = await response.json();
        showPreview();
        
    } catch (error) {
        showError('自動変換に失敗しました: ' + error.message);
        // 変換に失敗した場合はプレビューをクリア
        conversionResult = null;
        resetToInitialState();
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
            const errorData = await response.json();
            throw new Error(errorData.detail || '変換に失敗しました');
        }
        
        conversionResult = await response.json();
        showPreview();
        
    } catch (error) {
        showError('変換に失敗しました: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// プレビュー表示
function showPreview() {
    const previewSection = document.getElementById('preview-section');
    const fileSelect = document.getElementById('preview-file-select');
    const previewControls = document.querySelector('.preview-controls');
    
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
            downloadBtn.textContent = 'ダウンロード';
            
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
            downloadBtn.textContent = 'すべてダウンロード (ZIP)';
            
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

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('settings-modal');
        if (modal && modal.classList.contains('show')) {
            closeSettingsModal();
        }
    }
});