import { useEffect, useState } from "react";
import "./App.css";

// データ構造の型定義
interface Train {
  hour: string;
  minute: string;
  destination: string;
  trainType: string;
  detailUrl?: string;
}

interface DirectionData {
  weekday?: Train[];
  holiday?: Train[];
  // JR線の場合、weekday/holidayの区別がなく直接配列が入る可能性がある
  [key: string]: Train[] | undefined;
}

interface StationDirections {
  [direction: string]: DirectionData;
}

interface CompanyStations {
  [stationLine: string]: StationDirections;
}

interface TimetableData {
  kintetsu?: CompanyStations;
  jr?: CompanyStations;
  [company: string]: CompanyStations | undefined;
  lastUpdated: string;
}

// 2列に表示する駅と方向の定義
const STATION_LAYOUT = {
  // 近鉄
  "奈良線 八戸ノ里駅": {
    left: "奈良線 大阪難波・尼崎(阪神)方面",
    right: "奈良線 近鉄奈良方面"
  },
  "大阪線 長瀬駅": {
    left: "大阪線 大阪上本町方面",
    right: "大阪線 河内国分方面"
  },
  // JR
  "ＪＲ俊徳道駅": {
    left: "放出・新大阪・大阪（地下ホーム）方面",
    right: "久宝寺・奈良方面"
  }
};

