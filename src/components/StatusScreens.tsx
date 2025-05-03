import React from 'react';

// ローディング画面
export const LoadingScreen: React.FC = () => (
  <div className="w-screen h-screen bg-gray-900 text-white font-sans flex items-center justify-center">
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-300 mb-4">データ読み込み中...</div>
      <div className="animate-pulse flex space-x-2 justify-center">
        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
      </div>
    </div>
  </div>
);

// エラー画面
interface ErrorScreenProps {
  message: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ message }) => (
  <div className="w-screen h-screen bg-gray-900 text-white font-sans flex items-center justify-center">
    <div className="bg-red-900/30 text-pink-300 p-8 rounded-lg border border-pink-900 text-center max-w-md">
      <p className="text-xl font-bold mb-4">エラーが発生しました</p>
      <p className="mb-6">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-pink-800 hover:bg-pink-700 text-white border-none rounded transition-colors"
      >
        再読み込み
      </button>
    </div>
  </div>
);

// データなし画面
export const NoDataScreen: React.FC = () => (
  <div className="w-screen h-screen bg-gray-900 text-white font-sans flex items-center justify-center">
    <div className="text-center">
      <div className="text-2xl font-bold text-amber-300 mb-4">時刻表データがありません</div>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white border-none rounded transition-colors"
      >
        再読み込み
      </button>
    </div>
  </div>
);