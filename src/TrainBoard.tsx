import React, { useCallback, useEffect, useMemo, useState } from 'react';
import StationCard from './components/StationCard';
import { ErrorScreen, LoadingScreen, NoDataScreen } from './components/StatusScreens';
import { DisplayDirection, STATION_LAYOUT, StationDirections, TimetableData, Train } from './types/timetable';
import { calculateRemainingMinutes, extractStationName, formatDate, formatDirectionTitle, formatTime, getLineColor } from './utils/timeUtils';

interface TrainBoardProps {
  timetableData: TimetableData | null;
  stationsMap: Map<string, StationDirections>;
  isHoliday: boolean;
  holidayName: string;
  loading?: boolean;
  error?: string;
}

const TrainBoard: React.FC<TrainBoardProps> = ({
  timetableData,
  stationsMap,
  isHoliday,
  holidayName,
  loading = false,
  error = ""
}) => {
  // 現在時刻の状態管理
  const [now, setNow] = useState<Date>(new Date());

  // 1分ごとに現在時刻を更新
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 列車データを取得する関数
  const getTrainsForDisplay = useCallback((stationKey: string, directionKey: string): Train[] => {
    const stationData = stationsMap.get(stationKey);
    if (!stationData) return [];

    const directionData = stationData[directionKey];
    if (!directionData) return [];

    // JR線かどうかを判定
    const isJRStation = stationKey.includes('ＪＲ');

    // 使用するデータを決定
    const dayType = isHoliday ? "holiday" : "weekday";
    const trains = isJRStation ? directionData : directionData[dayType];

    if (!trains || trains.length === 0) return [];

    // 現在時刻以降の電車をフィルタリング
    const filteredTrains = trains.filter((train: Train) => {
      if (!train.hour || !train.minute) return false;

      const hourNum = parseInt(train.hour);
      const currentHourNum = now.getHours();
      const trainMinute = parseInt(train.minute);
      const currentMinute = now.getMinutes();

      return hourNum > currentHourNum ||
        (hourNum === currentHourNum && trainMinute >= currentMinute);
    });

    let upcomingTrains = filteredTrains.slice(0, 3); // 直近3件に制限

    // もし現在時刻以降に電車がなければ、時間に関係なく最初の3件を表示
    if (upcomingTrains.length === 0 && trains.length > 0) {
      console.log(`${stationKey} ${directionKey} の時間帯に電車がありません。全ての電車を表示します。`);
      upcomingTrains = trains.slice(0, 3);
    }

    return upcomingTrains;
  }, [stationsMap, isHoliday, now]);

  // 駅データを準備 - useMemoでパフォーマンス最適化
  const stationsData = useMemo(() => {
    // 駅ごとにデータをグループ化する
    const stationGroups: Record<string, {
      station: string;
      color: string;
      directions: DisplayDirection[];
    }> = {};

    if (!stationsMap.size) return stationGroups;

    // 各駅の左右方向のデータを準備
    for (const [stationKey, directions] of Object.entries(STATION_LAYOUT)) {
      const stationColor = getLineColor(stationKey);
      const stationName = extractStationName(stationKey);

      // この駅のグループを初期化
      if (!stationGroups[stationName]) {
        stationGroups[stationName] = {
          station: stationName,
          color: stationColor,
          directions: []
        };
      }

      // 左方向（上り）のデータ
      const leftTrains = getTrainsForDisplay(stationKey, directions.left);
      stationGroups[stationName].directions.push({
        station: stationName,
        title: formatDirectionTitle(stationKey, directions.left),
        color: stationColor,
        trains: leftTrains.map(train => ({
          time: formatTime(train.hour, train.minute),
          destination: train.destination,
          type: train.trainType,
          remainingMinutes: calculateRemainingMinutes(train.hour, train.minute, now)
        }))
      });

      // 右方向（下り）のデータ
      const rightTrains = getTrainsForDisplay(stationKey, directions.right);
      stationGroups[stationName].directions.push({
        station: stationName,
        title: formatDirectionTitle(stationKey, directions.right),
        color: stationColor,
        trains: rightTrains.map(train => ({
          time: formatTime(train.hour, train.minute),
          destination: train.destination,
          type: train.trainType,
          remainingMinutes: calculateRemainingMinutes(train.hour, train.minute, now)
        }))
      });
    }

    return stationGroups;
  }, [stationsMap, getTrainsForDisplay, now]);

  // 状態に応じた画面表示
  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (!timetableData || stationsMap.size === 0) {
    return <NoDataScreen />;
  }

  return (
    <div className="w-screen h-screen bg-gray-900 text-white font-sans overflow-hidden">
      {/* ヘッダー：日付＋現在時刻 */}
      <header className="flex justify-between items-center px-6 py-4 bg-gray-800 shadow-md">
        <div className="flex flex-col">
          <div className="text-xl font-bold">{formatDate(now)}</div>
          <div className="text-xs text-amber-400">
            {isHoliday ? `休日ダイヤ${holidayName ? ` (${holidayName})` : ''}` : '平日ダイヤ'}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-3xl font-extrabold text-white">{now.toLocaleTimeString('ja-JP', { hour12: false })}</div>
        </div>
      </header>

      {/* メイン：駅ごとにグループ化 */}
      <main className="p-6 flex-1 overflow-auto">
        {Object.values(stationsData).map((stationGroup, idx) => (
          <div key={idx} className="mb-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: stationGroup.color }}>
              {stationGroup.station}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {stationGroup.directions.map((direction, directionIdx) => (
                <StationCard key={directionIdx} direction={direction} />
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* フッター */}
      <footer className="text-center py-2 text-sm text-gray-500 bg-gray-800">
        {timetableData?.lastUpdated ?
          `最終更新: ${new Date(timetableData.lastUpdated).toLocaleString('ja-JP')}` :
          `最終更新: ${now.toLocaleString('ja-JP')}`
        }
      </footer>
    </div>
  );
};

export default TrainBoard;