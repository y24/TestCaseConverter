"""
Markdownレンダラー
"""
import logging
from typing import Dict, List, Any
from ..models import ConversionSettings, FileData, TestCase, SplitMode

logger = logging.getLogger(__name__)


class MarkdownRenderer:
    """Markdownレンダラー"""
    
    def __init__(self, settings: ConversionSettings):
        self.settings = settings
    
    def render(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """Markdown形式でレンダリング"""
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
                # レンダリング
                md_content = self._render_test_cases(
                    sheet_data.items, 
                    file_data.filename, 
                    [sheet_data.sheet_name]
                )
                
                # ファイル名を生成（ID範囲を追加）
                filename = self._sanitize_filename(file_data.filename)
                sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                id_range = self._get_id_range(sheet_data.items)
                if id_range:
                    output_filename = f"{filename}_{sheet_name}_{id_range}.md"
                else:
                    output_filename = f"{filename}_{sheet_name}.md"
                
                rendered_files[output_filename] = md_content
        
        return rendered_files
    
    def _render_per_category(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """カテゴリ単位でレンダリング"""
        rendered_files = {}
        
        for file_data in file_data_list:
            for sheet_data in file_data.sheets:
                # カテゴリごとにグループ化
                category_groups = self._group_by_category(sheet_data.items)
                
                for category, test_cases in category_groups.items():
                    # レンダリング
                    md_content = self._render_test_cases(
                        test_cases, 
                        file_data.filename, 
                        [sheet_data.sheet_name],
                        category
                    )
                    
                    # ファイル名を生成（ID範囲を追加）
                    filename = self._sanitize_filename(file_data.filename)
                    sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                    category_name = self._sanitize_filename(category)
                    id_range = self._get_id_range(test_cases)
                    if id_range:
                        output_filename = f"{filename}_{sheet_name}_{category_name}_{id_range}.md"
                    else:
                        output_filename = f"{filename}_{sheet_name}_{category_name}.md"
                    
                    rendered_files[output_filename] = md_content
        
        return rendered_files
    
    def _render_per_case(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """ケース単位でレンダリング"""
        rendered_files = {}
        
        for file_data in file_data_list:
            for sheet_data in file_data.sheets:
                for test_case in sheet_data.items:
                    # レンダリング
                    md_content = self._render_test_cases(
                        [test_case], 
                        file_data.filename, 
                        [sheet_data.sheet_name]
                    )
                    
                    # ファイル名を生成（ケース単位ではID範囲は不要、単一IDのみ）
                    sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                    output_filename = f"{test_case.id}_{sheet_name}.md"
                    
                    rendered_files[output_filename] = md_content
        
        return rendered_files
    
    def _render_test_cases(self, test_cases: List[TestCase], filename: str, sheet_names: List[str], category_name: str = None) -> str:
        """テストケースをMarkdown形式でレンダリング"""
        if not test_cases:
            return ""
        
        # ヘッダー生成（分割モードに応じて出し分け）
        sheet_name = sheet_names[0] if sheet_names else "テスト項目"
        header = self._generate_header(filename, sheet_name, category_name)
        md_content = f"# {header}\n\n"
        
        # 共通source情報をヘッダー部分に表示（分割モードに応じて）
        common_source = self._get_common_source_info(filename, sheet_name, category_name)
        if common_source:
            md_content += f"<sub>source: {common_source}</sub>\n\n"
        
        # 各テストケースをレンダリング
        for i, test_case in enumerate(test_cases):
            md_content += self._render_single_test_case(test_case, filename, sheet_name)
            
            # 最後のケース以外は区切り線を追加
            if i < len(test_cases) - 1:
                md_content += "---\n\n"
        
        # メタ情報を追加
        md_content += self._render_meta_info(filename, sheet_names)
        
        return md_content
    
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
    
    def _render_single_test_case(self, test_case: TestCase, filename: str, sheet_name: str = None) -> str:
        """単一テストケースをレンダリング"""
        md_content = f"## {test_case.id}: {test_case.title}\n\n"
        
        # カテゴリ（階層表示）
        category_str = " > ".join([cat for cat in test_case.category if cat])
        md_content += f"- category: {category_str}\n"
        
        # テスト種別が空でない場合のみ追加
        if test_case.type and test_case.type.strip():
            md_content += f"- type: {test_case.type}\n"
        
        # 優先度
        if test_case.priority:
            md_content += f"- priority: {test_case.priority}\n"
        
        # ソース情報（分割モードに応じて簡略化、priorityの下に表示）
        source_info = test_case.source
        individual_source = self._get_individual_source_info(source_info, filename, sheet_name)
        if individual_source:
            md_content += f"- source: {individual_source}\n"
        
        md_content += "\n"
        
        # 前提条件
        if test_case.preconditions:
            md_content += "### 前提条件\n"
            md_content += f"{test_case.preconditions}\n\n"
        
        # 手順
        if test_case.steps:
            md_content += "### 手順\n"
            # stepsは文字列として処理
            md_content += f"{test_case.steps}\n\n"
        
        # 期待結果
        if test_case.expect:
            md_content += "### 期待結果\n"
            md_content += f"{test_case.expect}\n\n"
        
        # 備考
        if test_case.notes:
            md_content += "### 備考\n"
            md_content += f"{test_case.notes}\n\n"
        
        return md_content
    
    def _render_meta_info(self, filename: str, sheet_names: List[str]) -> str:
        """メタ情報をレンダリング"""
        md_content = "### meta\n"
        md_content += f"- output_format: markdown\n"
        md_content += f"- split_mode: {self.settings.split_mode}\n"
        md_content += f"- id_prefix: {self.settings.id_prefix}\n"
        md_content += f"- id_padding: {self.settings.id_padding}\n"
        md_content += f"- settings_profile: default\n"
        md_content += f"- source_files: {filename}\n"
        md_content += f"- sheets_included: {', '.join(sheet_names)}\n"
        
        return md_content
    
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