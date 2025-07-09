// 時刻表に関する型定義
export interface Train {
  hour: string;
  minute: string;
  destination: string;
  trainType: string;
  detailUrl?: string;
}

// バス時刻表の型定義
export interface BusTime {
  hour: number;
  minute: number;
  destination?: string;
  type?: string; // A日/B日など
}

export interface BusStop {
  stopName: string;
  routeName: string;
  operationType?: string; // 'A'または'B'
  schedule: {
    hour: number;
    minutes: number[];
  }[];
}

export interface DirectionData {
  weekday?: Train[];
  holiday?: Train[];
  // JR線の場合、weekday/holidayの区別がなく直接配列が入る可能性がある
  [key: string]: Train[] | undefined;
}

export interface StationDirections {
  [direction: string]: DirectionData;
}

export interface CompanyStations {
  [stationLine: string]: StationDirections;
}

export interface TimetableData {
  kintetsu?: CompanyStations;
  jr?: CompanyStations;
  kintetsuBus?: {
    stops?: BusStop[];
    operationType?: string; // 'A'または'B'
    date?: string;
  };
  osakaBus?: {
    stops?: BusStop[];
    operationType?: string; // 'A'または'B'
    date?: string;
  };
  [company: string]: CompanyStations | undefined | string | { stops?: BusStop[], operationType?: string, date?: string };  // stringを追加して lastUpdated を許可
  lastUpdated: string;
}

// 遅延情報の型定義
export interface DelayInfo {
  servertime: string;
  status: string;
  disruptions?: {
    route: string;
    status: string;
    cause: string;
    detailUrl: string;
  }[];
}

export interface DelayResponse {
  kintetsu: DelayInfo;
  jr?: DelayInfo | null;
}

// UI表示用の型定義
export interface DisplayTrain {
  time: string;
  destination: string;
  type: string;
  remainingMinutes: number;
}

export interface DisplayDirection {
  station: string;
  title: string;
  color: string;
  trains: DisplayTrain[];
  isBus?: boolean;
}

// 2列に表示する駅と方向の定義
export const STATION_LAYOUT = {
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

// 路線カラー定義
export const LINE_COLORS = {
  "奈良線": "#E60012",  // 近鉄奈良線: 赤
  "大阪線": "#F8B400",  // 近鉄大阪線: 黄
  "ＪＲ俊徳道駅": "#009944",  // JRおおさか東線: 緑
  "近鉄バス": "#58A6FF",  // 近鉄バス: 青
  "大阪バス": "#FF8C00",  // 大阪バス: オレンジ
};

// バス停のルート定義
export const BUS_ROUTES = {
  "近畿大学東門前": {
    routes: ["八戸ノ里駅前→近畿大学東門前", "近畿大学東門前→八戸ノ里駅前"]
  },
  "八戸ノ里駅前": {
    routes: ["八戸ノ里駅前→近畿大学東門前", "近畿大学東門前→八戸ノ里駅前"]
  },
  "俊徳道駅": {
    routes: ["近畿大学東門前→俊徳道駅", "俊徳道駅→近畿大学東門前"]
  }
};

// 天気情報の型定義
export interface WeatherInfo {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface WeatherMain {
  temp: number;
  temp_max: number;
  temp_min: number;
  humidity: number;
}

export interface WeatherWind {
  speed: number;
}

export interface WeatherForecastItem {
  dt: number;
  dt_txt: string;
  main: WeatherMain;
  weather: WeatherInfo[];
  wind: WeatherWind;
}

export interface WeatherResponse {
  cod: string;
  message: number;
  cnt: number;
  list: WeatherForecastItem[];
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
  };
}

export interface CurrentWeather {
  temp: number;
  description: string;
  icon: string;
  time: string;
}

export interface TodayForecast {
  current: CurrentWeather;
  forecasts: {
    time: string;
    temp: number;
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
  }[];
  city: string;
}