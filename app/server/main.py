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
    OutputFormat, SplitMode
)
from .settings import settings_manager
from .excel_reader import ExcelReader
from .transform import DataTransformer
from .renderers.yaml_renderer import YamlRenderer
from .renderers.md_renderer import MarkdownRenderer

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
        logger.error(f"設定保存エラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/config/profiles")
async def list_config_profiles():
    """設定プロファイル一覧を取得"""
    profiles = settings_manager.list_profiles()
    return {"profiles": profiles}


@app.post("/api/convert", response_model=ConversionResult)
async def convert_files(
    files: List[UploadFile] = File(...),
    settings_json: str = Form(...)
):
    """ファイル変換"""
    try:
        # 設定解析
        import json
        settings_data = json.loads(settings_json)
        settings = ConversionSettings.model_validate(settings_data)
        
        # ファイル数制限チェック
        if len(files) > 20:
            raise HTTPException(status_code=400, detail="同時アップロードは最大20ファイルまでです")
        
        # 総サイズチェック（100MB制限）
        total_size = sum(file.size or 0 for file in files)
        if total_size > 100 * 1024 * 1024:  # 100MB
            raise HTTPException(status_code=400, detail="総ファイルサイズが100MBを超えています")
        
        # Excel読み取り
        excel_reader = ExcelReader(settings)
        file_data_list = []
        
        for file in files:
            if not file.filename.endswith(('.xlsx', '.xls')):
                continue
                
            try:
                # ファイル内容をメモリに読み込み
                content = await file.read()
                
                # メモリ上でExcel読み取り（一時ファイルを使用しない）
                file_data = excel_reader.read_file(content, file.filename)
                file_data_list.append(file_data)
                
            except Exception as e:
                logger.error(f"ファイル {file.filename} の読み取りエラー: {e}")
                continue
        
        # データ変換
        transformer = DataTransformer(settings)
        transformed_data = transformer.transform(file_data_list)
        
        # レンダリング
        if settings.output_format == OutputFormat.YAML:
            renderer = YamlRenderer(settings)
        else:
            renderer = MarkdownRenderer(settings)
        
        rendered_text = renderer.render(transformed_data)
        
        # 結果作成
        result = ConversionResult(
            files=transformed_data,
            output_format=settings.output_format,
            rendered_text=rendered_text,
            warnings=[]
        )
        
        # キャッシュに保存（ダウンロード用）
        import uuid
        cache_key = str(uuid.uuid4())
        conversion_cache[cache_key] = {
            'result': result,
            'settings': settings
        }
        
        # キャッシュキーを結果に追加
        result_dict = result.model_dump()
        result_dict['cache_key'] = cache_key
        
        return result_dict
        
    except Exception as e:
        logger.error(f"変換エラー: {e}")
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
        logger.error(f"ダウンロードエラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
