"""
FastAPI メインアプリケーション
"""
import logging
import tempfile
import zipfile
from pathlib import Path
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    ConversionSettings, ConversionResult, ErrorResponse, HealthResponse,
    OutputFormat, SplitMode, FileData
)
from .settings import settings_manager
from .excel_reader import ExcelReader
from .transform import DataTransformer
from .renderers.yaml_renderer import YamlRenderer
from .renderers.md_renderer import MarkdownRenderer
from .i18n import i18n_manager, get_string, set_language, get_current_language, get_available_languages

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# FastAPIアプリケーション作成
app = FastAPI(
    title="テストケース変換ツール",
    description="Excel形式のテストケースをMarkdown/YAMLに変換するツール",
    version="1.0.0"
)

# CORS設定（localhostのみ許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:*", "http://127.0.0.1:*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静的ファイル配信
app.mount("/static", StaticFiles(directory="app/web"), name="static")

# グローバル変数（変換結果の一時保存）
conversion_cache: dict = {}


@app.get("/", response_class=FileResponse)
async def root():
    """ルートページ"""
    return FileResponse("app/web/index.html")


@app.get("/api/healthz", response_model=HealthResponse)
async def health_check():
    """ヘルスチェック"""
    return HealthResponse()


@app.get("/api/config/defaults", response_model=ConversionSettings)
async def get_default_config():
    """デフォルト設定を取得"""
    return settings_manager.get_default_settings()


@app.post("/api/config/save")
async def save_config(
    settings_json: str = Form(...),
    profile_name: str = Form(default="default")
):
    """設定を保存"""
    try:
        import json
        settings_data = json.loads(settings_json)
        settings = ConversionSettings.model_validate(settings_data)
        settings_manager.save_settings(settings, profile_name)
        return {"status": "success", "message": f"設定を {profile_name} として保存しました"}
    except Exception as e:
        logger.error(f"Settings save error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/config/profiles")
async def list_config_profiles():
    """設定プロファイル一覧を取得"""
    profiles = settings_manager.list_profiles()
    return {"profiles": profiles}


@app.get("/api/i18n/languages")
async def get_languages():
    """利用可能な言語一覧を取得"""
    return {"languages": get_available_languages()}


@app.get("/api/i18n/current")
async def get_current_lang():
    """現在の言語を取得"""
    return {"language": get_current_language()}


@app.post("/api/i18n/set")
async def set_lang(language: str = Form(...)):
    """言語を設定"""
    try:
        set_language(language)
        return {"status": "success", "language": get_current_language()}
    except Exception as e:
        logger.error(f"Language setting error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/i18n/strings")
async def get_strings():
    """現在の言語の文字列を取得"""
    return {
        "output": i18n_manager.get_output_strings()
    }


