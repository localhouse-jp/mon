import React, { memo } from 'react';
import RemainingTime from './common/RemainingTime';

interface BusItemProps {
  time: string;
  remainingMinutes: number;
}

// バス1件分の情報を表示するコンポーネント
const BusItem: React.FC<BusItemProps> = ({ time, remainingMinutes }) => {
  return (
    <div className="flex justify-between items-center px-4 py-3 border-t border-gray-700">
      <span className="text-2xl font-bold font-mono text-blue-400">{time}</span>
      <RemainingTime minutes={remainingMinutes} format="compact" />
    </div>
  );
};

export default memo(BusItem);