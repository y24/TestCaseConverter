"""
Excel読み取り機能
"""
import re
import logging
import io
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Union
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

from .models import (
    ConversionSettings, FileData, SheetData, TestCase
)

logger = logging.getLogger(__name__)


class ExcelReader:
    """Excel読み取りクラス"""
    
    def __init__(self, settings: ConversionSettings):
        self.settings = settings
        self.global_test_case_counter = (settings.id_start_number or 1) - 1  # グローバルなテストケースカウンター（開始番号-1で初期化）
    
    def read_file(self, file_source: Union[Path, bytes], filename: str) -> FileData:
        """Excelファイルを読み取り（ファイルパスまたはバイトデータから）"""
        workbook = None
        try:
            # ファイルサイズ確認
            if isinstance(file_source, Path):
                # ファイルパスから読み取り
                if not file_source.exists():
                    logger.error(f"File does not exist: {file_source}")
                    return FileData(
                        filename=filename,
                        sheets=[],
                        warnings=[f"ファイルが存在しません: {file_source}"]
                    )
                
                file_size = file_source.stat().st_size
                if file_size == 0:
                    logger.error(f"File is empty: {file_source}")
                    return FileData(
                        filename=filename,
                        sheets=[],
                        warnings=[f"ファイルが空です: {file_source}"]
                    )
                
                logger.info(f"Excel file reading started: {filename} (size: {file_size} bytes)")
                
                # ファイル形式の事前チェック
                if not self._is_valid_excel_file(file_source):
                    logger.error(f"Invalid Excel file format: {filename}")
                    return FileData(
                        filename=filename,
                        sheets=[],
                        warnings=[f"無効なExcelファイル形式です: {filename}"]
                    )
                
                workbook = load_workbook(file_source, data_only=True)
                
            else:
                # バイトデータから読み取り
                if len(file_source) == 0:
                    logger.error(f"File is empty: {filename}")
                    return FileData(
                        filename=filename,
                        sheets=[],
                        warnings=[f"ファイルが空です: {filename}"]
                    )
                
                logger.info(f"Excel file reading started: {filename} (size: {len(file_source)} bytes)")
                
                # バイトデータの形式チェック
                if not self._is_valid_excel_bytes(file_source):
                    logger.error(f"Invalid Excel file format: {filename}")
                    return FileData(
                        filename=filename,
                        sheets=[],
                        warnings=[f"無効なExcelファイル形式です: {filename}"]
                    )
                
                workbook = load_workbook(io.BytesIO(file_source), data_only=True)
            
            sheets_data = []
            file_warnings = []
            
            # 対象シートを検索
            target_sheets = self._find_target_sheets(workbook)
            
            if not target_sheets:
                file_warnings.append("対象シートが見つかりません")
                return FileData(
                    filename=filename,
                    sheets=[],
                    warnings=file_warnings
                )
            
            logger.info(f"Target sheets found: {target_sheets}")
            
            # 各シートを処理
            for sheet_name in target_sheets:
                try:
                    sheet_data = self._read_sheet(workbook[sheet_name], sheet_name)
                    sheets_data.append(sheet_data)
                except Exception as e:
                    logger.error(f"Sheet {sheet_name} reading error: {e}")
                    file_warnings.append(f"シート {sheet_name} の読み取りに失敗: {str(e)}")
            
            logger.info(f"Excel file reading completed: {filename} (sheets: {len(sheets_data)})")
            
            return FileData(
                filename=filename,
                sheets=sheets_data,
                warnings=file_warnings
            )
            
        except PermissionError as e:
            logger.error(f"File {filename} access permission error: {e}")
            return FileData(
                filename=filename,
                sheets=[],
                warnings=[f"ファイルアクセス権限エラー: {str(e)}"]
            )
        except Exception as e:
            logger.error(f"File {filename} reading error: {e}")
            # より詳細なエラー情報を提供
            error_detail = str(e)
            if "could not read worksheets from None" in error_detail:
                error_detail = "Excelファイルの構造が破損しているか、無効なXMLが含まれています。ファイルを再保存してから再度お試しください。"
            elif "Permission denied" in error_detail:
                error_detail = "ファイルが他のアプリケーションで開かれている可能性があります。ファイルを閉じてから再度お試しください。"
            elif "Invalid file format" in error_detail:
                error_detail = "ファイル形式が正しくありません。.xlsxまたは.xlsファイルをアップロードしてください。"
            
            return FileData(
                filename=filename,
                sheets=[],
                warnings=[f"ファイル読み取りエラー: {error_detail}"]
            )
        finally:
            # ワークブックを明示的に閉じる
            if workbook is not None:
                try:
                    workbook.close()
                except Exception as e:
                    logger.warning(f"Workbook close error: {e}")
    
    def _find_target_sheets(self, workbook) -> List[str]:
        """対象シートを検索"""
        target_sheets = []
        
        for sheet_name in workbook.sheetnames:
            # 除外シートチェック
            if sheet_name in self.settings.sheet_search_ignores:
                continue
            
            # 検索キーチェック
            for search_key in self.settings.sheet_search_keys:
                if search_key in sheet_name:
                    target_sheets.append(sheet_name)
                    break
        
        return target_sheets
    
    def _read_sheet(self, worksheet, sheet_name: str) -> SheetData:
        """シートを読み取り"""
        warnings = []
        
        # ヘッダー行を検索
        header_row = self._find_header_row(worksheet)
        if header_row is None:
            warnings.append("ヘッダー行が見つかりません")
            return SheetData(
                sheet_name=sheet_name,
                items=[],
                warnings=warnings
            )
        
        # 列マッピングを取得
        column_mapping = self._get_column_mapping(worksheet, header_row)
        if not column_mapping:
            warnings.append("必須列が見つかりません")
            return SheetData(
                sheet_name=sheet_name,
                items=[],
                warnings=warnings
            )
        
        # データ行を取得
        data_rows = self._get_data_rows(worksheet, header_row, column_mapping)
        
        # テストケースに変換
        test_cases = []
        for row_data in data_rows:
            try:
                test_case = self._create_test_case(row_data, column_mapping, sheet_name)
                if test_case:
                    test_cases.append(test_case)
            except Exception as e:
                logger.error(f"Test case creation error (row {row_data.get('row', '?')}): {e}")
                warnings.append(f"行 {row_data.get('row', '?')} の処理に失敗: {str(e)}")
        
        return SheetData(
            sheet_name=sheet_name,
            items=test_cases,
            warnings=warnings
        )
    
    def _find_header_row(self, worksheet) -> Optional[int]:
        """ヘッダー行を検索"""
        search_col = self.settings.header.search_col
        search_key = self.settings.header.search_key
        
        # 列番号に変換
        if search_col.isalpha():
            col_num = ord(search_col.upper()) - ord('A') + 1
        else:
            col_num = int(search_col)
        
        # 最大50行まで検索
        for row in range(1, min(51, worksheet.max_row + 1)):
            cell_value = worksheet.cell(row=row, column=col_num).value
            if cell_value and search_key in str(cell_value):
                return row
        
        return None
    
    def _get_column_mapping(self, worksheet, header_row: int) -> Dict[str, int]:
        """列マッピングを取得"""
        mapping = {}
        
        # ヘッダー行の各列をチェック
        for col in range(1, worksheet.max_column + 1):
            header_value = worksheet.cell(row=header_row, column=col).value
            if not header_value:
                continue
            
            header_str = str(header_value).strip()
            
            # カテゴリ列の個別マッピング
            for i, category_key in enumerate(self.settings.category_row.keys):
                if category_key in header_str:
                    mapping[f'category_{i}'] = col
                    break
            
            # その他の設定のキーと照合
            configs = [
                ('step', self.settings.step_row),
                ('tobe', self.settings.tobe_row),
                ('test_type', self.settings.test_type_row),
                ('priority', self.settings.priority_row),
                ('precondition', self.settings.precondition_row),
                ('note', self.settings.note_row),
            ]
            
            for config_name, config in configs:
                for key in config.keys:
                    if key in header_str:
                        # 除外チェック
                        should_exclude = False
                        for ignore_key in config.ignores:
                            if ignore_key in header_str:
                                should_exclude = True
                                break
                        
                        if not should_exclude:
                            mapping[config_name] = col
                            break
        
        return mapping
    
    
    def _get_data_rows(self, worksheet, header_row: int, column_mapping: Dict[str, int]) -> List[Dict]:
        """データ行を取得"""
        data_rows = []
        
        # 期待結果列の最後の行を検索
        end_row = self._find_end_row(worksheet, column_mapping.get('tobe', 1))
        
        # カテゴリのforward fill用のバッファ
        last_category_values = [""] * len(self.settings.category_row.keys)
        
        # データ行を取得
        for row in range(header_row + 1, end_row + 1):
            row_data = {'row': row}
            
            # 各列の値を取得
            for col_name, col_num in column_mapping.items():
                cell_value = worksheet.cell(row=row, column=col_num).value
                if cell_value is not None:
                    # セル値を文字列に変換し、前後の空白を削除
                    cell_str = str(cell_value)
                    # 各種改行文字を統一
                    import re
                    cell_str = re.sub(r'\r\n|\r', '\n', cell_str)
                    row_data[col_name] = cell_str.strip()
                else:
                    row_data[col_name] = ""
            
            # カテゴリを統合
            category_values = []
            for i in range(len(self.settings.category_row.keys)):
                category_key = f'category_{i}'
                if category_key in row_data:
                    category_values.append(row_data[category_key])
                else:
                    category_values.append("")
            
            # Forward fill処理
            if self.settings.forward_fill_category:
                category_values = self._forward_fill_category(category_values, last_category_values)
            
            row_data['category'] = category_values
            
            # 期待結果が空でない行のみ追加
            if row_data.get('tobe', '').strip():
                data_rows.append(row_data)
                # 有効な行の場合のみ、カテゴリバッファを更新
                last_category_values = category_values.copy()
        
        return data_rows
    
    def _find_end_row(self, worksheet, tobe_col: int) -> int:
        """期待結果列の最後の行を検索"""
        # ヘッダー行を取得
        header_row = self._find_header_row(worksheet)
        if header_row is None:
            return 1
        
        end_row = header_row + 1
        
        # 下から上に検索
        for row in range(worksheet.max_row, header_row, -1):
            cell_value = worksheet.cell(row=row, column=tobe_col).value
            if cell_value and str(cell_value).strip():
                end_row = row
                break
        
        return end_row
    
    def _forward_fill_category(self, current_category: List[str], last_category: List[str]) -> List[str]:
        """カテゴリの空の値を前の行から埋める（独立ブランチ対応）"""
        filled_category = []
        
        # 左側のカテゴリが変わったかどうかをチェック
        independent_branch = False
        for i, current_value in enumerate(current_category):
            if current_value.strip():  # 現在の値が空でない場合
                filled_category.append(current_value)
                # このレベルで値が変わった場合、それより右側は独立ブランチ
                if i < len(last_category) and current_value != last_category[i]:
                    independent_branch = True
            else:  # 現在の値が空の場合
                if independent_branch:
                    # 独立ブランチの場合は空のまま
                    filled_category.append("")
                else:
                    # 通常の場合は前の行の値を使用
                    if i < len(last_category):
                        filled_category.append(last_category[i])
                    else:
                        filled_category.append("")
        
        # 独立ブランチが発生した場合、残りの要素も空にする
        while len(filled_category) < len(current_category):
            filled_category.append("")
        
        return filled_category
    
    def _create_test_case(self, row_data: Dict, column_mapping: Dict[str, int], sheet_name: str) -> Optional[TestCase]:
        """テストケースを作成"""
        # カテゴリを取得（既にリスト形式で統合済み）
        category = row_data.get('category', [])
        
        # 手順を文字列として取得（前後の空白を削除、連続する改行を単一の改行に正規化）
        steps = self._normalize_multiline_text(row_data.get('step', ''))
        
        # 期待結果を文字列として取得（前後の空白を削除、連続する改行を単一の改行に正規化）
        expect = self._normalize_multiline_text(row_data.get('tobe', ''))
        
        # 前提条件を文字列として取得（前後の空白を削除、連続する改行を単一の改行に正規化）
        preconditions = self._normalize_multiline_text(row_data.get('precondition', ''))
        
        # タイトルを文字列として取得（前後の空白を削除、連続する改行を単一の改行に正規化）
        title = self._normalize_multiline_text(row_data.get('title', ''))
        
        # テストケースIDを生成（グローバルカウンターを使用して通しの連番）
        self.global_test_case_counter += 1
        test_id = f"{self.settings.id_prefix}-{self.global_test_case_counter:0{self.settings.id_padding}d}"
        
        return TestCase(
            id=test_id,
            title=title,
            category=category,
            type=row_data.get('test_type', ''),
            priority=row_data.get('priority', ''),
            preconditions=preconditions,
            steps=steps,
            expect=expect,
            notes=row_data.get('note', ''),
            source={
                'file': sheet_name,
                'sheet': sheet_name,
                'row': row_data['row']
            }
        )
    
    
    
    
    def _normalize_multiline_text(self, text: str) -> str:
        """複数行テキストを正規化（余計な空白行を削除）"""
        if not text:
            return ""
        
        # 前後の空白を削除
        text = text.strip()
        
        # 各種改行文字を統一（\r\n, \r, \n を \n に統一）
        import re
        text = re.sub(r'\r\n|\r', '\n', text)
        
        # 改行で分割
        lines = text.split('\n')
        
        # 各行の前後の空白を削除し、空行を除去
        normalized_lines = []
        for line in lines:
            line = line.strip()
            if line:  # 空行でない場合のみ追加
                normalized_lines.append(line)
        
        # 正規化された行を結合
        result = '\n'.join(normalized_lines)
        
        return result
    
    def _is_valid_excel_file(self, file_path: Path) -> bool:
        """Excelファイルの形式を検証（ファイルパス版）"""
        try:
            # ファイルの先頭バイトをチェック
            with open(file_path, 'rb') as f:
                header = f.read(8)
                # ZIPファイルのマジックナンバー（ExcelファイルはZIPベース）
                if header[:4] == b'PK\x03\x04':
                    return True
                # 古いExcel形式のマジックナンバー
                elif header[:8] == b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1':
                    return True
                return False
        except Exception:
            return False
    
    def _is_valid_excel_bytes(self, file_bytes: bytes) -> bool:
        """Excelファイルの形式を検証（バイトデータ版）"""
        try:
            if len(file_bytes) < 8:
                return False
            
            # ZIPファイルのマジックナンバー（ExcelファイルはZIPベース）
            if file_bytes[:4] == b'PK\x03\x04':
                return True
            # 古いExcel形式のマジックナンバー
            elif file_bytes[:8] == b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1':
                return True
            return False
        except Exception:
            return False
    
    
