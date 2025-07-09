import React, { useCallback, useEffect, useMemo, useState } from 'react';
import localhouseLogo from './assets/localhouse.png';
import qrcode from './assets/qrcode.svg';
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
  TodayForecast,
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
import { fetchTodayForecast, getWeatherIcon } from './utils/weatherUtils';

// 環境変数からデバッグ日時を取得（同期版を使用）
const debugDateTimeString = import.meta.env.VITE_DEBUG_DATETIME || null;
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
  currentClass?: any;
  nextClass?: any;
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
  delayResponse,
  currentClass,
  nextClass
}) => {
  // 現在時刻の状態管理 - 初期値を環境変数または現在時刻に設定
  const [now, setNow] = useState<Date>(initialDate);
  // 天気情報の状態管理
  const [todayForecast, setTodayForecast] = useState<TodayForecast | null>(null);

  // 時刻を更新する間隔を設定 (デバッグ時は更新しないようにする)
  useEffect(() => {
    // デバッグ日時が設定されていない場合のみタイマーで更新
    if (!debugDateTimeString) {
      const timer = setInterval(() => setNow(new Date()), UPDATE_INTERVAL_MS);
      return () => clearInterval(timer);
    }
  }, [debugDateTimeString]);

  // 天気情報を取得
  useEffect(() => {
    const loadWeather = async () => {
      const weatherData = await fetchTodayForecast();
      setTodayForecast(weatherData);
    };

    loadWeather();

    // 10分ごとに天気情報を更新
    const weatherTimer = setInterval(loadWeather, 10 * 60 * 1000);
    return () => clearInterval(weatherTimer);
  }, []);

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

  // 大阪バスの時刻表データを処理
  const osakaBusStationsData = useMemo(() => {
    // バスデータがない場合は空の配列を返す
    if (!timetableData?.osakaBus) return [];

    const busColor = getLineColor("大阪バス");
    const isHolidayMode = isHoliday ? "holiday" : "weekday";

    // バス停データを処理
    const busStopsData = processBusSchedules(timetableData.osakaBus);

    // バス停情報を格納する配列
    const busStations: {
      station: string;
      color: string;
      trains: { time: string, destination: string, type: string, remainingMinutes: number }[];
    }[] = [];

    try {
      // バス停名でループ（例：俊徳道駅）
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

        // 各ルートでループ（例：近畿大学東門前→俊徳道駅）
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

      console.log("処理された大阪バスデータ:", busStations.map(s => s.station));

    } catch (error) {
      console.error("大阪バスデータの処理中にエラーが発生しました:", error);
    }

    return busStations;
  }, [timetableData?.osakaBus, now, isHoliday, isTrainUpcoming, processBusSchedules]);

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
    <div className="w-screen h-screen flex flex-col bg-gray-900 text-white font-sans overflow-hidden">
      {/* ヘッダー：日付＋現在時刻＋天気情報 */}
      <header className="flex justify-between items-center px-6 py-4 bg-gray-800 shadow-md">
        <div className="flex flex-col">
          <div className="text-xl font-bold">{formatDate(now)}</div>
          <div className="text-xs text-amber-400">
            {isHoliday ? `休日ダイヤ${holidayName ? ` (${holidayName})` : ''}` : '平日ダイヤ'}
          </div>
        </div>

        {/* 中央：今日の全天気予報 */}
        <div className="flex items-center space-x-1">
          {todayForecast && todayForecast.forecasts.length > 0 ? (
            todayForecast.forecasts.map((forecast, idx) => (
              <div
                key={idx}
                className={`flex items-center space-x-2 px-1 py-1 rounded ${forecast.time === todayForecast.current.time
                  ? 'bg-gray-600 ring-1 ring-blue-400'
                  : 'bg-gray-700'
                  }`}
              >
                <div className="text-sm text-gray-300 min-w-[2.5rem]">{forecast.time}</div>
                {React.createElement(getWeatherIcon(forecast.icon), {
                  className: "w-8 h-8 text-white",
                  title: forecast.description
                })}
                <div className="text-lg font-bold text-white min-w-[3rem]">{forecast.temp}℃</div>
              </div>
            ))
          ) : (
            <div className="text-base text-gray-400">天気情報取得中...</div>
          )}
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
        {(busStationsData.length > 0 || osakaBusStationsData.length > 0) && (
          <>
            <h2 className="text-2xl font-bold border-t border-gray-700 pt-6 mt-8 mb-6"
              style={{ color: getLineColor("近鉄バス") }}>
              バス
              {timetableData.kintetsuBus?.operationType && (
                <span className="text-base ml-3 text-amber-400">
                  近鉄バス: {timetableData.kintetsuBus.operationType}日運行
                </span>
              )}
              {timetableData.osakaBus?.operationType && (
                <span className="text-base ml-3 text-amber-400">
                  大阪バス: {timetableData.osakaBus.operationType}日運行
                </span>
              )}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {busStationsData.map((busStation, idx) => (
                <div key={`bus-${idx}`} className="mb-6 bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                  {/* バス停名をヘッダーとして表示 */}
                  <div
                    className="flex items-center px-4 py-2 bg-gray-700 border-l-4"
                    style={{ borderColor: busStation.color }}
                  >
                    <span className="text-base font-bold text-white truncate">{busStation.station}→八戸ノ里</span>
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
              {osakaBusStationsData.map((busStation, idx) => (
                <div key={`osaka-bus-${idx}`} className="mb-6 bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                  {/* バス停名をヘッダーとして表示 */}
                  <div
                    className="flex items-center px-4 py-2 bg-gray-700 border-l-4"
                    style={{ borderColor: busStation.color }}
                  >
                    <span className="text-base font-bold text-white truncate">{busStation.station}→俊徳道</span>
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
      {/* 現在の授業情報セクション */}
      {(currentClass?.length > 0 || nextClass?.length > 0) && (
        <div className="px-6 py-2 text-white">
          <h3 className="text-lg font-bold mb-1">授業情報 (実験中)</h3>
          <div className="bg-gray-800 rounded-lg p-2">
            {currentClass?.length > 0 && (
              <div className="mb-2">
                <div className="text-base font-semibold text-green-400 mb-1">現在の授業</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {currentClass.map((cls: any, idx: number) => (
                    <div key={idx} className="bg-gray-700 rounded p-1">
                      <div className="text-xs font-medium">
                        {cls.subject} @ {cls.classroom}
                      </div>
                      <div className="text-xs text-gray-400">
                        {cls.startTime} - {cls.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {nextClass?.length > 0 && (
              <div>
                <div className="text-base font-semibold text-blue-400 mb-1">次の授業</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {nextClass.map((cls: any, idx: number) => (
                    <div key={idx} className="bg-gray-700 rounded p-1">
                      <div className="text-xs font-medium">
                        {cls.subject} @ {cls.classroom}
                      </div>
                      <div className="text-xs text-gray-400">
                        {cls.startTime} - {cls.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 遅延情報セクション (フッター外) */}
      {delayResponse && (
        <div className="px-6 py-4 text-white">
          <h3 className="text-xl font-bold mb-2">遅延情報</h3>
          <div className="grid grid-cols-2">
            {/* カラムヘッダー */}
            <div>
              <div className="text-lg font-semibold">近鉄</div>
              <div className="text-sm text-amber-400 pt-2">{delayResponse.kintetsu.status}</div>
              <div className="text-sm text-red-400 space-y-1">
                {delayResponse.kintetsu.disruptions?.map((d, idx) => (
                  <div key={idx}>
                    {d.route}: {d.status} ({d.cause}){' '}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold">JR</div>
              <div className="text-sm text-amber-400 pt-2">{delayResponse.jr?.status}</div>
              <div className="text-sm text-red-400 space-y-1">
                {delayResponse.jr?.disruptions?.map((d, idx) => (
                  <div key={idx}>
                    {d.route}: {d.status}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* フッター：2行レイアウト */}
      {import.meta.env.VITE_SHOW_FOOTER !== 'false' && (
        <footer className="bg-gray-800 text-gray-500 text-sm p-4 h-24">
          <div className="w-full flex justify-between items-center">
            <div className='flex flex-col absolute right-0 left-0 bottom-8 text-center'>
              <span className="font-sans">
                {timetableData?.lastUpdated
                  ? `最終更新: ${new Date(timetableData.lastUpdated).toLocaleString('ja-JP')}`
                  : `最終更新: ${now.toLocaleString('ja-JP')}`}
              </span>
              <span className="text-xs text-gray-400 font-mono">LOCALHOUSE / https://localhouse.jp</span>
            </div>
            <div className="flex items-center space-x-4 absolute right-4 bottom-4">
              <img src={localhouseLogo} alt="Localhouse" className="h-16" />
              <img src={qrcode} alt="QR Code" className="h-16" />
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default TrainBoard;