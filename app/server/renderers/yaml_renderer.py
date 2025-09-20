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
            for sheet_data in file_data.sheets:
                # ヘッダー生成
                header = self._generate_header(file_data.filename, sheet_data.sheet_name)
                
                meta_info = {
                    'output_format': 'yaml',
                    'split_mode': 'per_sheet',
                    'id_prefix': self.settings.id_prefix,
                    'id_padding': self.settings.id_padding,
                    'settings_profile': 'default',
                    'source_files': [file_data.filename],
                    'sheets_included': [sheet_data.sheet_name],
                    'header': header
                }
                
                # レンダリング
                yaml_content = self._render_test_cases(sheet_data.items, meta_info)
                
                # ファイル名を生成
                filename = self._sanitize_filename(file_data.filename)
                sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                output_filename = f"{filename}__{sheet_name}.yaml"
                
                rendered_files[output_filename] = yaml_content
        
        return rendered_files
    
    def _render_per_category(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """カテゴリ単位でレンダリング"""
        rendered_files = {}
        
        for file_data in file_data_list:
            for sheet_data in file_data.sheets:
                # カテゴリごとにグループ化
                category_groups = self._group_by_category(sheet_data.items)
                
                for category, test_cases in category_groups.items():
                    # ヘッダー生成
                    header = self._generate_header(file_data.filename, sheet_data.sheet_name, category)
                    
                    meta_info = {
                        'output_format': 'yaml',
                        'split_mode': 'per_category',
                        'id_prefix': self.settings.id_prefix,
                        'id_padding': self.settings.id_padding,
                        'settings_profile': 'default',
                        'source_files': [file_data.filename],
                        'sheets_included': [sheet_data.sheet_name],
                        'header': header
                    }
                    
                    # レンダリング
                    yaml_content = self._render_test_cases(test_cases, meta_info)
                    
                    # ファイル名を生成
                    filename = self._sanitize_filename(file_data.filename)
                    sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                    category_name = self._sanitize_filename(category)
                    output_filename = f"{filename}__{sheet_name}__{category_name}.yaml"
                    
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
                    
                    meta_info = {
                        'output_format': 'yaml',
                        'split_mode': 'per_case',
                        'id_prefix': self.settings.id_prefix,
                        'id_padding': self.settings.id_padding,
                        'settings_profile': 'default',
                        'source_files': [file_data.filename],
                        'sheets_included': [sheet_data.sheet_name],
                        'header': header
                    }
                    
                    # レンダリング
                    yaml_content = self._render_test_cases([test_case], meta_info)
                    
                    # ファイル名を生成
                    sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                    output_filename = f"{test_case.id}__{sheet_name}.yaml"
                    
                    rendered_files[output_filename] = yaml_content
        
        return rendered_files
    
    def _render_test_cases(self, test_cases: List[TestCase], meta_info: Dict[str, Any]) -> str:
        """テストケースをYAML形式でレンダリング"""
        yaml_data = []
        
        for test_case in test_cases:
            case_data = {
                'id': test_case.id,
                'title': test_case.title,
                'category': test_case.category,
                'type': test_case.type,
                'priority': test_case.priority,
                'preconditions': test_case.preconditions,
                'steps': test_case.steps,  # 文字列をそのまま使用
                'expect': test_case.expect,  # 期待結果を追加
                'notes': test_case.notes,
                'source': test_case.source
            }
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
    
    def _split_filename(self, filename: str) -> tuple:
        """ファイル名をベース名と拡張子に分割"""
        import os
        base_name, extension = os.path.splitext(filename)
        return base_name, extension
