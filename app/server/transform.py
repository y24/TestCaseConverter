"""
データ変換・正規化機能
"""
import re
import logging
from typing import List, Dict, Any
from .models import ConversionSettings, FileData, TestCase

logger = logging.getLogger(__name__)


class DataTransformer:
    """データ変換クラス"""
    
    def __init__(self, settings: ConversionSettings):
        self.settings = settings
    
    def transform(self, file_data_list: List[FileData]) -> List[FileData]:
        """データを変換・正規化"""
        transformed_files = []
        
        for file_data in file_data_list:
            transformed_file = self._transform_file(file_data)
            transformed_files.append(transformed_file)
        
        return transformed_files
    
    def _transform_file(self, file_data: FileData) -> FileData:
        """ファイルデータを変換"""
        transformed_sheets = []
        
        for sheet_data in file_data.sheets:
            transformed_sheet = self._transform_sheet(sheet_data)
            transformed_sheets.append(transformed_sheet)
        
        return FileData(
            filename=file_data.filename,
            sheets=transformed_sheets,
            warnings=file_data.warnings
        )
    
    def _transform_sheet(self, sheet_data) -> Any:
        """シートデータを変換"""
        transformed_items = []
        
        for test_case in sheet_data.items:
            transformed_case = self._transform_test_case(test_case)
            transformed_items.append(transformed_case)
        
        # ID正規化
        if self.settings.force_id_regenerate:
            transformed_items = self._regenerate_ids(transformed_items)
        
        return type(sheet_data)(
            sheet_name=sheet_data.sheet_name,
            items=transformed_items,
            warnings=sheet_data.warnings
        )
    
    def _transform_test_case(self, test_case: TestCase) -> TestCase:
        """テストケースを変換・正規化"""
        # カテゴリ正規化
        normalized_category = self._normalize_category(test_case.category)
        
        # ステップ正規化
        normalized_steps = self._normalize_steps(test_case.steps)
        
        # 文字列正規化
        normalized_title = self._normalize_string(test_case.title)
        normalized_type = self._normalize_string(test_case.type)
        normalized_notes = self._normalize_string(test_case.notes)
        
        # 前提条件正規化
        normalized_preconditions = [
            self._normalize_string(cond) for cond in test_case.preconditions
        ]
        
        return TestCase(
            id=test_case.id,
            title=normalized_title,
            category=normalized_category,
            type=normalized_type,
            priority=test_case.priority,
            preconditions=normalized_preconditions,
            steps=normalized_steps,
            notes=normalized_notes,
            source=test_case.source
        )
    
    def _normalize_category(self, category: List[str]) -> List[str]:
        """カテゴリを正規化"""
        if not category:
            return [""] * len(self.settings.category_row.keys)
        
        # 文字列正規化
        normalized = [self._normalize_string(cat) for cat in category]
        
        # 階層数に合わせてパディング
        if self.settings.pad_category_levels:
            while len(normalized) < len(self.settings.category_row.keys):
                normalized.append("")
            normalized = normalized[:len(self.settings.category_row.keys)]
        
        return normalized
    
    def _normalize_steps(self, steps: List) -> List:
        """ステップを正規化"""
        normalized_steps = []
        
        for i, step in enumerate(steps, 1):
            normalized_action = self._normalize_string(step.action)
            normalized_expect = self._normalize_string(step.expect)
            
            # ステップ番号を正規化
            normalized_action = self._normalize_step_number(normalized_action, i)
            
            normalized_steps.append(type(step)(
                num=i,
                action=normalized_action,
                expect=normalized_expect
            ))
        
        return normalized_steps
    
    def _normalize_string(self, text: str) -> str:
        """文字列を正規化"""
        if not text:
            return ""
        
        # 空白トリム
        if self.settings.trim_whitespaces:
            text = text.strip()
        
        # 全角数字正規化
        if self.settings.normalize_zenkaku_numbers:
            text = self._normalize_zenkaku_numbers(text)
        
        return text
    
    def _normalize_zenkaku_numbers(self, text: str) -> str:
        """全角数字を半角に正規化"""
        # 全角数字を半角に変換
        zenkaku_to_hankaku = {
            '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
            '５': '5', '６': '6', '７': '7', '８': '8', '９': '9'
        }
        
        for zenkaku, hankaku in zenkaku_to_hankaku.items():
            text = text.replace(zenkaku, hankaku)
        
        return text
    
    def _normalize_step_number(self, text: str, step_num: int) -> str:
        """ステップ番号を正規化"""
        if not text:
            return f"{step_num}{self.settings.step_number_delimiter} "
        
        # 既存の番号パターンを検索
        pattern = r'^[\d０-９]+[\.:：．、]\s*'
        match = re.match(pattern, text)
        
        if match:
            # 既存の番号を置換
            return f"{step_num}{self.settings.step_number_delimiter} {text[match.end():].strip()}"
        else:
            # 番号を追加
            return f"{step_num}{self.settings.step_number_delimiter} {text}"
    
    def _regenerate_ids(self, test_cases: List[TestCase]) -> List[TestCase]:
        """IDを再生成"""
        regenerated_cases = []
        
        for i, test_case in enumerate(test_cases, 1):
            new_id = f"{self.settings.id_prefix}-{i:0{self.settings.id_padding}d}"
            
            regenerated_cases.append(TestCase(
                id=new_id,
                title=test_case.title,
                category=test_case.category,
                type=test_case.type,
                preconditions=test_case.preconditions,
                steps=test_case.steps,
                notes=test_case.notes,
                source=test_case.source
            ))
        
        return regenerated_cases
    
    def compress_category_display(self, test_cases: List[TestCase]) -> List[TestCase]:
        """カテゴリ表示を圧縮"""
        if not self.settings.category_display_compress:
            return test_cases
        
        compressed_cases = []
        last_category = None
        
        for test_case in test_cases:
            compressed_category = []
            current_category = test_case.category
            
            for i, cat in enumerate(current_category):
                if i == 0 or cat != last_category[i] if last_category and i < len(last_category) else True:
                    compressed_category.append(cat)
                else:
                    compressed_category.append("")
            
            compressed_cases.append(TestCase(
                id=test_case.id,
                title=test_case.title,
                category=compressed_category,
                type=test_case.type,
                preconditions=test_case.preconditions,
                steps=test_case.steps,
                notes=test_case.notes,
                source=test_case.source
            ))
            
            last_category = current_category
        
        return compressed_cases
