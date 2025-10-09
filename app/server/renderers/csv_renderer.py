"""
CSVレンダラー
"""
import csv
import io
import logging
from typing import Dict, List, Any
from ..models import ConversionSettings, FileData, TestCase, SplitMode
from ..i18n import get_string

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
            for sheet_data in file_data.sheets:
                # ファイル名生成
                filename = f"{sheet_data.sheet_name}.csv"
                
                # CSVデータ生成
                csv_content = self._generate_csv_content(sheet_data.items)
                
                rendered_files[filename] = csv_content
        
        return rendered_files
    
    def _render_per_category(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """カテゴリ単位でレンダリング"""
        rendered_files = {}
        
        for file_data in file_data_list:
            for sheet_data in file_data.sheets:
                # カテゴリごとにグループ化
                category_groups = self._group_by_category(sheet_data.items)
                
                for category_path, test_cases in category_groups.items():
                    # ファイル名生成
                    category_name = "_".join(category_path) if category_path else "その他"
                    filename = f"{sheet_data.sheet_name}_{category_name}.csv"
                    
                    # CSVデータ生成
                    csv_content = self._generate_csv_content(test_cases)
                    
                    rendered_files[filename] = csv_content
        
        return rendered_files
    
    def _render_per_case(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """ケース単位でレンダリング"""
        rendered_files = {}
        
        for file_data in file_data_list:
            for sheet_data in file_data.sheets:
                for test_case in sheet_data.items:
                    # ファイル名生成
                    filename = f"{sheet_data.sheet_name}_{test_case.id}.csv"
                    
                    # CSVデータ生成
                    csv_content = self._generate_csv_content([test_case])
                    
                    rendered_files[filename] = csv_content
        
        return rendered_files
    
    def _generate_csv_content(self, test_cases: List[TestCase]) -> str:
        """CSVコンテンツを生成"""
        if not test_cases:
            return ""
        
        # CSV出力用のStringIO
        output = io.StringIO()
        
        # CSVライター作成（UTF-8 BOM付きでExcel対応）
        writer = csv.writer(output, lineterminator='\n')
        
        # ヘッダー行（カテゴリを個別列として追加）
        headers = [
            "ID",
            "タイトル", 
            "大項目",
            "中項目",
            "小項目1",
            "小項目2",
            "テスト種別",
            "優先度",
            "前提条件",
            "テストステップ",
            "期待結果",
            "備考",
            "Backlog ID",
            "テストタイプ",
            "テスト対象",
            "対象バージョン",
            "テスト環境"
        ]
        writer.writerow(headers)
        
        # データ行
        for test_case in test_cases:
            # カテゴリを個別の列に分割
            category_items = test_case.category if test_case.category else []
            # カテゴリの各レベルを取得（最大4レベルまで対応）
            category_levels = [
                category_items[0] if len(category_items) > 0 else "",  # 大項目
                category_items[1] if len(category_items) > 1 else "",  # 中項目
                category_items[2] if len(category_items) > 2 else "",  # 小項目1
                category_items[3] if len(category_items) > 3 else ""   # 小項目2
            ]
            
            # テスト環境を文字列に変換
            environments_str = ", ".join(test_case.test_environments) if test_case.test_environments else ""
            
            row = [
                test_case.id,
                test_case.title,
                category_levels[0],  # 大項目
                category_levels[1],  # 中項目
                category_levels[2],  # 小項目1
                category_levels[3],  # 小項目2
                test_case.type,
                test_case.priority,
                test_case.preconditions,
                test_case.steps,
                test_case.expect,
                test_case.notes,
                test_case.backlog_id,
                test_case.test_type,
                test_case.test_target,
                test_case.target_version,
                environments_str
            ]
            writer.writerow(row)
        
        # BOM付きUTF-8で返す（Excel対応）
        content = output.getvalue()
        output.close()
        
        # UTF-8 BOMを追加
        return '\ufeff' + content
    
    def _group_by_category(self, test_cases: List[TestCase]) -> Dict[tuple, List[TestCase]]:
        """カテゴリごとにグループ化"""
        groups = {}
        
        for test_case in test_cases:
            # カテゴリをタプルに変換（空の場合は("その他",)）
            category_key = tuple(test_case.category) if test_case.category else ("その他",)
            
            if category_key not in groups:
                groups[category_key] = []
            groups[category_key].append(test_case)
        
        return groups
    
    def _resolve_filename_conflicts(self, rendered_files: Dict[str, str]) -> Dict[str, str]:
        """ファイル名の重複を解決"""
        resolved_files = {}
        name_counts = {}
        
        for filename, content in rendered_files.items():
            if filename in resolved_files:
                # 重複している場合、番号を付ける
                base_name = filename.rsplit('.', 1)[0]
                extension = filename.rsplit('.', 1)[1] if '.' in filename else ''
                
                if base_name not in name_counts:
                    name_counts[base_name] = 1
                else:
                    name_counts[base_name] += 1
                
                new_filename = f"{base_name}_{name_counts[base_name]}.{extension}"
                resolved_files[new_filename] = content
            else:
                resolved_files[filename] = content
        
        return resolved_files
