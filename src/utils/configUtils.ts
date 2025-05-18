// 実行時設定を一元管理するためのユーティリティ

// 型定義
interface RuntimeConfig {
  API_BASE_URL: string;
  SHOW_FOOTER: boolean;
  DEBUG_DATETIME?: string | null;
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

// デフォルト値
const defaultConfig: RuntimeConfig = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  SHOW_FOOTER: import.meta.env.VITE_SHOW_FOOTER !== 'false',
  DEBUG_DATETIME: import.meta.env.VITE_DEBUG_DATETIME || null
};

// 設定のキャッシュ
let runtimeConfig: RuntimeConfig | null = null;

/**
 * 実行時設定を取得する
 */
export const getConfig = (): RuntimeConfig => {
  if (runtimeConfig !== null) {
    return runtimeConfig;
  }
  
  // 実行時設定を初期化
  runtimeConfig = { ...defaultConfig };
  
  // ブラウザ環境で実行時に設定された値があれば上書き
  if (typeof window !== 'undefined' && window.RUNTIME_CONFIG) {
    if (window.RUNTIME_CONFIG.API_BASE_URL) {
      runtimeConfig.API_BASE_URL = window.RUNTIME_CONFIG.API_BASE_URL;
    }
    
    if (window.RUNTIME_CONFIG.SHOW_FOOTER !== undefined) {
      runtimeConfig.SHOW_FOOTER = window.RUNTIME_CONFIG.SHOW_FOOTER.toLowerCase() === 'true';
    }
    
    if (window.RUNTIME_CONFIG.DEBUG_DATETIME) {
      runtimeConfig.DEBUG_DATETIME = window.RUNTIME_CONFIG.DEBUG_DATETIME;
    }
  }
  
  return runtimeConfig;
};

/**
 * APIのベースURLを取得する
 */
export const getApiBaseUrl = (): string => {
  return getConfig().API_BASE_URL;
};

/**
 * フッターの表示設定を取得する
 */
export const getShowFooter = (): boolean => {
  return getConfig().SHOW_FOOTER;
};

/**
 * デバッグ用の日時設定を取得する
 */
export const getDebugDatetime = (): string | null => {
  return getConfig().DEBUG_DATETIME || null;
};

/**
 * 現在時刻を取得する（デバッグモードでは固定時刻を返す）
 */
export const getCurrentDateTime = (): Date => {
  const debugDatetime = getDebugDatetime();
  if (debugDatetime) {
    try {
      return new Date(debugDatetime);
    } catch (e) {
      console.warn('無効なデバッグ日時フォーマット:', debugDatetime);
    }
  }
  return new Date();
};