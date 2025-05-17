import React, { memo } from 'react';
import RemainingTime from './common/RemainingTime';

interface BusItemProps {
  time: string;
  remainingMinutes: number;
}

// バス1件分の情報を表示するコンポーネント
const BusItem: React.FC<BusItemProps> = ({ time, remainingMinutes }) => {
  return (
    <div className="flex justify-center items-center px-4 py-3 border-t border-card-dark">
      <span className="text-2xl font-monno font-bold text-accent-time">{time}</span>
      <span className="ml-3 text-text-secondary">
        <RemainingTime minutes={remainingMinutes} format="default" />
      </span>
    </div>
  );
};

export default memo(BusItem);