import { useEffect, useState } from "react";
import "./App.css";
import TrainBoard from "./TrainBoard";
import { StationDirections, TimetableData } from "./types/timetable";

function App() {
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null);
  const [stationsMap, setStationsMap] = useState<Map<string, StationDirections>>(new Map());
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        // 近鉄バスデータの構造を詳細に確認
        if (data.kintetsuBus) {
          console.log("近鉄バスデータの構造:", JSON.stringify(data.kintetsuBus, null, 2));
        } else {
          console.log("近鉄バスデータがありません");
        }

        // 今日の日付を取得してバスの運行タイプを確認
        const today = formatDateToYYYYMMDD(new Date());
        if (!data.kintetsuBus) {
          // kintetsuBusがない場合、専用エンドポイントから取得を試みる
          try {
            const busResponse = await fetch(`http://localhost:3000/api/kintetsu-bus/calendar/${today}`);
            if (busResponse.ok) {
              const busData = await busResponse.json();
              data.kintetsuBus = busData;
              console.log("近鉄バスデータ取得成功:", busData);
            }
          } catch (busErr) {
            console.error('近鉄バスデータの取得に失敗:', busErr);
          }
        }

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
          if (company !== "kintetsu" && company !== "jr" && company !== "kintetsuBus" && company !== "lastUpdated" && stations) {
            Object.entries(stations).forEach(([stationKey, directions]) => {
              stationsData.set(stationKey, directions);
            });
          }
        });

        console.log("駅データ処理完了:", Array.from(stationsData.keys()));
        setStationsMap(stationsData);
        setLoading(false);
      } catch (err: any) {
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
      const holidaysMap: Record<string, string> = {};

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
  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    />
  );
}

export default App;
