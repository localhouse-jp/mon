import { useEffect, useState } from "react";
import "./App.css";
import TrainBoard from "./TrainBoard";
import { DelayResponse, StationDirections, TimetableData } from "./types/timetable";
import { createStationsMap, fetchTimetableData } from "./utils/apiUtils";
import { fetchHolidayStatus } from "./utils/timeUtils";
import { getApiBaseUrl } from "./utils/configUtils";

function App() {
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null);
  const [stationsMap, setStationsMap] = useState<Map<string, StationDirections>>(new Map());
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // 遅延情報の状態
  const [delayResponse, setDelayResponse] = useState<DelayResponse | null>(null);

  // APIからデータを取得して整形する
  useEffect(() => {
    // 時刻表データをAPIから取得
    setLoading(true);
    console.log("API データ読み込み開始...");

    async function loadTimetableData() {
      try {
        const data = await fetchTimetableData();
        setTimetableData(data);
        const stationsData = createStationsMap(data);
        setStationsMap(stationsData);
      } catch (err: any) {
        console.error('時刻表データの読み込みエラー:', err);
        setError(`データ取得エラー: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadTimetableData();

    // 祝日データ取得
    fetchHolidaysData();
    // 遅延情報取得
    fetchDelayInfo();

    // 5分ごとにデータを再取得
    const intervalId = setInterval(() => {
      loadTimetableData();
      fetchHolidaysData();
      fetchDelayInfo();
    }, 300000);

    return () => clearInterval(intervalId);
  }, []);

  // 遅延情報を取得
  const fetchDelayInfo = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/delay`);
      if (!response.ok) throw new Error(`APIエラー: ${response.status}`);
      const data: DelayResponse = await response.json();
      console.log('遅延情報取得成功:', data);
      setDelayResponse(data);
    } catch (err) {
      console.error('遅延情報の取得に失敗しました:', err);
    }
  };

  // 祝日CSVデータを取得して解析する
  const fetchHolidaysData = async () => {
    const { isHoliday: holidayFlag, name: holidayNameLocal } = await fetchHolidayStatus();
    setIsHoliday(holidayFlag);
    setHolidayName(holidayNameLocal);
  };

  // TrainBoardコンポーネントをメインの表示として使用
  return (
    <TrainBoard
      timetableData={timetableData}
      stationsMap={stationsMap}
      isHoliday={isHoliday}
      holidayName={holidayName}
      loading={loading}
      error={error}
      delayResponse={delayResponse}
    />
  );
}

export default App;
