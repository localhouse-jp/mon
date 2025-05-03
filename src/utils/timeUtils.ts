import { LINE_COLORS } from '../types/timetable';

// 定数
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60 * 1000;
const DEFAULT_LINE_COLOR = '#cccccc';
const MAX_FUTURE_HOURS = 6;

/**
 * 時刻をフォーマットする
 * @param hour 時
 * @param minute 分
 * @returns フォーマットされた時刻文字列 (例: "9:05")
 */
export const formatTime = (hour: string | number, minute: string | number): string => {
  const hourStr = hour.toString();
  const minuteStr = minute.toString().padStart(2, '0');
  return `${hourStr}:${minuteStr}`;
};

/**
 * 発車までの残り分数を計算する
 * @param hour 出発時刻の時
 * @param minute 出発時刻の分
 * @param now 現在時刻
 * @returns 残り分数
 */
export const calculateRemainingMinutes = (
  hour: string | number,
  minute: string | number,
  now: Date
): number => {
  const trainHour = typeof hour === 'string' ? parseInt(hour, 10) : hour;
  const trainMinute = typeof minute === 'string' ? parseInt(minute, 10) : minute;

  const trainTime = new Date(now);
  trainTime.setHours(trainHour, trainMinute, 0, 0);

  // 現在時刻が電車時刻を過ぎている場合は翌日の電車として計算
  if (trainTime < now) {
    trainTime.setDate(trainTime.getDate() + 1);

    // 翌日の電車の場合、一定時間以内の電車のみ表示する
    const maxFutureMs = MAX_FUTURE_HOURS * MINUTES_PER_HOUR * MS_PER_MINUTE;
    if (trainTime.getTime() - now.getTime() > maxFutureMs) {
      return 0;
    }
  }

  const diffMs = trainTime.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / MS_PER_MINUTE));
};

/**
 * 残り時間を表示形式にフォーマットする
 * @param minutes 残り分数
 * @returns フォーマットされた残り時間文字列 (例: "5 分")
 */
export const formatRemainingTime = (minutes: number): string => {
  return `${minutes} 分`;
};

/**
 * 日付と曜日をフォーマットする
 * @param date 日付オブジェクト
 * @returns フォーマットされた日付文字列 (例: "2023年5月1日（月）")
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeekStr = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

  return `${year}年${month}月${day}日（${dayOfWeekStr}）`;
};

/**
 * 駅名に対応する路線カラーを取得する
 * @param stationKey 駅名キー
 * @returns 路線カラーコード
 */
export const getLineColor = (stationKey: string): string => {
  const lineKey = Object.keys(LINE_COLORS).find(key => stationKey.includes(key));
  return lineKey ? LINE_COLORS[lineKey as keyof typeof LINE_COLORS] : DEFAULT_LINE_COLOR;
};

/**
 * 駅名を抽出する
 * @param key 駅名の完全キー (例: "奈良線 八戸ノ里駅")
 * @returns 抽出された駅名 (例: "八戸ノ里")
 */
export const extractStationName = (key: string): string => {
  const parts = key.split(" ");
  if (parts.length < 2) {
    return key;
  }

  const stationWithSuffix = parts[1];
  return stationWithSuffix.endsWith('駅')
    ? stationWithSuffix.slice(0, -1) // 末尾の「駅」を削除
    : stationWithSuffix;
};

/**
 * 路線タイプを特定する
 * @param stationKey 駅名キー
 * @returns 路線タイプ ('kintetsu'|'jr'|'other')
 */
const getLineType = (stationKey: string): 'kintetsu' | 'jr' | 'other' => {
  if (stationKey.includes("奈良線") || stationKey.includes("大阪線")) {
    return 'kintetsu';
  }
  if (stationKey.includes("ＪＲ")) {
    return 'jr';
  }
  return 'other';
};

/**
 * 方向名を整形して表示用にする
 * @param stationKey 駅名キー
 * @param directionKey 方向キー
 * @returns フォーマットされた方向名
 */
export const formatDirectionTitle = (stationKey: string, directionKey: string): string => {
  const parts = directionKey.split(" ");
  const lineType = getLineType(stationKey);

  switch (lineType) {
    case 'kintetsu': {
      // "奈良線 大阪難波・尼崎(阪神)方面" → "大阪難波・尼崎方面"
      const matchResult = directionKey.match(/([^方面]+)方面/);
      if (matchResult && matchResult[1]) {
        const directionName = matchResult[1].split(" ").slice(-1)[0];
        return `${directionName}方面`;
      }
      return parts[parts.length - 1];
    }
    case 'jr':
      return directionKey;
    default:
      return parts[parts.length - 1];
  }
};