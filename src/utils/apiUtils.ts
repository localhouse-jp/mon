import { StationDirections, TimetableData } from '../types/timetable';
import { getApiBaseUrl } from './configUtils';

/**
 * ネットワークエラーの詳細情報を取得する
 */
const getDetailedErrorInfo = (error: unknown, url: string): string => {
  const baseUrl = getApiBaseUrl();
  let errorDetail = `URL: ${url}\n`;

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    errorDetail += `
ネットワーク接続に問題があります。以下を確認してください：
- インターネット接続が有効か
- APIサーバーが起動しているか
- APIのベースURL(${baseUrl})が正しいか
- CORSの設定が適切か`;
  } else if (error instanceof Error) {
    errorDetail += `エラー種別: ${error.constructor.name}\nメッセージ: ${error.message}`;
    if (error.stack) {
      errorDetail += `\nスタック: ${error.stack}`;
    }
  }

  return errorDetail;
};

/**
 * 時刻表データを取得し、不要な八戸ノ里駅前データを除外
 */
export const fetchTimetableData = async (): Promise<TimetableData> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/all`;

  try {
    const res = await fetch(url);

    if (!res.ok) {
      let errorMsg = `APIエラー: ${res.status} ${res.statusText}`;

      try {
        const errorText = await res.text();
        let errorJson;

        try {
          // JSONとして解析できるか試みる
          errorJson = JSON.parse(errorText);
          errorMsg += `\nレスポンス: ${JSON.stringify(errorJson, null, 2)}`;
        } catch {
          // プレーンテキストとして表示
          if (errorText) {
            errorMsg += `\nレスポンス: ${errorText}`;
          }
        }
      } catch { } // レスポンス解析エラーは無視

      throw new Error(errorMsg);
    }

    const data: TimetableData = await res.json();

    // 近鉄バスの八戸ノ里駅前を除外
    if (data.kintetsuBus) {
      if (data.kintetsuBus.stops) {
        data.kintetsuBus.stops = data.kintetsuBus.stops.filter(s => s.stopName !== '八戸ノ里駅前');
      }
      const anyBus = data.kintetsuBus as any;
      if (anyBus['八戸ノ里駅前']) delete anyBus['八戸ノ里駅前'];
    } else {
      // kintetsuBusがない場合は別APIから取得
      await fetchBusData(data, baseUrl);
    }

    return data;
  } catch (error) {
    // 詳細なエラー情報を含めて例外を投げる
    const detailedError = getDetailedErrorInfo(error, url);
    console.error('APIフェッチ中にエラー:', detailedError);

    if (error instanceof Error) {
      error.message = `${error.message}\n\n詳細情報:\n${detailedError}`;
      throw error;
    }

    throw new Error(`APIフェッチエラー\n\n詳細情報:\n${detailedError}`);
  }
};

/**
 * バス時刻表データを取得する補助関数
 */
async function fetchBusData(data: TimetableData, baseUrl: string): Promise<void> {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const busUrl = `${baseUrl}/api/kintetsu-bus/calendar/${yyyy}-${mm}-${dd}`;
    const res = await fetch(busUrl);

    if (!res.ok) {
      console.warn(`バス時刻表の取得に失敗: ${res.status} ${res.statusText}`);
      return;
    }

    data.kintetsuBus = await res.json();
  } catch (error) {
    console.warn('バス時刻表の取得中にエラー:', error);
  }
}

/**
 * 時刻表データから全駅のStationDirectionsマップを生成
 */
export const createStationsMap = (data: TimetableData): Map<string, StationDirections> => {
  const map = new Map<string, StationDirections>();

  // 近鉄駅データ
  if (data.kintetsu) {
    Object.entries(data.kintetsu).forEach(([key, dirs]) => map.set(key, dirs));
  }

  // JR駅データ
  if (data.jr) {
    Object.entries(data.jr).forEach(([key, dirs]) => map.set(key, dirs));
  }

  // その他のデータ
  Object.entries(data).forEach(([company, stations]) => {
    if (company !== 'kintetsu' && company !== 'jr' &&
      company !== 'kintetsuBus' && company !== 'lastUpdated' && stations) {
      Object.entries(stations as Record<string, StationDirections>)
        .forEach(([key, dirs]) => map.set(key, dirs));
    }
  });

  return map;
};