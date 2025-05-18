import { StationDirections, TimetableData } from '../types/timetable';
import { getApiBaseUrl } from './configUtils';

/**
 * ネットワークエラーの詳細情報を取得する
 */
const getDetailedErrorInfo = (error: unknown, url: string): string => {
  const baseUrl = getApiBaseUrl();
  let errorDetail = `URL: ${url}\n`;
  
  // エラータイプに基づいた詳細情報
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    errorDetail += 'ネットワーク接続に問題があります。以下を確認してください：\n';
    errorDetail += '- インターネット接続が有効か\n';
    errorDetail += '- APIサーバーが起動しているか\n';
    errorDetail += `- APIのベースURL(${baseUrl})が正しいか\n`;
    errorDetail += '- CORSの設定が適切か\n';
  } else if (error instanceof TypeError) {
    errorDetail += `タイプエラー: ${error.message}\n`;
  } else if (error instanceof Error) {
    errorDetail += `エラー: ${error.message}\n`;
    if (error.stack) {
      errorDetail += `スタックトレース: ${error.stack}\n`;
    }
  }
  
  return errorDetail;
};

/**
 * /api/all から時刻表データを取得し、不要な八戸ノ里駅前データを除外
 */
export const fetchTimetableData = async (): Promise<TimetableData> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/all`;
  
  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      // HTTPエラーの詳細情報
      let errorMsg = `APIエラー: ${res.status} ${res.statusText}`;
      
      try {
        // レスポンスボディがJSONならそれも表示
        const errorBody = await res.text();
        let parsedBody;
        try {
          parsedBody = JSON.parse(errorBody);
          errorMsg += `\nレスポンス: ${JSON.stringify(parsedBody, null, 2)}`;
        } catch {
          // JSONでない場合はテキストをそのまま表示
          if (errorBody) {
            errorMsg += `\nレスポンス: ${errorBody}`;
          }
        }
      } catch {} // レスポンスボディの取得に失敗しても続行
      
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
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const busUrl = `${baseUrl}/api/kintetsu-bus/calendar/${yyyy}-${mm}-${dd}`;
        const res2 = await fetch(busUrl);
        
        if (!res2.ok) {
          console.warn(`バス時刻表の取得に失敗: ${res2.status} ${res2.statusText}`);
        } else {
          data.kintetsuBus = await res2.json();
        }
      } catch (error) {
        console.warn('バス時刻表の取得中にエラーが発生:', error);
      }
    }
    return data;
  } catch (error) {
    // 詳細なエラー情報を含めてエラーを投げる
    const detailedError = getDetailedErrorInfo(error, url);
    console.error('APIフェッチ中にエラーが発生:', detailedError);
    
    // オリジナルのエラーメッセージに詳細情報を追加
    if (error instanceof Error) {
      error.message = `${error.message}\n\n詳細情報:\n${detailedError}`;
      throw error;
    }
    
    throw new Error(`APIフェッチエラー\n\n詳細情報:\n${detailedError}`);
  }
};

/**
 * 時刻表データから全駅のStationDirectionsマップを生成
 */
export const createStationsMap = (data: TimetableData): Map<string, StationDirections> => {
  const map = new Map<string, StationDirections>();
  if (data.kintetsu) {
    Object.entries(data.kintetsu).forEach(([key, dirs]) => map.set(key, dirs));
  }
  if (data.jr) {
    Object.entries(data.jr).forEach(([key, dirs]) => map.set(key, dirs));
  }
  Object.entries(data).forEach(([company, stations]) => {
    if (company !== 'kintetsu' && company !== 'jr' && company !== 'kintetsuBus' && company !== 'lastUpdated' && stations) {
      Object.entries(stations as Record<string, StationDirections>).forEach(([key, dirs]) => map.set(key, dirs));
    }
  });
  return map;
};