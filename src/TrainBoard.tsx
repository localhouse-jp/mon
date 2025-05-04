import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BusItem from './components/BusItem';
import StationCard from './components/StationCard';
import { ErrorScreen, LoadingScreen, NoDataScreen } from './components/StatusScreens';
import {
  BusStop,
  DelayResponse,
  DisplayDirection,
  STATION_LAYOUT,
  StationDirections,
  TimetableData,
  Train
} from './types/timetable';
import {
  calculateRemainingMinutes,
  extractStationName,
  formatDate,
  formatDirectionTitle,
  formatTime,
  getLineColor
} from './utils/timeUtils';

// 環境変数からデバッグ日時を取得
const debugDateTimeString = import.meta.env.VITE_DEBUG_DATETIME;
const initialDate = debugDateTimeString ? new Date(debugDateTimeString) : new Date();

interface TrainBoardProps {
  timetableData: TimetableData | null;
  stationsMap: Map<string, StationDirections>;
  isHoliday: boolean;
  holidayName: string;
  loading?: boolean;
  error?: string;
  // 遅延情報
  delayResponse?: DelayResponse | null;
}

// 時間間隔の定数（ミリ秒）
const UPDATE_INTERVAL_MS = 1000;
const MAX_DISPLAY_TRAINS = 4;

