// 実行時設定を管理するユーティリティ
import { getEnvVar } from './envUtils';

// 型定義
interface RuntimeConfig {
  API_BASE_URL: string;
  CLASS_API_URL: string;
  SHOW_FOOTER: boolean;
  DEBUG_DATETIME: string | null;
  WINDOW_SCALE: number;
}

// グローバル定義
declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      API_BASE_URL?: string;
      SHOW_FOOTER?: string;
      DEBUG_DATETIME?: string;
      WINDOW_SCALE?: string;
    };
  }
}

// 設定のキャッシュ
let runtimeConfig: RuntimeConfig | null = null;

/**
 * 実行時設定を取得する
 */
export const getConfig = async (): Promise<RuntimeConfig> => {
  if (runtimeConfig !== null) {
    return runtimeConfig;
  }

  // デフォルト値
  runtimeConfig = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://api:3000',
    CLASS_API_URL: (await getEnvVar('CLASS_API_URL')) || import.meta.env.VITE_CLASS_API_URL || '',
    SHOW_FOOTER: import.meta.env.VITE_SHOW_FOOTER !== 'false',
    DEBUG_DATETIME: import.meta.env.VITE_DEBUG_DATETIME || null,
    WINDOW_SCALE: Number(import.meta.env.VITE_WINDOW_SCALE) || 2
  };

  // ブラウザ環境で実行時設定があれば上書き
  if (typeof window !== 'undefined' && window.RUNTIME_CONFIG) {
    const { RUNTIME_CONFIG } = window;

    if (RUNTIME_CONFIG.API_BASE_URL) {
      runtimeConfig.API_BASE_URL = RUNTIME_CONFIG.API_BASE_URL;
    }

    if (RUNTIME_CONFIG.SHOW_FOOTER !== undefined) {
      runtimeConfig.SHOW_FOOTER = RUNTIME_CONFIG.SHOW_FOOTER.toLowerCase() === 'true';
    }

    if (RUNTIME_CONFIG.DEBUG_DATETIME) {
      runtimeConfig.DEBUG_DATETIME = RUNTIME_CONFIG.DEBUG_DATETIME;
    }

    if (RUNTIME_CONFIG.WINDOW_SCALE) {
      const scale = Number(RUNTIME_CONFIG.WINDOW_SCALE);
      if (!isNaN(scale) && scale > 0) {
        runtimeConfig.WINDOW_SCALE = scale;
      }
    }
  }

  return runtimeConfig;
};

// 便利なアクセサ関数
export const getApiBaseUrl = async (): Promise<string> => (await getConfig()).API_BASE_URL;
export const getClassApiUrl = async (): Promise<string> => (await getConfig()).CLASS_API_URL;
export const getShowFooter = async (): Promise<boolean> => (await getConfig()).SHOW_FOOTER;
export const getDebugDatetime = async (): Promise<string | null> => (await getConfig()).DEBUG_DATETIME;
export const getWindowScale = async (): Promise<number> => (await getConfig()).WINDOW_SCALE;

/**
 * 現在時刻を取得（デバッグモードでは固定時刻）
 */
export const getCurrentDateTime = async (): Promise<Date> => {
  const debugDatetime = await getDebugDatetime();
  if (debugDatetime) {
    try {
      return new Date(debugDatetime);
    } catch (e) {
      console.warn('無効な日時フォーマット:', debugDatetime);
    }
  }
  return new Date();
};