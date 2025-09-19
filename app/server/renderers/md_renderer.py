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
        
        if self.settings.split_mode == SplitMode.PER_EXCEL:
            rendered_files = self._render_per_excel(file_data_list)
        elif self.settings.split_mode == SplitMode.PER_SHEET:
            rendered_files = self._render_per_sheet(file_data_list)
        elif self.settings.split_mode == SplitMode.PER_CATEGORY:
            rendered_files = self._render_per_category(file_data_list)
        elif self.settings.split_mode == SplitMode.PER_CASE:
            rendered_files = self._render_per_case(file_data_list)
        
        return rendered_files
    
    def _render_per_excel(self, file_data_list: List[FileData]) -> Dict[str, str]:
        """Excel単位でレンダリング"""
        rendered_files = {}
        
        for file_data in file_data_list:
            all_test_cases = []
            sheet_names = []
            
            for sheet_data in file_data.sheets:
                all_test_cases.extend(sheet_data.items)
                sheet_names.append(sheet_data.sheet_name)
            
            # レンダリング
            md_content = self._render_test_cases(all_test_cases, file_data.filename, sheet_names)
            
            # ファイル名を生成
            filename = self._sanitize_filename(file_data.filename)
            output_filename = f"{filename}.md"
            
            rendered_files[output_filename] = md_content
        
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
                
                # ファイル名を生成
                filename = self._sanitize_filename(file_data.filename)
                sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                output_filename = f"{filename}__{sheet_name}.md"
                
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
                        [sheet_data.sheet_name]
                    )
                    
                    # ファイル名を生成
                    filename = self._sanitize_filename(file_data.filename)
                    sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                    category_name = self._sanitize_filename(category)
                    output_filename = f"{filename}__{sheet_name}__{category_name}.md"
                    
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
                    
                    # ファイル名を生成
                    sheet_name = self._sanitize_filename(sheet_data.sheet_name)
                    output_filename = f"{test_case.id}__{sheet_name}.md"
                    
                    rendered_files[output_filename] = md_content
        
        return rendered_files
    
    def _render_test_cases(self, test_cases: List[TestCase], filename: str, sheet_names: List[str]) -> str:
        """テストケースをMarkdown形式でレンダリング"""
        if not test_cases:
            return ""
        
        # ヘッダー
        sheet_name = sheet_names[0] if sheet_names else "テスト項目"
        md_content = f"# テストケース一覧（{sheet_name}）\n\n"
        
        # 各テストケースをレンダリング
        for i, test_case in enumerate(test_cases):
            md_content += self._render_single_test_case(test_case, filename)
            
            # 最後のケース以外は区切り線を追加
            if i < len(test_cases) - 1:
                md_content += "\n---\n\n"
        
        # メタ情報を追加
        md_content += self._render_meta_info(filename, sheet_names)
        
        return md_content
    
    def _render_single_test_case(self, test_case: TestCase, filename: str) -> str:
        """単一テストケースをレンダリング"""
        md_content = f"## {test_case.id}\n\n"
        
        # 基本情報
        md_content += f"- title: {test_case.title}\n"
        
        # カテゴリ（階層表示）
        category_str = " > ".join([cat for cat in test_case.category if cat])
        md_content += f"- category: {category_str}\n"
        
        md_content += f"- type: {test_case.type}\n"
        
        # 優先度
        if test_case.priority:
            md_content += f"- priority: {test_case.priority}\n"
        
        # 前提条件
        if test_case.preconditions:
            md_content += "- preconditions:\n"
            for precondition in test_case.preconditions:
                if precondition:
                    md_content += f"  - {precondition}\n"
        else:
            md_content += "- preconditions:\n"
        
        md_content += "\n"
        
        # 手順
        if test_case.steps:
            md_content += "### 手順\n"
            for step in test_case.steps:
                expect_text = f" （期待：{step.expect}）" if step.expect else ""
                md_content += f"{step.num}. {step.action}{expect_text}\n"
            md_content += "\n"
        
        # 備考
        if test_case.notes:
            md_content += "### notes\n"
            md_content += f"{test_case.notes}\n\n"
        else:
            md_content += "### notes\n\n"
        
        # ソース情報
        source_info = test_case.source
        md_content += f"<sub>source: {filename} / {source_info.get('sheet', '')} / row {source_info.get('row', '')}</sub>\n\n"
        
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
