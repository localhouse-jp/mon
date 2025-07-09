import { useEffect, useState } from "react";
import "./App.css";
import TrainBoard from "./TrainBoard";
import { DelayResponse, StationDirections, TimetableData } from "./types/timetable";
import { createStationsMap, fetchTimetableData } from "./utils/apiUtils";
import { getApiBaseUrl, getClassApiUrl } from "./utils/configUtils";
import { fetchHolidayStatus } from "./utils/timeUtils";

function App() {
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null);
  const [stationsMap, setStationsMap] = useState<Map<string, StationDirections>>(new Map());
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // 遅延情報の状態
  const [delayResponse, setDelayResponse] = useState<DelayResponse | null>(null);
  const [currentClass, setCurrentClass] = useState<any>(null);
  const [nextClass, setNextClass] = useState<any>(null);

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
    // 現在の授業情報取得
    fetchCurrentClass();

    // 5分ごとにデータを再取得
    const intervalId = setInterval(() => {
      loadTimetableData();
      fetchHolidaysData();
      fetchDelayInfo();
      fetchCurrentClass();
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

  // 現在の授業情報を取得
  const fetchCurrentClass = async () => {
    try {
      const response = await fetch(getClassApiUrl());
      if (!response.ok) throw new Error(`APIエラー: ${response.status}`);
      const data = await response.json();

      const now = new Date();
      const currentClasses = [];
      const nextClasses = [];

      // Sort data by 'from' time to ensure correct order
      data.sort((a: any, b: any) => new Date(a.from).getTime() - new Date(b.from).getTime());

      // 現在進行中の授業を全て取得
      for (const item of data) {
        const fromTime = new Date(item.from);
        const toTime = new Date(item.to);

        if (now >= fromTime && now <= toTime) {
          currentClasses.push(item);
        }
      }

      // 次の授業を取得（現在の授業がない場合は最も近い授業、ある場合は現在の授業終了後の授業）
      if (currentClasses.length === 0) {
        // 現在の授業がない場合、最も近い次の授業を全て取得
        let nextStartTime = null;
        for (const item of data) {
          const fromTime = new Date(item.from);
          if (now < fromTime) {
            if (nextStartTime === null) {
              nextStartTime = fromTime.getTime();
            }
            // 同じ開始時間の授業を全て取得
            if (fromTime.getTime() === nextStartTime) {
              nextClasses.push(item);
            } else {
              break; // 次の時間帯に入ったら終了
            }
          }
        }
      } else {
        // 現在の授業がある場合、それらの終了後の授業を全て取得
        const latestEndTime = Math.max(...currentClasses.map(c => new Date(c.to).getTime()));
        let nextStartTime = null;
        for (const item of data) {
          const fromTime = new Date(item.from);
          if (fromTime.getTime() > latestEndTime) {
            if (nextStartTime === null) {
              nextStartTime = fromTime.getTime();
            }
            // 同じ開始時間の授業を全て取得
            if (fromTime.getTime() === nextStartTime) {
              nextClasses.push(item);
            } else {
              break; // 次の時間帯に入ったら終了
            }
          }
        }
      }

      setCurrentClass(currentClasses);
      setNextClass(nextClasses);
      console.log('現在の授業情報取得成功:', currentClasses);
      console.log('次の授業情報取得成功:', nextClasses);
    } catch (err) {
      console.error('現在の授業情報の取得に失敗しました:', err);
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
      currentClass={currentClass}
      nextClass={nextClass}
    />
  );
}

export default App;
