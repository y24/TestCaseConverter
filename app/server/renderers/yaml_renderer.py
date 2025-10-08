"""
YAMLレンダラー
"""
import yaml
import logging
from typing import Dict, List, Any
from ..models import ConversionSettings, FileData, TestCase, SplitMode



logger = logging.getLogger(__name__)


class YamlRenderer:
    """YAMLレンダラー"""
    
    def __init__(self, settings: ConversionSettings):
        self.settings = settings
    
    def render(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """YAML形式でレンダリング"""
        rendered_files = {}
        
        if self.settings.split_mode == SplitMode.PER_SHEET:
            rendered_files = self._render_per_sheet(file_data_list)
        elif self.settings.split_mode == SplitMode.PER_CATEGORY:
            rendered_files = self._render_per_category(file_data_list)
        elif self.settings.split_mode == SplitMode.PER_CASE:
            rendered_files = self._render_per_case(file_data_list)
        
        # ファイル名の重複処理
        rendered_files = self._resolve_filename_conflicts(rendered_files)
        
        return rendered_files
    
    
    def _render_per_sheet(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """シート単位でレンダリング"""
        rendered_files = {}
        
        for file_data in file_data_list:
            # シート数を取得
            total_sheets = len(file_data.sheets)
            
            for sheet_data in file_data.sheets:
                # ヘッダー生成
                header = self._generate_header(file_data.filename, sheet_data.sheet_name)
                
                # 共通source情報を取得
                common_source = self._get_common_source_info(file_data.filename, sheet_data.sheet_name)
                
                meta_info = {
                    'output_format': 'yaml',
                    'split_mode': 'per_sheet',
                    'id_prefix': self.settings.id_prefix,
                    'id_padding': self.settings.id_padding,
                    'settings_profile': 'default',
                    'source_files': [file_data.filename],
                    'sheets_included': [sheet_data.sheet_name],
                    'header': header,
                    'filename': file_data.filename,
                    'sheet_name': sheet_data.sheet_name,
                    'common_source': common_source
                }
                
                # レンダリング
                yaml_content = self._render_test_cases(sheet_data.items, meta_info)
                
                # ファイル名を生成（シート数に応じてシート名を含めるかどうかを決定）
                filename = self._sanitize_filename(file_data.filename)
                id_range = self._get_id_range(sheet_data.items)
                
                if total_sheets == 1:
                    # シートが1つの場合はシート名は不要
                    if id_range:
                        output_filename = f"{filename}_{id_range}.yaml"
                    else:
                        output_filename = f"{filename}.yaml"
                else:
                    # シートが複数の場合はシート名を含める
                    sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                    if id_range:
                        output_filename = f"{filename}_{sheet_name}_{id_range}.yaml"
                    else:
                        output_filename = f"{filename}_{sheet_name}.yaml"
                
                rendered_files[output_filename] = yaml_content
        
        return rendered_files
    
    def _render_per_category(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """カテゴリ単位でレンダリング"""
        rendered_files = {}
        
        for file_data in file_data_list:
            # シート数を取得
            total_sheets = len(file_data.sheets)
            
            for sheet_data in file_data.sheets:
                # カテゴリごとにグループ化
                category_groups = self._group_by_category(sheet_data.items)
                
                for category, test_cases in category_groups.items():
                    # ヘッダー生成
                    header = self._generate_header(file_data.filename, sheet_data.sheet_name, category)
                    
                    # 共通source情報を取得
                    common_source = self._get_common_source_info(file_data.filename, sheet_data.sheet_name, category)
                    
                    meta_info = {
                        'output_format': 'yaml',
                        'split_mode': 'per_category',
                        'id_prefix': self.settings.id_prefix,
                        'id_padding': self.settings.id_padding,
                        'settings_profile': 'default',
                        'source_files': [file_data.filename],
                        'sheets_included': [sheet_data.sheet_name],
                        'header': header,
                        'filename': file_data.filename,
                        'sheet_name': sheet_data.sheet_name,
                        'common_source': common_source
                    }
                    
                    # レンダリング
                    yaml_content = self._render_test_cases(test_cases, meta_info)
                    
                    # ファイル名を生成（シート数に応じてシート名を含めるかどうかを決定）
                    filename = self._sanitize_filename(file_data.filename)
                    category_name = self._sanitize_filename(category)
                    id_range = self._get_id_range(test_cases)
                    
                    if total_sheets == 1:
                        # シートが1つの場合はシート名は不要
                        if id_range:
                            output_filename = f"{filename}_{category_name}_{id_range}.yaml"
                        else:
                            output_filename = f"{filename}_{category_name}.yaml"
                    else:
                        # シートが複数の場合はシート名を含める
                        sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                        if id_range:
                            output_filename = f"{filename}_{sheet_name}_{category_name}_{id_range}.yaml"
                        else:
                            output_filename = f"{filename}_{sheet_name}_{category_name}.yaml"
                    
                    rendered_files[output_filename] = yaml_content
        
        return rendered_files
    
    def _render_per_case(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """ケース単位でレンダリング"""
        rendered_files = {}
        
        for file_data in file_data_list:
            for sheet_data in file_data.sheets:
                for test_case in sheet_data.items:
                    # ヘッダー生成
                    header = self._generate_header(file_data.filename, sheet_data.sheet_name)
                    
                    # 共通source情報を取得（ケース単位では共通情報なし）
                    common_source = self._get_common_source_info(file_data.filename, sheet_data.sheet_name)
                    
                    meta_info = {
                        'output_format': 'yaml',
                        'split_mode': 'per_case',
                        'id_prefix': self.settings.id_prefix,
                        'id_padding': self.settings.id_padding,
                        'settings_profile': 'default',
                        'source_files': [file_data.filename],
                        'sheets_included': [sheet_data.sheet_name],
                        'header': header,
                        'filename': file_data.filename,
                        'sheet_name': sheet_data.sheet_name,
                        'common_source': common_source
                    }
                    
                    # レンダリング
                    yaml_content = self._render_test_cases([test_case], meta_info)
                    
                    # ファイル名を生成（ケース単位ではテストケースIDと拡張子のみ）
                    output_filename = f"{test_case.id}.yaml"
                    
                    rendered_files[output_filename] = yaml_content
        
        return rendered_files
    
    def _render_test_cases(self, test_cases: List[TestCase], meta_info: Dict[str, Any]) -> str:
        """テストケースをYAML形式でレンダリング"""
        yaml_data = []
        
        # 共通source情報をメタ情報に追加
        if 'common_source' in meta_info and meta_info['common_source']:
            yaml_data.append({'common_source': meta_info['common_source']})
        
        # 新しい項目をタイトルセクションの下に追加
        if test_cases:
            # 最初のテストケースから新しい項目の情報を取得
            first_case = test_cases[0]
            additional_info = {}
            
            if first_case.backlog_id:
                additional_info['backlog_id'] = first_case.backlog_id
            if first_case.test_type:
                additional_info['test_type'] = first_case.test_type
            if first_case.test_target:
                additional_info['test_target'] = first_case.test_target
            if first_case.target_version:
                additional_info['target_version'] = first_case.target_version
            
            if additional_info:
                yaml_data.append(additional_info)
        
        for test_case in test_cases:
            case_data = {
                'title': test_case.title,
                'category': test_case.category
            }
            
            # ケースID出力設定に応じてIDを追加
            if self.settings.output_case_id:
                case_data['id'] = test_case.id
            
            # テスト種別が空でない場合のみ追加
            if test_case.type and test_case.type.strip():
                case_data['type'] = test_case.type
            
            # 優先度
            if test_case.priority:
                case_data['priority'] = test_case.priority
            
            # 個別source情報を追加（分割モードに応じて簡略化、priorityの下に配置）
            individual_source = self._get_individual_source_info(test_case.source, meta_info.get('filename', ''), meta_info.get('sheet_name', ''))
            if individual_source:
                case_data['source'] = individual_source
            
            # その他のフィールドを追加
            if test_case.preconditions:
                case_data['preconditions'] = test_case.preconditions
            if test_case.steps:
                case_data['steps'] = test_case.steps
            if test_case.expect:
                case_data['expect'] = test_case.expect
            if test_case.notes:
                case_data['notes'] = test_case.notes
            
            yaml_data.append(case_data)
        
        # メタ情報を最後に追加
        yaml_data.append({'meta': meta_info})
        
        # YAML文字列に変換
        yaml_content = yaml.dump(
            yaml_data,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            indent=2
        )
        
        # 余計な空白行を削除
        yaml_content = self._remove_extra_blank_lines(yaml_content)
        
        return yaml_content
    
    def _generate_header(self, filename: str, sheet_name: str, category_name: str = None) -> str:
        """分割モードに応じたヘッダーを生成"""
        # ファイル名から拡張子を除去
        base_filename = filename.replace('.xlsx', '').replace('.xls', '')
        
        if self.settings.split_mode == SplitMode.PER_SHEET:
            # シート単位：{ファイル名} ({シート名})
            return f"{base_filename} ({sheet_name})"
        elif self.settings.split_mode == SplitMode.PER_CATEGORY:
            # カテゴリ単位：{ファイル名} ({シート名}) - {カテゴリ名}
            if category_name:
                return f"{base_filename} ({sheet_name}) - {category_name}"
            else:
                return f"{base_filename} ({sheet_name})"
        elif self.settings.split_mode == SplitMode.PER_CASE:
            # ケース単位：{ファイル名} ({シート名})
            return f"{base_filename} ({sheet_name})"
        else:
            # デフォルト
            return sheet_name
    
    def _remove_extra_blank_lines(self, yaml_content: str) -> str:
        """YAML出力の余計な空白行を削除"""
        import re
        
        # steps、expect、preconditionsフィールドの余計な空白行を削除
        # パターン: 'text\n\n    more_text' → 'text\nmore_text'
        pattern = r"(\s+(?:steps|expect|preconditions):\s*'[^']*?)\n\n(\s+[^']*?')"
        
        def replace_blank_lines(match):
            before = match.group(1)
            after = match.group(2)
            # 余計な空白行を削除し、インデントを調整
            return before + '\n' + after
        
        # 複数回適用して、連続する空白行をすべて削除
        while re.search(pattern, yaml_content, re.DOTALL):
            yaml_content = re.sub(pattern, replace_blank_lines, yaml_content, flags=re.DOTALL)
        
        return yaml_content
    
    def _group_by_category(self, test_cases: List[TestCase]) -> Dict[str, List[TestCase]]:
        """カテゴリごとにグループ化"""
        groups = {}
        
        for test_case in test_cases:
            # 大項目（最初のカテゴリ）でグループ化
            category_key = test_case.category[0] if test_case.category else "未分類"
            
            if category_key not in groups:
                groups[category_key] = []
            
            groups[category_key].append(test_case)
        
        return groups
    
    def _sanitize_filename(self, filename: str) -> str:
        """ファイル名を安全化"""
        # 禁止文字を置換
        forbidden_chars = r'[<>:"/\\|?*]'
        import re
        sanitized = re.sub(forbidden_chars, '_', filename)
        
        # 長さ制限（100文字）
        if len(sanitized) > 100:
            sanitized = sanitized[:100]
        
        return sanitized
    
    def _resolve_filename_conflicts(self, rendered_files: Dict[str, str]) -> Dict[str, str]:
        """ファイル名の重複を解決"""
        resolved_files = {}
        filename_counts = {}
        
        for filename, content in rendered_files.items():
            if filename in resolved_files:
                # 重複している場合、連番を付与
                base_name, extension = self._split_filename(filename)
                counter = filename_counts.get(filename, 1)
                
                while f"{base_name} ({counter}){extension}" in resolved_files:
                    counter += 1
                
                new_filename = f"{base_name} ({counter}){extension}"
                resolved_files[new_filename] = content
                filename_counts[filename] = counter + 1
            else:
                resolved_files[filename] = content
                filename_counts[filename] = 1
        
        return resolved_files
    
    def _get_common_source_info(self, filename: str, sheet_name: str, category_name: str = None) -> str:
        """分割モードに応じた共通source情報を取得"""
        if self.settings.split_mode == SplitMode.PER_SHEET:
            # シート単位：ファイル名とシート名が共通
            return f"{filename} / {sheet_name}"
        elif self.settings.split_mode == SplitMode.PER_CATEGORY:
            # カテゴリ単位：ファイル名が共通
            return filename
        elif self.settings.split_mode == SplitMode.PER_CASE:
            # ケース単位：共通情報なし（各ケースで完全な情報を表示）
            return None
        else:
            return None
    
    def _get_individual_source_info(self, source_info: dict, filename: str, sheet_name: str = None) -> str:
        """分割モードに応じた個別source情報を取得"""
        if self.settings.split_mode == SplitMode.PER_SHEET:
            # シート単位：行番号のみ
            return f"row {source_info.get('row', '')}"
        elif self.settings.split_mode == SplitMode.PER_CATEGORY:
            # カテゴリ単位：シート名と行番号
            return f"{source_info.get('sheet', '')} / row {source_info.get('row', '')}"
        elif self.settings.split_mode == SplitMode.PER_CASE:
            # ケース単位：完全な情報
            return f"{filename} / {source_info.get('sheet', '')} / row {source_info.get('row', '')}"
        else:
            # デフォルト：完全な情報
            return f"{filename} / {source_info.get('sheet', '')} / row {source_info.get('row', '')}"
    
    def _split_filename(self, filename: str) -> tuple:
        """ファイル名をベース名と拡張子に分割"""
        import os
        base_name, extension = os.path.splitext(filename)
        return base_name, extension
    
    def _get_id_range(self, test_cases: List[TestCase]) -> str:
        """テストケースIDの範囲を取得"""
        if not test_cases:
            return ""
        
        # IDから数値部分を抽出してソート
        id_numbers = []
        for test_case in test_cases:
            # IDから数値部分を抽出（例: "TC001" -> 1）
            import re
            match = re.search(r'\d+', test_case.id)
            if match:
                id_numbers.append(int(match.group()))
        
        if not id_numbers:
            return ""
        
        id_numbers.sort()
        min_id = min(id_numbers)
        max_id = max(id_numbers)
        
        # 3桁のゼロパディングで範囲を返す
        return f"{min_id:03d}-{max_id:03d}"