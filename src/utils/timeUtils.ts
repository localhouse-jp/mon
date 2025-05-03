import { LINE_COLORS } from '../types/timetable';

/**
 * 時刻をフォーマットする (例: "9:5" → "9:05")
 */
export const formatTime = (hour: string, minute: string): string => {
  return `${hour}:${minute.padStart(2, '0')}`;
};

/**
 * 発車までの残り分数を計算する
 */
export const calculateRemainingMinutes = (hour: string, minute: string, now: Date): number => {
  const trainHour = parseInt(hour);
  const trainMinute = parseInt(minute);

  const trainTime = new Date(now);
  trainTime.setHours(trainHour, trainMinute, 0, 0);

  // 現在時刻が電車時刻を過ぎている場合は翌日の電車として計算
  if (trainTime < now) {
    trainTime.setDate(trainTime.getDate() + 1);
  }

  const diffMs = trainTime.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / 60000));
};

/**
 * 残り時間を表示形式にフォーマットする
 */
export const formatRemainingTime = (minutes: number): string => {
  return `${minutes} 分`;
};

/**
 * 日付と曜日をフォーマットする (例: "2023年5月1日（月）")
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
 */
export const getLineColor = (stationKey: string): string => {
  for (const key in LINE_COLORS) {
    if (stationKey.includes(key)) {
      return LINE_COLORS[key as keyof typeof LINE_COLORS];
    }
  }
  return "#cccccc"; // デフォルトカラー
};

/**
 * 駅名を抽出する (例: "奈良線 八戸ノ里駅" → "八戸ノ里")
 */
export const extractStationName = (key: string): string => {
  const parts = key.split(" ");
  // 駅名が「路線名 駅名駅」の形式でない場合に対応
  if (parts.length < 2) {
    return key; // 分割できない場合は元の文字列を返す
  }

  const stationWithSuffix = parts[1]; // 「駅名駅」の部分
  // 「駅」という文字で終わっていれば削除
  return stationWithSuffix.endsWith('駅')
    ? stationWithSuffix.substring(0, stationWithSuffix.length - 1)
    : stationWithSuffix;
};

/**
 * 方向名を整形して表示用にする
 */
export const formatDirectionTitle = (stationKey: string, directionKey: string): string => {
  // 方向名からより分かりやすい表示を生成
  const parts = directionKey.split(" ");
  let directionDisplay = "";

  // 近鉄線の場合、「方面」という単語で切り分ける
  if (stationKey.includes("奈良線") || stationKey.includes("大阪線")) {
    // "奈良線 大阪難波・尼崎(阪神)方面" → "大阪難波・尼崎方面"
    const matchResult = directionKey.match(/([^方面]+)方面/);
    if (matchResult && matchResult[1]) {
      const directionName = matchResult[1].split(" ").slice(-1)[0]; // 空白で分けて最後の部分を取得
      directionDisplay = directionName + "方面";
    } else {
      directionDisplay = parts[parts.length - 1]; // 最後の部分を使用
    }
  }
  // JR線の場合、そのまま使用
  else if (stationKey.includes("ＪＲ")) {
    directionDisplay = directionKey;
  }
  // デフォルト動作：少なくとも最後の部分は表示
  else {
    directionDisplay = parts[parts.length - 1];
  }

  return directionDisplay;
};