const TrainBoard: React.FC<TrainBoardProps> = ({
  timetableData,
  stationsMap,
  isHoliday,
  holidayName,
  loading = false,
  error = "",
  delayResponse
}) => {
  // 現在時刻の状態管理 - 初期値を環境変数または現在時刻に設定
  const [now, setNow] = useState<Date>(initialDate);

  // 時刻を更新する間隔を設定 (デバッグ時は更新しないようにする)
  useEffect(() => {
    // デバッグ日時が設定されていない場合のみタイマーで更新
    if (!debugDateTimeString) {
      const timer = setInterval(() => setNow(new Date()), UPDATE_INTERVAL_MS);
      return () => clearInterval(timer);
    }
  }, [debugDateTimeString]);

  // 列車が現在時刻以降かどうかを判断する関数
  const isTrainUpcoming = useCallback((hour: string | number, minute: string | number): boolean => {
    const hourNum = typeof hour === 'string' ? parseInt(hour, 10) : hour;
    const minuteNum = typeof minute === 'string' ? parseInt(minute, 10) : minute;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return hourNum > currentHour || (hourNum === currentHour && minuteNum >= currentMinute);
  }, [now]);

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

    if (!trains || !Array.isArray(trains) || trains.length === 0) return [];

    // 現在時刻以降の電車をフィルタリング
    const filteredTrains = trains.filter((train: Train) => {
      if (!train.hour || !train.minute) return false;
      return isTrainUpcoming(train.hour, train.minute);
    });

    let upcomingTrains = filteredTrains.slice(0, MAX_DISPLAY_TRAINS);

    // もし現在時刻以降に電車がなければ、時間に関係なく最初の数件を表示
    if (upcomingTrains.length === 0 && Array.isArray(trains) && trains.length > 0) {
      upcomingTrains = trains.slice(0, MAX_DISPLAY_TRAINS);
    }

    return upcomingTrains;
  }, [stationsMap, isHoliday, isTrainUpcoming]);

  // 電車データをDisplayTrain形式に変換
  const convertToDisplayTrain = useCallback((train: Train): {
    time: string;
    destination: string;
    type: string;
    remainingMinutes: number
  } => {
    return {
      time: formatTime(train.hour, train.minute),
      destination: train.destination,
      type: train.trainType,
      remainingMinutes: calculateRemainingMinutes(train.hour, train.minute, now)
    };
  }, [now]);

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

      // 左右方向のデータを追加
      ['left', 'right'].forEach(side => {
        const directionKey = directions[side as keyof typeof directions];
        const trains = getTrainsForDisplay(stationKey, directionKey);
        const displayTrains = trains.map(convertToDisplayTrain);

        stationGroups[stationName].directions.push({
          station: stationName,
          title: formatDirectionTitle(stationKey, directionKey),
          color: stationColor,
          trains: displayTrains
        });
      });
    }

    return stationGroups;
  }, [stationsMap, getTrainsForDisplay, convertToDisplayTrain]);

  // バス停のスケジュールを処理する
  const processBusSchedules = useCallback((busData?: any) => {
    if (!busData) {
      return {};
    }

    const result: Record<string, any> = {};
    const dayType = isHoliday ? 'B' : 'A';

    // stops配列がある場合（新構造）
    if (busData.stops && Array.isArray(busData.stops)) {
      busData.stops.forEach((stop: BusStop) => {
        if (stop.operationType && stop.operationType !== dayType) {
          return; // 運行タイプが一致しない場合はスキップ
        }

        if (!result[stop.stopName]) {
          result[stop.stopName] = {};
        }

        result[stop.stopName][stop.routeName] = {
          weekday: stop.schedule.flatMap(hourData =>
            hourData.minutes.map(min => ({
              hour: hourData.hour,
              minute: min
            }))
          ).sort((a, b) =>
            a.hour - b.hour || a.minute - b.minute
          )
        };
      });
    } else {
      // 元の形式のデータ（バス停名をキーとして持つオブジェクト形式）
      Object.entries(busData).forEach(([key, value]) => {
        // メタデータフィールドをスキップ
        if (key === 'lastUpdated' || key === 'operationType' || key === 'date' || key === 'stops') {
          return;
        }
        result[key] = value;
      });
    }

    return result;
  }, [isHoliday]);

  // 近鉄バスの時刻表データを処理
  const busStationsData = useMemo(() => {
    // バスデータがない場合は空の配列を返す
    if (!timetableData?.kintetsuBus) return [];

    const busColor = getLineColor("近鉄バス");
    const isHolidayMode = isHoliday ? "holiday" : "weekday";

    // バス停データを処理
    const busStopsData = processBusSchedules(timetableData.kintetsuBus);

    // バス停情報を格納する配列
    const busStations: {
      station: string;
      color: string;
      trains: { time: string, destination: string, type: string, remainingMinutes: number }[];
    }[] = [];

    try {
      // バス停名でループ（例：八戸ノ里駅前、近畿大学東門前）
      Object.entries(busStopsData).forEach(([stopName, routes]) => {
        // lastUpdated や他のメタデータをスキップ
        if (stopName === 'lastUpdated' || stopName === 'operationType' ||
          stopName === 'date' || stopName === 'stops') {
          return;
        }

        // 取得したすべてのバスの時刻データを保存する配列
        let allBuses: {
          time: string,
          destination: string,
          type: string,
          remainingMinutes: number
        }[] = [];

        // 各ルートでループ（例：近畿大学東門前→八戸ノ里駅前）
        Object.entries(routes).forEach(([routeName, schedules]) => {
          // 適切なスケジュール（平日/休日）を取得
          // schedules の型を明示的に指定し、インデックスアクセスを安全に行う
          const typedSchedules = schedules as { weekday?: any[], holiday?: any[] };
          const schedule = typedSchedules && typeof typedSchedules === 'object'
            ? typedSchedules[isHolidayMode]
            : undefined;

          if (!schedule || !Array.isArray(schedule)) {
            console.log(`バス停 ${stopName} のルート ${routeName} に有効なスケジュールがありません`);
            return;
          }

          // 現在時刻以降のバスをフィルタリング
          const filteredBuses = schedule
            .filter(bus => {
              if (!bus.hour || !bus.minute) return false;
              return isTrainUpcoming(bus.hour, bus.minute);
            })
            .map(bus => ({
              time: formatTime(bus.hour, bus.minute),
              destination: routeName, // ルート名を行き先として表示
              type: "",
              remainingMinutes: calculateRemainingMinutes(bus.hour, bus.minute, now)
            }));

          allBuses = [...allBuses, ...filteredBuses];
        });

        // 時間順にソート
        allBuses.sort((a, b) => a.remainingMinutes - b.remainingMinutes);

        // 直近の便に制限
        const upcomingBuses = allBuses.slice(0, MAX_DISPLAY_TRAINS);

        // バス停情報を追加
        if (upcomingBuses.length > 0) {
          busStations.push({
            station: stopName,
            color: busColor,
            trains: upcomingBuses
          });
        }
      });

      console.log("処理された近鉄バスデータ:", busStations.map(s => s.station));

    } catch (error) {
      console.error("近鉄バスデータの処理中にエラーが発生しました:", error);
    }

    return busStations;
  }, [timetableData?.kintetsuBus, now, isHoliday, isTrainUpcoming, processBusSchedules]);

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
          {delayResponse?.kintetsu && (
            <div className="text-sm text-amber-400 mt-1">
              近鉄: {delayResponse.kintetsu.status}
            </div>
          )}
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