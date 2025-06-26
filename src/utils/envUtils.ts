import { invoke } from '@tauri-apps/api/core';

// 汎用的な環境変数取得関数
export async function getEnvVar(key: string): Promise<string | null> {
  try {
    // 開発環境では環境変数を優先
    if (import.meta.env.DEV) {
      const devValue = import.meta.env[`VITE_${key}`];
      if (devValue) {
        return devValue;
      }
    }

    // 本番環境またはバックエンドから環境変数を取得
    const value = await invoke<string | null>('get_env_var', { key });
    return value;
  } catch (error) {
    console.error(`Failed to get environment variable ${key}:`, error);
    return null;
  }
}

// 複数の環境変数を一度に取得
export async function getEnvVars(keys: string[]): Promise<Record<string, string | null>> {
  try {
    // 開発環境では環境変数を優先
    if (import.meta.env.DEV) {
      const result: Record<string, string | null> = {};
      for (const key of keys) {
        const devValue = import.meta.env[`VITE_${key}`];
        result[key] = devValue || null;
      }
      
      // すべての値が取得できた場合は開発環境の値を返す
      if (Object.values(result).every(value => value !== null)) {
        return result;
      }
    }

    // 本番環境またはバックエンドから環境変数を取得
    const envVars = await invoke<Record<string, string | null>>('get_env_vars', { keys });
    return envVars;
  } catch (error) {
    console.error('Failed to get environment variables:', error);
    return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {});
  }
}

// 天気API設定を取得（特化関数）
export async function getWeatherConfig(): Promise<{
  apiKey: string;
  zipCode: string;
  countryCode: string;
} | null> {
  const envVars = await getEnvVars([
    'OPENWEATHER_API_KEY',
    'WEATHER_ZIP_CODE', 
    'WEATHER_COUNTRY_CODE'
  ]);

  const apiKey = envVars['OPENWEATHER_API_KEY'];
  const zipCode = envVars['WEATHER_ZIP_CODE'] || '577-0804';
  const countryCode = envVars['WEATHER_COUNTRY_CODE'] || 'JP';

  if (!apiKey) {
    console.error('天気APIキーが設定されていません');
    return null;
  }

  return {
    apiKey,
    zipCode,
    countryCode
  };
}