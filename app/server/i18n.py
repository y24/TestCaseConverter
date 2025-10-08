"""
多言語対応（国際化）機能
"""
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class I18nManager:
    """多言語対応管理クラス"""
    
    def __init__(self, strings_file_path: str = "config/strings.json"):
        self.strings_file_path = Path(strings_file_path)
        self._strings: Dict[str, Dict[str, Any]] = {}
        self._current_language = "ja"  # デフォルトは日本語
        self._load_strings()
    
    def _load_strings(self):
        """文字列ファイルを読み込み"""
        try:
            if self.strings_file_path.exists():
                with open(self.strings_file_path, 'r', encoding='utf-8') as f:
                    self._strings = json.load(f)
                logger.info(f"Loaded strings from {self.strings_file_path}")
            else:
                logger.warning(f"Strings file not found: {self.strings_file_path}")
                self._strings = {}
        except Exception as e:
            logger.error(f"Failed to load strings file: {e}")
            self._strings = {}
    
    def set_language(self, language: str):
        """言語を設定"""
        if language in self._strings:
            self._current_language = language
            logger.info(f"Language set to: {language}")
        else:
            logger.warning(f"Language not supported: {language}, falling back to ja")
            self._current_language = "ja"
    
    def get_language(self) -> str:
        """現在の言語を取得"""
        return self._current_language
    
    def get_available_languages(self) -> list:
        """利用可能な言語のリストを取得"""
        return list(self._strings.keys())
    
    def get_string(self, key: str, default: str = None, **kwargs) -> str:
        """
        文字列を取得
        
        Args:
            key: 文字列のキー（例: "ui.app_title"）
            default: デフォルト値
            **kwargs: 文字列フォーマット用のパラメータ
        
        Returns:
            翻訳された文字列
        """
        try:
            # キーをドット記法で分割
            keys = key.split('.')
            value = self._strings.get(self._current_language, {})
            
            # ネストしたキーを辿る
            for k in keys:
                if isinstance(value, dict) and k in value:
                    value = value[k]
                else:
                    # キーが見つからない場合はデフォルト言語（ja）を試す
                    if self._current_language != "ja":
                        value = self._strings.get("ja", {})
                        for k in keys:
                            if isinstance(value, dict) and k in value:
                                value = value[k]
                            else:
                                value = default or key
                                break
                    else:
                        value = default or key
                    break
            
            # 文字列フォーマット
            if isinstance(value, str) and kwargs:
                try:
                    value = value.format(**kwargs)
                except (KeyError, ValueError) as e:
                    logger.warning(f"String formatting failed for key '{key}': {e}")
            
            return value
            
        except Exception as e:
            logger.error(f"Failed to get string for key '{key}': {e}")
            return default or key
    
    def get_output_strings(self) -> Dict[str, str]:
        """出力用の文字列をすべて取得"""
        return self._strings.get(self._current_language, {}).get("output", {})


# グローバルインスタンス
i18n_manager = I18nManager()


def get_string(key: str, default: str = None, **kwargs) -> str:
    """文字列取得の便利関数"""
    return i18n_manager.get_string(key, default, **kwargs)


def set_language(language: str):
    """言語設定の便利関数"""
    i18n_manager.set_language(language)


def get_current_language() -> str:
    """現在の言語取得の便利関数"""
    return i18n_manager.get_language()


def get_available_languages() -> list:
    """利用可能な言語取得の便利関数"""
    return i18n_manager.get_available_languages()
