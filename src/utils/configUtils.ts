// 実行時設定を管理するユーティリティ

// 型定義
interface RuntimeConfig {
  API_BASE_URL: string;
  SHOW_FOOTER: boolean;
  DEBUG_DATETIME: string | null;
}

// グローバル定義
declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      API_BASE_URL?: string;
      SHOW_FOOTER?: string;
      DEBUG_DATETIME?: string;
    };
  }
}

// 設定のキャッシュ
let runtimeConfig: RuntimeConfig | null = null;

/**
 * 実行時設定を取得する
 */
export const getConfig = (): RuntimeConfig => {
  if (runtimeConfig !== null) {
    return runtimeConfig;
  }

  // デフォルト値
  runtimeConfig = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    SHOW_FOOTER: import.meta.env.VITE_SHOW_FOOTER !== 'false',
    DEBUG_DATETIME: import.meta.env.VITE_DEBUG_DATETIME || null
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
  }

  return runtimeConfig;
};

// 便利なアクセサ関数
export const getApiBaseUrl = (): string => getConfig().API_BASE_URL;
export const getShowFooter = (): boolean => getConfig().SHOW_FOOTER;
export const getDebugDatetime = (): string | null => getConfig().DEBUG_DATETIME;

/**
 * 現在時刻を取得（デバッグモードでは固定時刻）
 */
export const getCurrentDateTime = (): Date => {
  const debugDatetime = getDebugDatetime();
  if (debugDatetime) {
    try {
      return new Date(debugDatetime);
    } catch (e) {
      console.warn('無効な日時フォーマット:', debugDatetime);
    }
  }
  return new Date();
};