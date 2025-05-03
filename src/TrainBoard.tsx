import React, { useCallback, useEffect, useMemo, useState } from 'react';
import StationCard from './components/StationCard';
import BusItem from './components/BusItem';
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

  // 1秒ごとに現在時刻を更新（元の60000ミリ秒から1000ミリ秒に変更）
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
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

  // 近鉄バスの時刻表データを処理
  const busStationsData = useMemo(() => {
    // APIレスポンスに合わせて処理方法を変更
    // 近鉄バスデータがない場合は空の配列を返す
    if (!timetableData?.kintetsuBus) return [];

    const busColor = getLineColor("近鉄バス");
    const isHolidayMode = isHoliday ? "holiday" : "weekday";
    
    // バス停情報を格納する配列
    const busStations: {
      station: string;
      color: string;
      trains: { time: string, destination: string, type: string, remainingMinutes: number }[];
    }[] = [];

    try {
      // バス停名でループ（例：八戸ノ里駅前、近畿大学東門前）
      Object.entries(timetableData.kintetsuBus).forEach(([stopName, routes]) => {
        // lastUpdated や他のメタデータをスキップ
        if (typeof routes !== 'object' || stopName === 'lastUpdated' ||
          stopName === 'operationType' || stopName === 'date' || stopName === 'stops') {
          return;
        }

        // 取得したすべてのバスの時刻データを保存する配列
        let allBuses: { time: string, destination: string, type: string, remainingMinutes: number }[] = [];

        // 各ルートでループ（例：近畿大学東門前→八戸ノ里駅前）
        Object.entries(routes).forEach(([routeName, schedules]) => {
          // 適切なスケジュール（平日/休日）を取得
          const schedule = schedules[isHolidayMode];

          if (!Array.isArray(schedule)) {
            console.log(`バス停 ${stopName} のルート ${routeName} に有効なスケジュールがありません`);
            return;
          }

          // 現在時刻以降のバスをフィルタリング
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();

          const filteredBuses = schedule
            .filter(bus => {
              if (!bus.hour || !bus.minute) return false;

              const busHour = parseInt(bus.hour);
              const busMinute = parseInt(bus.minute);

              return busHour > currentHour ||
                (busHour === currentHour && busMinute >= currentMinute);
            })
            .map(bus => ({
              time: formatTime(bus.hour, bus.minute),
              destination: "", // 行き先情報を空にして表示しない
              type: "", // タイプ情報も表示しない
              remainingMinutes: calculateRemainingMinutes(bus.hour, bus.minute, now)
            }));

          allBuses = [...allBuses, ...filteredBuses];
        });

        // 時間順にソート
        allBuses.sort((a, b) => a.remainingMinutes - b.remainingMinutes);
        
        // 直近3件に制限
        const upcomingBuses = allBuses.slice(0, 3);
        
        // バス停情報を追加
        busStations.push({
          station: stopName,
          color: busColor,
          trains: upcomingBuses
        });
      });

      console.log("処理された近鉄バスデータ:", busStations.map(s => s.station));
      
    } catch (error) {
      console.error("近鉄バスデータの処理中にエラーが発生しました:", error);
    }
    
    return busStations;
  }, [timetableData?.kintetsuBus, now, isHoliday]);

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
          <div className="text-xl font-bold font-mono">{formatDate(now)}</div>
          <div className="text-xs text-amber-400">
            {isHoliday ? `休日ダイヤ${holidayName ? ` (${holidayName})` : ''}` : '平日ダイヤ'}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-3xl font-extrabold text-white font-mono">{now.toLocaleTimeString('ja-JP', { hour12: false })}</div>
        </div>
      </header>

      {/* メイン：駅ごとにグループ化 */}
      <main className="p-6 flex-1 overflow-auto">
        {/* 電車の時刻表データ */}
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

        {/* バスの時刻表データ */}
        {busStationsData.length > 0 && (
          <>
            <h2 className="text-2xl font-bold border-t border-gray-700 pt-6 mt-8 mb-6"
              style={{ color: getLineColor("近鉄バス") }}>
              近鉄バス
              {timetableData.kintetsuBus?.operationType && (
                <span className="text-base ml-3 text-amber-400">
                  {timetableData.kintetsuBus.operationType}日運行
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {busStationsData.map((busStation, idx) => (
                <div key={`bus-${idx}`} className="mb-6 bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                  {/* バス停名をヘッダーとして表示 */}
                  <div
                    className="flex items-center px-4 py-2 bg-gray-700 border-l-4"
                    style={{ borderColor: busStation.color }}
                  >
                    <span className="text-base font-bold text-white truncate">{busStation.station}</span>
                  </div>
                  {/* バスの時刻リスト */}
                  <div>
                    {busStation.trains.length > 0 ? (
                      busStation.trains.map((train, trainIdx) => (
                        <BusItem 
                          key={trainIdx}
                          time={train.time}
                          remainingMinutes={train.remainingMinutes}
                          color={busStation.color}
                        />
                      ))
                    ) : (
                      <div className="text-center p-3 text-gray-400 italic text-sm">
                        この時間帯のバスはありません
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* フッター */}
      <footer className="text-center py-2 text-sm text-gray-500 bg-gray-800 font-mono">
        {timetableData?.lastUpdated ?
          `最終更新: ${new Date(timetableData.lastUpdated).toLocaleString('ja-JP')}` :
          `最終更新: ${now.toLocaleString('ja-JP')}`
        }
      </footer>
    </div>
  );
};

export default TrainBoard;