function App() {
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null);
  const [stationsMap, setStationsMap] = useState<Map<string, StationDirections>>(new Map());
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1分ごとに現在時刻を更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1分ごとに更新

    return () => clearInterval(timer);
  }, []);

  // APIからデータを取得して整形する
  useEffect(() => {
    // 時刻表データをAPIから取得
    setLoading(true);
    console.log("API データ読み込み開始...");

    async function loadTimetableData() {
      try {
        // APIからデータを取得
        const response = await fetch('http://localhost:3000/api/all');
        if (!response.ok) {
          throw new Error(`APIエラー: ${response.status}`);
        }

        const data: TimetableData = await response.json();
        console.log("API データ読み込み成功:", data);
        setTimetableData(data);

        // データの整形
        const stationsData = new Map<string, StationDirections>();

        // 近鉄のデータを処理
        if (data.kintetsu) {
          Object.entries(data.kintetsu).forEach(([stationKey, directions]) => {
            stationsData.set(stationKey, directions);
          });
        }

        // JRのデータを処理
        if (data.jr) {
          Object.entries(data.jr).forEach(([stationKey, directions]) => {
            stationsData.set(stationKey, directions);
          });
        }

        // その他の会社データがあれば処理
        Object.entries(data).forEach(([company, stations]) => {
          if (company !== "kintetsu" && company !== "jr" && company !== "lastUpdated" && stations) {
            Object.entries(stations).forEach(([stationKey, directions]) => {
              stationsData.set(stationKey, directions);
            });
          }
        });

        console.log("駅データ処理完了:", Array.from(stationsData.keys()));
        setStationsMap(stationsData);
        setLoading(false);
      } catch (err) {
        console.error('時刻表データの読み込みエラー:', err);
        setError(`データ取得エラー: ${err.message}`);
        setLoading(false);
      }
    }

    loadTimetableData();

    // 祝日データの取得と判定
    fetchHolidaysData();
  }, []);

  // 祝日CSVデータを取得して解析する
  const fetchHolidaysData = async () => {
    try {
      const response = await fetch('https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv');
      const text = await response.text();

      // CSVデータを解析
      const rows = text.split('\n').slice(1); // ヘッダー行をスキップ
      const holidaysMap = {};

      rows.forEach(row => {
        if (!row.trim()) return;

        // ShiftJISのCSVをUTF-8環境で解析するための簡易処理
        const columns = row.split(',');
        if (columns.length >= 2) {
          // 日付フォーマットを変換（yyyy/mm/dd → yyyy-mm-dd）
          const dateParts = columns[0].replace(/"/g, '').split('/');
          if (dateParts.length === 3) {
            const dateKey = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
            const holidayName = columns[1].replace(/"/g, '');
            holidaysMap[dateKey] = holidayName;
          }
        }
      });

      // 今日が祝日かチェック
      const today = new Date();
      const dateString = formatDateToYYYYMMDD(today);

      // 土曜日(6)、日曜日(0)、または祝日リストにある日付は休日と判定
      const dayOfWeek = today.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (holidaysMap[dateString]) {
        setIsHoliday(true);
        setHolidayName(holidaysMap[dateString]);
      } else if (isWeekend) {
        setIsHoliday(true);
        setHolidayName(dayOfWeek === 0 ? "日曜日" : "土曜日");
      } else {
        setIsHoliday(false);
        setHolidayName("");
      }
    } catch (error) {
      console.error('祝日データの取得に失敗しました:', error);

      // 祝日API取得失敗時は従来の方法で判定
      const today = new Date();
      const dayOfWeek = today.getDay();
      setIsHoliday(dayOfWeek === 0 || dayOfWeek === 6);
      setHolidayName(dayOfWeek === 0 ? "日曜日" : dayOfWeek === 6 ? "土曜日" : "");
    }
  };

  // YYYY-MM-DD形式の文字列を返す
  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 現在時刻に近い電車を強調表示
  const getCurrentTimeInfo = () => {
    const hour = currentTime.getHours().toString();
    const minute = currentTime.getMinutes();

    return { hour, minute };
  };

  const { hour: currentHour, minute: currentMinute } = getCurrentTimeInfo();

  // 残り時間を計算
  const calculateRemainingTime = (trainHour, trainMinute) => {
    const now = new Date();
    const trainTime = new Date();

    // 電車の時間を設定
    trainTime.setHours(parseInt(trainHour));
    trainTime.setMinutes(parseInt(trainMinute));
    trainTime.setSeconds(0);

    // 現在時刻が電車時刻を過ぎている場合は翌日の電車として計算
    if (trainTime < now) {
      trainTime.setDate(trainTime.getDate() + 1);
    }

    // 差分を分で計算
    const diffMs = trainTime.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    return diffMinutes;
  };

  // 残り時間の表示形式
  const formatRemainingTime = (minutes) => {
    if (minutes === 0) {
      return "まもなく";
    } else if (minutes < 60) {
      return `あと${minutes}分`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `あと${hours}時間`;
      } else {
        return `あと${hours}時間${remainingMinutes}分`;
      }
    }
  };

  // 表示する日付と曜日情報
  const formatDate = () => {
    const today = currentTime;
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const dayOfWeekStr = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()];

    return `${year}年${month}月${day}日（${dayOfWeekStr}）`;
  };

  // 時刻表を描画する関数
  const renderTimetable = (trains: Train[] | undefined, directionKey: string) => {
    if (!trains || trains.length === 0) {
      return (
        <div className="text-center p-8 text-gray-400 italic">この時間帯の電車はありません</div>
      );
    }

    // 現在時刻以降の電車をフィルタリング
    let upcomingTrains = trains.filter(train => {
      if (!train.hour || !train.minute) return false;

      const hourNum = parseInt(train.hour);
      const currentHourNum = parseInt(currentHour);
      const trainMinute = parseInt(train.minute);

      return hourNum > currentHourNum ||
        (hourNum === currentHourNum && trainMinute >= currentMinute);
    }).slice(0, 4); // 直近4件に制限

    if (upcomingTrains.length === 0) {
      return (
        <div className="text-center p-8 text-gray-400 italic">この時間帯の電車はありません</div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {upcomingTrains.map((train, index) => {
          const isNearCurrent = train.hour === currentHour &&
            Math.abs(parseInt(train.minute) - currentMinute) < 10;

          // 残り時間を計算
          const remainingMinutes = calculateRemainingTime(train.hour, train.minute);
          const remainingTimeText = formatRemainingTime(remainingMinutes);

          return (
            <div
              key={index}
              className={`flex items-center bg-gray-900 rounded-lg p-4 border border-gray-700 
                ${isNearCurrent ? 'bg-blue-900 border-yellow-400 pulse' : ''}`}
            >
              <div className={`font-mono text-2xl min-w-[90px] mr-8
                ${isNearCurrent ? 'text-yellow-400 text-shadow-yellow' : 'text-blue-300 text-shadow-blue'}`}>
                <span>{train.hour}</span>
                <span className="blink px-1 text-blue-200">:</span>
                <span>{train.minute.padStart(2, '0')}</span>
              </div>

              <div className="flex flex-col flex-1">
                <div className={`text-xl font-bold ${isNearCurrent ? 'text-white' : 'text-gray-200'}`}>
                  {train.destination}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400 mt-1">{train.trainType || "普通"}</span>
                  <span className="text-sm text-green-400 font-bold mt-1">{remainingTimeText}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 駅ごとに2列レイアウトで表示
  const renderStationLayout = () => {
    if (loading) {
      return <p className="text-center p-8 text-blue-300 text-xl">データ読み込み中...</p>;
    }

    if (error) {
      return (
        <div className="flex justify-center items-center p-12">
          <div className="bg-red-900/30 text-pink-300 p-8 rounded-lg border border-pink-900 text-center">
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-pink-800 hover:bg-pink-700 text-white border-none rounded transition-colors"
            >
              再読み込み
            </button>
          </div>
        </div>
      );
    }

    if (!timetableData) {
      return <p className="text-center p-8 text-blue-300 text-xl">時刻表データがありません</p>;
    }

    const dayType = isHoliday ? "holiday" : "weekday";

    return (
      <div className="flex flex-col gap-8">
        {Object.entries(STATION_LAYOUT).map(([stationKey, directions]) => {
          // APIから取得したデータに駅情報があるか確認
          const stationData = stationsMap.get(stationKey);

          if (!stationData) {
            return (
              <div key={stationKey} className="bg-black/30 rounded-lg p-4">
                <h2 className="text-2xl font-bold text-white text-center mb-4 pb-2 border-b border-gray-700">
                  {stationKey}
                </h2>
                <p className="text-center p-4 text-gray-400 italic">データが取得できませんでした</p>
              </div>
            );
          }

          const leftDirectionData = stationData[directions.left];
          const rightDirectionData = stationData[directions.right];

          // JR線かどうかを判定（駅名に「ＪＲ」が含まれるか）
          const isJRStation = stationKey.includes('ＪＲ');

          return (
            <div key={stationKey} className="bg-black/30 rounded-lg p-4">
              <h2 className="text-2xl font-bold text-white text-center mb-4 pb-2 border-b border-gray-700">
                {stationKey}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leftDirectionData && (
                  <div className="bg-black rounded-lg p-4 border-2 border-gray-700 shadow-[0_0_15px_rgba(0,100,255,0.5)]">
                    <h3 className="text-xl font-bold text-amber-400 text-center mb-4 pb-2 border-b border-gray-700">
                      {directions.left.split(" ").slice(-2).join(" ")}
                    </h3>
                    {isJRStation 
                      // JR線の場合は直接配列データを使用
                      ? renderTimetable(leftDirectionData, directions.left)
                      // 近鉄線の場合は平日/休日を考慮
                      : renderTimetable(leftDirectionData[dayType], directions.left)}
                  </div>
                )}

                {rightDirectionData && (
                  <div className="bg-black rounded-lg p-4 border-2 border-gray-700 shadow-[0_0_15px_rgba(0,100,255,0.5)]">
                    <h3 className="text-xl font-bold text-amber-400 text-center mb-4 pb-2 border-b border-gray-700">
                      {directions.right.split(" ").slice(-2).join(" ")}
                    </h3>
                    {isJRStation
                      // JR線の場合は直接配列データを使用
                      ? renderTimetable(rightDirectionData, directions.right)
                      // 近鉄線の場合は平日/休日を考慮
                      : renderTimetable(rightDirectionData[dayType], directions.right)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {timetableData.lastUpdated && (
          <div className="text-center mt-4 text-gray-400 text-sm">
            最終更新: {new Date(timetableData.lastUpdated).toLocaleString('ja-JP')}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="bg-gray-900 text-white min-h-screen p-4">
      <div className="bg-black p-4 rounded-lg mb-6 text-center border-2 border-gray-700 shadow-[0_0_15px_rgba(0,100,255,0.5)]">
        <h1 className="text-2xl font-bold mb-1">電車時刻表</h1>
        <div className="flex justify-between my-2">
          <p>{formatDate()}</p>
          <p className="text-amber-400 font-bold">
            {isHoliday
              ? `休日ダイヤ${holidayName ? `（${holidayName}）` : ''}`
              : '平日ダイヤ'}
          </p>
        </div>
        <div className="mt-2">
          <p className="text-green-400 text-lg font-bold">
            {`現在時刻: ${currentHour.padStart(2, '0')}:${currentMinute < 10 ? '0' + currentMinute : currentMinute}`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {renderStationLayout()}
      </div>
    </main>
  );
}

export default App;
