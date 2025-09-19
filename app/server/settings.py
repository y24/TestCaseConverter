"""
設定管理
"""
import json
from pathlib import Path
from typing import Dict, Any
from .models import ConversionSettings


class SettingsManager:
    """設定管理クラス"""
    
    def __init__(self, config_dir: Path = None):
        if config_dir is None:
            config_dir = Path("config")
        self.config_dir = config_dir
        self.config_dir.mkdir(exist_ok=True)
        self.default_config_path = self.config_dir / "default.json"
    
    def get_default_settings(self) -> ConversionSettings:
        """デフォルト設定を取得"""
        return ConversionSettings()
    
    def save_settings(self, settings: ConversionSettings, profile_name: str = "default") -> None:
        """設定を保存"""
        config_path = self.config_dir / f"{profile_name}.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(settings.model_dump(), f, ensure_ascii=False, indent=2)
    
    def load_settings(self, profile_name: str = "default") -> ConversionSettings:
        """設定を読み込み"""
        config_path = self.config_dir / f"{profile_name}.json"
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return ConversionSettings.model_validate(data)
        return self.get_default_settings()
    
    def list_profiles(self) -> list[str]:
        """プロファイル一覧を取得"""
        profiles = []
        for config_file in self.config_dir.glob("*.json"):
            profiles.append(config_file.stem)
        return profiles


# グローバル設定マネージャー
settings_manager = SettingsManager()
