"""
データモデル定義
"""
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


class OutputFormat(str, Enum):
    """出力形式"""
    YAML = "yaml"
    MARKDOWN = "markdown"


class SplitMode(str, Enum):
    """分割モード"""
    PER_SHEET = "per_sheet"
    PER_CATEGORY = "per_category"
    PER_CASE = "per_case"


class ColumnConfig(BaseModel):
    """列設定"""
    keys: List[str] = Field(default_factory=list, description="検索キー")
    ignores: List[str] = Field(default_factory=list, description="除外キー")


class HeaderConfig(BaseModel):
    """ヘッダー設定"""
    search_col: str = Field(default="A", description="検索列")
    search_key: str = Field(default="#", description="検索キー")


class ConversionSettings(BaseModel):
    """変換設定"""
    output_format: OutputFormat = Field(default=OutputFormat.MARKDOWN)
    split_mode: SplitMode = Field(default=SplitMode.PER_SHEET)
    id_prefix: str = Field(default="TC", description="IDプレフィックス")
    id_padding: int = Field(default=3, description="ID桁数")
    id_start_number: int = Field(default=1, description="ID開始番号")
    force_id_regenerate: bool = Field(default=False, description="ID強制再生成")
    
    # シート設定
    sheet_search_keys: List[str] = Field(default_factory=lambda: ["テスト項目"])
    sheet_search_ignores: List[str] = Field(default_factory=list)
    
    # ヘッダー設定
    header: HeaderConfig = Field(default_factory=HeaderConfig)
    
    # 列設定
    category_row: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["大項目", "中項目", "小項目1", "小項目2"]))
    step_row: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["手順"]))
    tobe_row: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["期待結果"]))
    test_type_row: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["テスト種別"]))
    priority_row: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["優先度"]))
    precondition_row: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["前提条件"]))
    note_row: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["備考", "補足情報"]))
    
    # 新しいセル設定
    backlog_id_cell: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["案件チケットID"]))
    test_type_cell: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["テスト種別", "テストフェーズ"]))
    test_target_cell: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["テスト対象(機能/モジュール)", "対象モジュール"]))
    target_version_cell: ColumnConfig = Field(default_factory=lambda: ColumnConfig(keys=["テスト対象バージョン", "対象バージョン"]))
    
    # 処理設定
    trim_whitespaces: bool = Field(default=True, description="空白トリム")
    normalize_zenkaku_numbers: bool = Field(default=True, description="全角数字正規化")
    normalize_step_numbers: bool = Field(default=True, description="ステップ数正規化")
    category_display_compress: bool = Field(default=False, description="カテゴリ表示圧縮")
    pad_category_levels: bool = Field(default=True, description="カテゴリレベルパディング")
    forward_fill_category: bool = Field(default=True, description="カテゴリの空の値を前の行から埋める")




class TestCase(BaseModel):
    """テストケース"""
    id: str = Field(description="テストケースID")
    title: str = Field(default="", description="タイトル")
    category: List[str] = Field(description="カテゴリ階層")
    type: str = Field(default="", description="テスト種別")
    priority: str = Field(default="", description="優先度")
    preconditions: str = Field(default="", description="前提条件")
    steps: str = Field(description="テストステップ")
    expect: str = Field(default="", description="期待結果")
    notes: str = Field(default="", description="備考")
    source: Dict[str, Any] = Field(description="ソース情報")
    
    # 新しいフィールド
    backlog_id: str = Field(default="", description="Backlog ID")
    test_type: str = Field(default="", description="テストタイプ")
    test_target: str = Field(default="", description="テスト対象")
    target_version: str = Field(default="", description="対象バージョン")


class SheetData(BaseModel):
    """シートデータ"""
    sheet_name: str = Field(description="シート名")
    items: List[TestCase] = Field(description="テストケース一覧")
    warnings: List[str] = Field(default_factory=list, description="警告一覧")
    a1_cell_value: str = Field(default="", description="A1セルの値（タイトル用）")


class FileData(BaseModel):
    """ファイルデータ"""
    filename: str = Field(description="ファイル名")
    sheets: List[SheetData] = Field(description="シート一覧")
    warnings: List[str] = Field(default_factory=list, description="ファイルレベル警告")


class ConversionResult(BaseModel):
    """変換結果"""
    files: List[FileData] = Field(description="ファイル一覧")
    output_format: OutputFormat = Field(description="出力形式")
    rendered_text: Dict[str, str] = Field(description="レンダリング結果（ファイル名: 内容）")
    warnings: List[str] = Field(default_factory=list, description="全体警告")
    cache_key: Optional[str] = Field(default=None, description="キャッシュキー（ダウンロード用）")


class ErrorResponse(BaseModel):
    """エラーレスポンス"""
    error: str = Field(description="エラーメッセージ")
    detail: Optional[str] = Field(default=None, description="詳細情報")


class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""
    status: str = Field(default="ok")
    version: str = Field(default="1.0.0")
