"""
CSVレンダラー
"""
import csv
import io
import logging
from typing import Dict, List, Any
from ..models import ConversionSettings, FileData, TestCase, SplitMode
from ..i18n import get_string, set_language

logger = logging.getLogger(__name__)


class CsvRenderer:
    """CSVレンダラー"""
    
    def __init__(self, settings: ConversionSettings):
        self.settings = settings
        logger.info(f"CsvRenderer initialized")
    
    def render(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """CSV形式でレンダリング"""
        logger.info(f"CsvRenderer.render called with {len(file_data_list)} files")
        
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
                # CSVデータ生成
                csv_content = self._generate_csv_content(sheet_data.items)
                
                # ファイル名を生成（シート数に応じてシート名を含めるかどうかを決定）
                filename = self._sanitize_filename(file_data.filename)
                id_range = self._get_id_range(sheet_data.items)
                
                if total_sheets == 1:
                    # シートが1つの場合はシート名は不要
                    if id_range:
                        output_filename = f"{filename}_{id_range}.csv"
                    else:
                        output_filename = f"{filename}.csv"
                else:
                    # シートが複数の場合はシート名を含める
                    sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                    if id_range:
                        output_filename = f"{filename}_{sheet_name}_{id_range}.csv"
                    else:
                        output_filename = f"{filename}_{sheet_name}.csv"
                
                rendered_files[output_filename] = csv_content
        
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
                    # CSVデータ生成
                    csv_content = self._generate_csv_content(test_cases)
                    
                    # ファイル名を生成（シート数に応じてシート名を含めるかどうかを決定）
                    filename = self._sanitize_filename(file_data.filename)
                    category_name = self._sanitize_filename(category)
                    id_range = self._get_id_range(test_cases)
                    
                    if total_sheets == 1:
                        # シートが1つの場合はシート名は不要
                        if id_range:
                            output_filename = f"{filename}_{category_name}_{id_range}.csv"
                        else:
                            output_filename = f"{filename}_{category_name}.csv"
                    else:
                        # シートが複数の場合はシート名を含める
                        sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                        if id_range:
                            output_filename = f"{filename}_{sheet_name}_{category_name}_{id_range}.csv"
                        else:
                            output_filename = f"{filename}_{sheet_name}_{category_name}.csv"
                    
                    rendered_files[output_filename] = csv_content
        
        return rendered_files
    
    def _render_per_case(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """ケース単位でレンダリング"""
        rendered_files = {}
        
        for file_data in file_data_list:
            for sheet_data in file_data.sheets:
                for test_case in sheet_data.items:
                    # CSVデータ生成
                    csv_content = self._generate_csv_content([test_case])
                    
                    # ファイル名を生成（ケース単位ではテストケースIDと拡張子のみ）
                    output_filename = f"{test_case.id}.csv"
                    
                    rendered_files[output_filename] = csv_content
        
        return rendered_files
    
    def _generate_csv_content(self, test_cases: List[TestCase]) -> str:
        """CSVコンテンツを生成"""
        if not test_cases:
            return ""
        
        # CSV出力用のStringIO
        output = io.StringIO()
        
        # CSVライター作成（UTF-8 BOM付きでExcel対応）
        writer = csv.writer(output, lineterminator='\n')
        
        # 言語設定に基づいてヘッダーを生成
        headers = self._get_csv_headers()
        writer.writerow(headers)
        
        # データ行
        for test_case in test_cases:
            # カテゴリを個別の列に分割（設定に基づいて動的に処理）
            category_items = test_case.category if test_case.category else []
            category_count = len(self.settings.category_row.keys)
            
            # カテゴリの各レベルを取得（設定の列数に合わせて動的に生成）
            category_levels = []
            for i in range(category_count):
                category_levels.append(category_items[i] if i < len(category_items) else "")
            
            # テスト環境を文字列に変換
            environments_str = ", ".join(test_case.test_environments) if test_case.test_environments else ""
            
            # 行データを構築
            row = [
                test_case.id,
                test_case.title
            ]
            
            # カテゴリ列を追加
            row.extend(category_levels)
            
            # その他の列を追加
            row.extend([
                test_case.type,
                test_case.priority,
                test_case.preconditions,
                test_case.steps,
                test_case.expect,
                test_case.notes
            ])
            
            # 基本情報が有効な場合のみBacklog ID以降の列を追加
            if self.settings.output_basic_info:
                row.extend([
                    test_case.backlog_id,
                    test_case.test_type,
                    test_case.test_target,
                    test_case.target_version,
                    environments_str
                ])
            
            writer.writerow(row)
        
        # BOM付きUTF-8で返す（Excel対応）
        content = output.getvalue()
        output.close()
        
        # UTF-8 BOMを追加
        return '\ufeff' + content
    
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
    
    def _get_csv_headers(self) -> List[str]:
        """言語設定に基づいてCSVヘッダーを取得"""
        # 言語を設定
        set_language(self.settings.output_language)
        
        # 基本ヘッダー
        headers = [
            get_string("output.id"),
            get_string("output.title")
        ]
        
        # カテゴリ列を動的に追加（設定に基づいて連番で生成）
        category_count = len(self.settings.category_row.keys)
        category_base = get_string("output.category")
        for i in range(category_count):
            headers.append(f"{category_base}{i+1}")
        
        # その他のヘッダー
        headers.extend([
            get_string("output.test_type"),
            get_string("output.priority"),
            get_string("output.preconditions"),
            get_string("output.test_steps"),
            get_string("output.expected_result"),
            get_string("output.notes")
        ])
        
        # 基本情報が有効な場合のみBacklog ID以降の列を追加
        if self.settings.output_basic_info:
            headers.extend([
                get_string("output.backlog_id"),
                get_string("output.test_type"),
                get_string("output.test_target"),
                get_string("output.target_version"),
                get_string("output.test_environments")
            ])
        
        return headers
    
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
    
    def _split_filename(self, filename: str) -> tuple:
        """ファイル名をベース名と拡張子に分割"""
        import os
        base_name, extension = os.path.splitext(filename)
        return base_name, extension
