import { useEffect, useState } from "react";
import "./App.css";

// 新しいデータ構造の型定義
interface Train {
  hour: string;
  minute: string;
  destination: string;
  trainType: string;
  detailUrl?: string;
}

interface DirectionData {
  weekday: Train[];
  holiday: Train[];
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

function App() {
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
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

        // データの整形と会社選択の処理
        const companies = Object.keys(data).filter(key => key !== 'lastUpdated');
        console.log("検出された会社:", companies);

        if (companies.length > 0) {
          const firstCompany = companies[0];
          setSelectedCompany(firstCompany);
          console.log("選択された会社:", firstCompany);

          // 最初の会社の全駅データをMapに変換
          if (data[firstCompany]) {
            const stationsData = new Map<string, StationDirections>();
            Object.entries(data[firstCompany] as CompanyStations).forEach(([stationKey, directions]) => {
              console.log("駅データ処理:", stationKey);
              stationsData.set(stationKey, directions);
            });
            console.log("駅データ処理完了:", Array.from(stationsData.keys()));
            setStationsMap(stationsData);
          } else {
            console.error("選択された会社のデータがありません:", firstCompany);
          }
        } else {
          console.error("会社データが見つかりません");
        }

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

  // 時刻表を時間ごとにグループ化する関数
  const groupTimetableByHour = (trains) => {
    if (!trains) return {};

    return trains.reduce((grouped, train) => {
      if (!grouped[train.hour]) {
        grouped[train.hour] = [];
      }
      grouped[train.hour].push(train);
      return grouped;
    }, {});
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

  // エラー表示
  const renderError = () => {
    return (
      <div className="error-container">
        <div className="error-message">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="reload-button"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  };

  // 最終更新日時の表示
  const renderLastUpdated = () => {
    if (!timetableData?.lastUpdated) return null;

    try {
      const updateDate = new Date(timetableData.lastUpdated);
      const year = updateDate.getFullYear();
      const month = updateDate.getMonth() + 1;
      const day = updateDate.getDate();
      const hours = updateDate.getHours().toString().padStart(2, '0');
      const minutes = updateDate.getMinutes().toString().padStart(2, '0');

      return (
        <div className="last-updated">
          最終更新: {year}年{month}月{day}日 {hours}:{minutes}
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  // 全ての駅のデータを表示
  const renderAllStations = () => {
    if (loading) {
      return <p className="loading-text">データ読み込み中...</p>;
    }

    if (error) {
      return renderError();
    }

    if (!timetableData || !selectedCompany) {
      return <p className="loading-text">時刻表データがありません</p>;
    }

    console.log("レンダリング開始:", selectedCompany);
    console.log("駅数:", stationsMap.size);

    const dayType = isHoliday ? "holiday" : "weekday";
    const companyLabel = selectedCompany === "kintetsu" ? "近鉄" : selectedCompany === "jr" ? "JR" : selectedCompany;

    return (
      <div className="all-directions">
        <div className="company-header">{companyLabel}</div>
        {Array.from(stationsMap.entries()).map(([stationKey, directions]) => {
          console.log("駅レンダリング:", stationKey, directions);
          return (
            <div key={stationKey} className="station-container">
              <h2 className="station-header">{stationKey}</h2>
              {Object.entries(directions).map(([directionKey, directionData]) => {
                console.log("方向レンダリング:", directionKey, directionData);
                const directionTrains = directionData[dayType] || [];
                console.log("電車データ:", directionTrains.length, "件");

                // 現在時刻以降の電車をフィルタリング
                let upcomingTrains = [];
                directionTrains.forEach(train => {
                  if (train.hour && train.minute) { // hourとminuteがあるかチェック
                    const hourNum = parseInt(train.hour);
                    const currentHourNum = parseInt(currentHour);
                    const trainMinute = parseInt(train.minute);

                    if (hourNum > currentHourNum ||
                      (hourNum === currentHourNum && trainMinute >= currentMinute)) {
                      upcomingTrains.push(train);
                    }
                  }
                });

                // 直近4件に制限して表示
                upcomingTrains = upcomingTrains.slice(0, 4);

                return (
                  <div key={directionKey} className="direction-container">
                    <h3 className="direction-header">{directionKey}</h3>
                    <div className="upcoming-trains">
                      {upcomingTrains.length === 0 ? (
                        <div className="no-trains">この時間帯の電車はありません</div>
                      ) : (
                        upcomingTrains.map((train, index) => {
                          const isNearCurrent = train.hour === currentHour &&
                            Math.abs(parseInt(train.minute) - currentMinute) < 10;

                          // 残り時間を計算
                          const remainingMinutes = calculateRemainingTime(train.hour, train.minute);
                          const remainingTimeText = formatRemainingTime(remainingMinutes);

                          return (
                            <div
                              key={index}
                              className={`train-item ${isNearCurrent ? 'current-train' : ''}`}
                            >
                              <div className="train-time">
                                <span className="train-hour">{train.hour}</span>
                                <span className="time-separator">:</span>
                                <span className="train-minute">{train.minute.padStart(2, '0')}</span>
                              </div>
                              <div className="train-info">
                                <div className="train-destination">{train.destination}</div>
                                <div className="train-details">
                                  <span className="train-type">{train.trainType}</span>
                                  <span className="remaining-time">{remainingTimeText}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {renderLastUpdated()}
      </div>
    );
  };

  return (
    <main className="bg-gray-900 text-white min-h-screen p-4">
      <div className="header">
        <h1 className="text-2xl font-bold mb-1">電車時刻表</h1>
        <div className="date-display">
          <p>{formatDate()}</p>
          <p className="schedule-type">
            {isHoliday
              ? `休日ダイヤ${holidayName ? `（${holidayName}）` : ''}`
              : '平日ダイヤ'}
          </p>
        </div>
        <div className="time-display">
          <p className="current-time-display">
            {`現在時刻: ${currentHour.padStart(2, '0')}:${currentMinute < 10 ? '0' + currentMinute : currentMinute}`}
          </p>
        </div>
      </div>

      {renderAllStations()}
    </main>
  );
}

export default App;
