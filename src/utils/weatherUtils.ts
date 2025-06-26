import { CurrentWeather, WeatherResponse, TodayForecast } from '../types/timetable';
import { getWeatherConfig } from './envUtils';

// 動的にエンドポイントを構築する関数
async function buildWeatherEndpoint(): Promise<string | null> {
  const config = await getWeatherConfig();
  if (!config) {
    console.error('天気API設定が取得できませんでした');
    return null;
  }
  
  return `http://api.openweathermap.org/data/2.5/forecast?zip=${config.zipCode},${config.countryCode}&appid=${config.apiKey}&units=metric&lang=ja`;
}

/**
 * 今日の日付を "YYYY-MM-DD" 形式で返す
 */
function getTodayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 今日の全天気予報を取得
 */
export async function fetchTodayForecast(): Promise<TodayForecast | null> {
  try {
    const endpoint = await buildWeatherEndpoint();
    if (!endpoint) {
      return null;
    }

    const res = await fetch(endpoint);
    if (!res.ok) {
      console.error(`Weather API error: HTTP ${res.status} ${res.statusText}`);
      return null;
    }

    const data: WeatherResponse = await res.json();
    const city = data.city.name;
    const todayStr = getTodayDateString();

    // 今日分の予報データだけ抽出
    const todayList = data.list.filter(item => item.dt_txt.startsWith(todayStr));
    if (todayList.length === 0) {
      console.log('今日の予報データが見つかりませんでした。');
      return null;
    }

    // 現在時刻に最も近い予報を取得
    const now = new Date();
    const currentHour = now.getHours();
    
    const currentForecast = todayList.find(item => {
      const forecastHour = parseInt(item.dt_txt.slice(11, 13));
      return forecastHour >= currentHour;
    }) || todayList[todayList.length - 1];

    if (!currentForecast) {
      return null;
    }

    const currentWeather = currentForecast.weather[0];
    const currentTime = currentForecast.dt_txt.slice(11, 16);

    // 今日の全予報データを変換
    const forecasts = todayList.map(item => {
      const weather = item.weather[0];
      const time = item.dt_txt.slice(11, 16);
      
      return {
        time: time,
        temp: Math.round(item.main.temp),
        description: weather.description,
        icon: weather.icon,
        humidity: item.main.humidity,
        windSpeed: item.wind.speed
      };
    });

    return {
      current: {
        temp: Math.round(currentForecast.main.temp),
        description: currentWeather.description,
        icon: currentWeather.icon,
        time: currentTime
      },
      forecasts: forecasts,
      city: city
    };

  } catch (error) {
    console.error('Weather API error:', error);
    return null;
  }
}

/**
 * 現在時刻に最も近い天気予報を取得
 */
export async function fetchCurrentWeather(): Promise<CurrentWeather | null> {
  try {
    const endpoint = await buildWeatherEndpoint();
    if (!endpoint) {
      return null;
    }

    const res = await fetch(endpoint);
    if (!res.ok) {
      console.error(`Weather API error: HTTP ${res.status} ${res.statusText}`);
      return null;
    }

    const data: WeatherResponse = await res.json();
    const todayStr = getTodayDateString();

    // 今日分の予報データだけ抽出
    const todayList = data.list.filter(item => item.dt_txt.startsWith(todayStr));
    if (todayList.length === 0) {
      console.log('今日の予報データが見つかりませんでした。');
      return null;
    }

    // 現在時刻に最も近い予報を取得
    const now = new Date();
    const currentHour = now.getHours();
    
    // 現在時刻以降の最初の予報、または今日の最後の予報を取得
    const currentForecast = todayList.find(item => {
      const forecastHour = parseInt(item.dt_txt.slice(11, 13));
      return forecastHour >= currentHour;
    }) || todayList[todayList.length - 1];

    if (!currentForecast) {
      return null;
    }

    const weather = currentForecast.weather[0];
    const time = currentForecast.dt_txt.slice(11, 16); // "hh:mm"

    return {
      temp: Math.round(currentForecast.main.temp),
      description: weather.description,
      icon: weather.icon,
      time: time
    };

  } catch (error) {
    console.error('Weather API error:', error);
    return null;
  }
}

/**
 * 天気アイコンのエモジマッピング
 */
export function getWeatherEmoji(iconCode: string): string {
  const iconMap: Record<string, string> = {
    '01d': '☀️', // clear sky day
    '01n': '🌙', // clear sky night
    '02d': '⛅', // few clouds day
    '02n': '☁️', // few clouds night
    '03d': '☁️', // scattered clouds
    '03n': '☁️', // scattered clouds
    '04d': '☁️', // broken clouds
    '04n': '☁️', // broken clouds
    '09d': '🌧️', // shower rain
    '09n': '🌧️', // shower rain
    '10d': '🌦️', // rain day
    '10n': '🌧️', // rain night
    '11d': '⛈️', // thunderstorm
    '11n': '⛈️', // thunderstorm
    '13d': '❄️', // snow
    '13n': '❄️', // snow
    '50d': '🌫️', // mist
    '50n': '🌫️', // mist
  };
  
  return iconMap[iconCode] || '🌤️';
}