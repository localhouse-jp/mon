import React from 'react';

interface BusItemProps {
  time: string;
  remainingMinutes: number;
  color: string;
}

// バス1件分の情報を表示するコンポーネント
const BusItem: React.FC<BusItemProps> = ({ time, remainingMinutes, color }) => {
  // 残り時間が20分以下かどうかを判定
  const isAlmostTime = remainingMinutes <= 20 && remainingMinutes > 0;
  
  // 20分以下の場合のスタイル - 点滅せずにハイライトのみ
  const almostTimeStyle = isAlmostTime ? {
    backgroundColor: 'rgba(252, 211, 77, 0.3)',
    borderRadius: '4px',
    padding: '4px 8px'
  } : {};

  return (
    <div className="flex justify-center items-center px-4 py-3 border-t border-gray-700">
      <span className="text-2xl font-bold" style={{ color }}>{time}</span>
      <span 
        className={`text-white ml-3 ${isAlmostTime ? 'text-yellow-400 font-bold' : ''}`}
        style={almostTimeStyle}
      >
        （あと{remainingMinutes}分）
      </span>
    </div>
  );
};

export default React.memo(BusItem);