@app.post("/api/convert", response_model=ConversionResult)
async def convert_files(
    files: List[UploadFile] = File(...),
    settings_json: str = Form(...),
    language: str = Form(default="ja")
):
    """ファイル変換"""
    try:
        # 言語設定
        logger.info(f"Received language parameter: {language}")
        set_language(language)
        logger.info(f"Current language after setting: {get_current_language()}")
        logger.info(f"Test string (category): {get_string('output.category')}")
        
        # 設定解析
        import json
        settings_data = json.loads(settings_json)
        
        # 設定を直接使用（フラット構造）
        settings = ConversionSettings.model_validate(settings_data)
        
        # ファイル数制限チェック
        if len(files) > 20:
            raise HTTPException(status_code=400, detail="同時アップロードは最大20ファイルまでです")
        
        # 総サイズチェック（400MB制限）
        total_size = sum(file.size or 0 for file in files)
        if total_size > 400 * 1024 * 1024:  # 400MB
            raise HTTPException(status_code=400, detail="総ファイルサイズが400MBを超えています")
        
        # Excel読み取り（グローバルカウンターを維持するため、1つのインスタンスを使用）
        excel_reader = ExcelReader(settings)
        file_data_list = []
        
        for file in files:
            if not file.filename.endswith(('.xlsx', '.xls')):
                logger.warning(f"Skipping non-Excel file: {file.filename}")
                continue
                
            try:
                # ファイル内容をメモリに読み込み
                content = await file.read()
                
                # ファイルサイズチェック
                if len(content) == 0:
                    logger.warning(f"Empty file: {file.filename}")
                    continue
                
                # メモリ上でExcel読み取り（一時ファイルを使用しない）
                file_data = excel_reader.read_file(content, file.filename)
                file_data_list.append(file_data)
                
                # 警告がある場合はログに記録
                if file_data.warnings:
                    for warning in file_data.warnings:
                        logger.warning(f"File {file.filename}: {warning}")
                
            except Exception as e:
                logger.error(f"File {file.filename} reading error: {e}")
                # エラーが発生したファイルも結果に含める（警告付きで）
                error_file_data = FileData(
                    filename=file.filename,
                    sheets=[],
                    warnings=[f"ファイル読み取りエラー: {str(e)}"]
                )
                file_data_list.append(error_file_data)
        
        # データ変換
        transformer = DataTransformer(settings)
        transformed_data = transformer.transform(file_data_list)
        
        # 変換結果の検証
        total_items = sum(len(sheet.items) for file_data in transformed_data for sheet in file_data.sheets)
        if total_items == 0:
            # 変換結果が空の場合の詳細なエラー情報を提供
            error_details = []
            for file_data in transformed_data:
                if not file_data.sheets:
                    error_details.append(f"ファイル '{file_data.filename}': 対象シートが見つかりません")
                else:
                    for sheet in file_data.sheets:
                        if not sheet.items:
                            error_details.append(f"ファイル '{file_data.filename}' のシート '{sheet.sheet_name}': データが見つかりません")
            
            if error_details:
                error_message = "変換結果が空です。以下の問題を確認してください：\n" + "\n".join(error_details)
            else:
                error_message = "変換結果が空です。設定を確認してください。"
            
            raise HTTPException(status_code=400, detail=error_message)
        
        # レンダリング
        logger.info(f"Creating renderer with current language: {get_current_language()}")
        if settings.output_format == OutputFormat.YAML:
            renderer = YamlRenderer(settings)
        else:
            renderer = MarkdownRenderer(settings)
        
        rendered_text = renderer.render(transformed_data)
        
        # キャッシュキー生成
        import uuid
        cache_key = str(uuid.uuid4())
        
        # 結果作成
        result = ConversionResult(
            files=transformed_data,
            output_format=settings.output_format,
            rendered_text=rendered_text,
            warnings=[],
            cache_key=cache_key
        )
        
        # キャッシュに保存（ダウンロード用）
        conversion_cache[cache_key] = {
            'result': result,
            'settings': settings
        }
        
        return result
        
    except HTTPException:
        # HTTPExceptionはそのまま再発生させる
        raise
    except Exception as e:
        logger.error(f"Conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/download")
async def download_files(
    cache_key: str = Form(...),
    output_format: str = Form(...)
):
    """ファイルダウンロード（ZIP形式）"""
    try:
        if cache_key not in conversion_cache:
            raise HTTPException(status_code=404, detail="変換結果が見つかりません")
        
        cache_data = conversion_cache[cache_key]
        result = cache_data['result']
        settings = cache_data['settings']
        
        # 出力形式を更新
        settings.output_format = OutputFormat(output_format)
        
        # 再レンダリング
        if settings.output_format == OutputFormat.YAML:
            renderer = YamlRenderer(settings)
        else:
            renderer = MarkdownRenderer(settings)
        
        rendered_text = renderer.render(result.files)
        
        # ZIPファイル作成
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_zip:
            with zipfile.ZipFile(tmp_zip, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for filename, content in rendered_text.items():
                    zip_file.writestr(filename, content)
            
            # 一時ファイルを返す
            return FileResponse(
                tmp_zip.name,
                media_type='application/zip',
                filename='test_cases.zip',
                background=lambda: Path(tmp_zip.name).unlink()  # レスポンス後に削除
            )
            
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
