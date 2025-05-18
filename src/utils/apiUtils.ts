import { StationDirections, TimetableData } from '../types/timetable';

// APIのベースURLを環境変数から取得
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * /api/all から時刻表データを取得し、不要な八戸ノ里駅前データを除外
 */
export const fetchTimetableData = async (): Promise<TimetableData> => {
  const res = await fetch(`${API_BASE_URL}/api/all`);
  if (!res.ok) throw new Error(`APIエラー: ${res.status}`);
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
      const res2 = await fetch(`${API_BASE_URL}/api/kintetsu-bus/calendar/${yyyy}-${mm}-${dd}`);
      if (res2.ok) data.kintetsuBus = await res2.json();
    } catch { }
  }
  return data;
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