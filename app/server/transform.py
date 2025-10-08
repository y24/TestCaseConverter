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
        self.global_test_case_counter = 0  # グローバルなテストケースカウンター
    
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
        
        # ID正規化（設定で有効な場合のみ実行）
        if self.settings.force_id_regenerate:
            transformed_items = self._regenerate_ids(transformed_items)
        
        return type(sheet_data)(
            sheet_name=sheet_data.sheet_name,
            items=transformed_items,
            warnings=sheet_data.warnings,
            a1_cell_value=sheet_data.a1_cell_value
        )
    
    def _transform_test_case(self, test_case: TestCase) -> TestCase:
        """テストケースを変換・正規化"""
        # カテゴリ正規化
        normalized_category = self._normalize_category(test_case.category)
        
        # ステップ正規化
        if self.settings.normalize_step_numbers and test_case.steps:
            # 改行で分割してリストに変換
            step_lines = [line.strip() for line in test_case.steps.split('\n') if line.strip()]
            if step_lines:
                # ステップ数正規化を適用
                normalized_step_lines = self.normalize_step_numbers(step_lines)
                normalized_steps = '\n'.join(normalized_step_lines)
            else:
                normalized_steps = test_case.steps
        else:
            # ステップ数正規化が無効な場合は通常の文字列正規化のみ
            normalized_steps = self._normalize_string(test_case.steps)
        
        # 期待結果正規化（文字列として処理）
        normalized_expect = self._normalize_string(test_case.expect)
        
        # 文字列正規化
        normalized_title = self._normalize_string(test_case.title)
        normalized_type = self._normalize_string(test_case.type)
        normalized_notes = self._normalize_string(test_case.notes)
        
        # 前提条件正規化（文字列として処理）
        normalized_preconditions = self._normalize_string(test_case.preconditions)
        
        # 新しいフィールドの正規化
        normalized_backlog_id = self._normalize_string(test_case.backlog_id)
        normalized_test_type = self._normalize_string(test_case.test_type)
        normalized_test_target = self._normalize_string(test_case.test_target)
        normalized_target_version = self._normalize_string(test_case.target_version)
        
        # テスト環境の正規化
        normalized_test_environments = [self._normalize_string(env) for env in test_case.test_environments if self._normalize_string(env)]
        
        
        return TestCase(
            id=test_case.id,
            title=normalized_title,
            category=normalized_category,
            type=normalized_type,
            priority=test_case.priority,
            preconditions=normalized_preconditions,
            steps=normalized_steps,
            expect=normalized_expect,
            notes=normalized_notes,
            source=test_case.source,
            # 新しいフィールド
            backlog_id=normalized_backlog_id,
            test_type=normalized_test_type,
            test_target=normalized_test_target,
            target_version=normalized_target_version,
            test_environments=normalized_test_environments
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
    
    
    def _normalize_string(self, text: str) -> str:
        """文字列を正規化"""
        if not text:
            return ""
        
        # 空白トリム
        if self.settings.trim_whitespaces:
            text = text.strip()
        
        # 全角英数字正規化
        if self.settings.normalize_zenkaku_alphanumeric:
            text = self._normalize_zenkaku_alphanumeric(text)
        
        return text
    
    def _normalize_zenkaku_alphanumeric(self, text: str) -> str:
        """全角英数字を半角に正規化"""
        # 全角英数字を半角に変換
        zenkaku_to_hankaku = {
            # 全角数字
            '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
            '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
            # 全角英字（大文字）
            'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E',
            'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J',
            'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O',
            'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T',
            'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
            # 全角英字（小文字）
            'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
            'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
            'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
            'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
            'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
            # 全角スペース
            '　': ' '
        }
        
        for zenkaku, hankaku in zenkaku_to_hankaku.items():
            text = text.replace(zenkaku, hankaku)
        
        return text
    
    def normalize_step_numbers(self, steps: List[str], delimiter: str = '.') -> List[str]:
        """
        ステップ配列の先頭が非番号付きならそのまま残し、
        2番目以降を 1<delimiter> 内容 の形式に正規化する。

        :param steps: ステップ文字列のリスト
        :param delimiter: 番号の後に使う区切り文字（デフォルトは '.'）
        :return: 正規化されたステップリスト
        """
        if not steps:
            return []
        
        normalized_steps = []

        # 番号付きステップの判定用正規表現
        step_prefix_re = re.compile(r'^\s*[0-9０-９]{1,2}(?:[\.:、．：]?)\s*')

        # 1つ目の要素の処理
        first = steps[0]
        if step_prefix_re.match(first):
            body = step_prefix_re.sub('', first).strip()
            # 全角英数字正規化を適用
            if self.settings.normalize_zenkaku_alphanumeric:
                body = self._normalize_zenkaku_alphanumeric(body)
            normalized_steps.append(f"1{delimiter} {body}")
            start_index = 1
            step_num = 2
        else:
            # 番号付きでない場合も全角英数字正規化を適用
            if self.settings.normalize_zenkaku_alphanumeric:
                first = self._normalize_zenkaku_alphanumeric(first)
            normalized_steps.append(first)
            start_index = 1
            step_num = 1

        # 2つ目以降
        for step in steps[start_index:]:
            body = step_prefix_re.sub('', step).strip()
            # 全角英数字正規化を適用
            if self.settings.normalize_zenkaku_alphanumeric:
                body = self._normalize_zenkaku_alphanumeric(body)
            normalized_steps.append(f"{step_num}{delimiter} {body}")
            step_num += 1

        return normalized_steps
    
    
    
    def _regenerate_ids(self, test_cases: List[TestCase]) -> List[TestCase]:
        """IDを再生成（グローバルカウンターを使用して通しの連番）"""
        regenerated_cases = []
        
        for test_case in test_cases:
            self.global_test_case_counter += 1
            new_id = f"{self.settings.id_prefix}-{self.global_test_case_counter:0{self.settings.id_padding}d}"
            
            regenerated_cases.append(TestCase(
                id=new_id,
                title=test_case.title,
                category=test_case.category,
                type=test_case.type,
                priority=test_case.priority,
                preconditions=test_case.preconditions,
                steps=test_case.steps,
                expect=test_case.expect,
                notes=test_case.notes,
                source=test_case.source,
                # 新しいフィールド
                backlog_id=test_case.backlog_id,
                test_type=test_case.test_type,
                test_target=test_case.test_target,
                target_version=test_case.target_version,
                test_environments=test_case.test_environments
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
                priority=test_case.priority,
                preconditions=test_case.preconditions,
                steps=test_case.steps,
                expect=test_case.expect,
                notes=test_case.notes,
                source=test_case.source,
                # 新しいフィールド
                backlog_id=test_case.backlog_id,
                test_type=test_case.test_type,
                test_target=test_case.test_target,
                target_version=test_case.target_version,
                test_environments=test_case.test_environments
            ))
            
            last_category = current_category
        
        return compressed_cases
