import React, { memo } from 'react';
import { DisplayDirection, DisplayTrain } from '../types/timetable';
import { formatRemainingTime } from '../utils/timeUtils';

interface TrainItemProps {
  train: DisplayTrain;
  color: string;
}

// 電車1件分の情報を表示するコンポーネント
const TrainItem: React.FC<TrainItemProps> = ({ train, color }) => {
  // 残り時間が20分以下かどうかを判定
  const isAlmostTime = train.remainingMinutes <= 20 && train.remainingMinutes > 0;

  // 20分以下の場合のスタイル - 点滅せずにハイライトのみ
  const almostTimeStyle = isAlmostTime ? {
    backgroundColor: 'rgba(252, 211, 77, 0.3)',
    borderRadius: '4px',
    padding: '4px 8px'
  } : {};

  return (
    <div className={`flex justify-between items-center px-4 py-3 border-t border-gray-700`}>
      <span className="text-2xl font-bold" style={{ color }}>{train.time}</span>
      <span className="flex-1 mx-3 truncate text-lg text-gray-200">{train.destination}</span>
      <span
        className={`text-lg font-medium ${isAlmostTime ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}
        style={almostTimeStyle}
      >
        {formatRemainingTime(train.remainingMinutes)}
      </span>
    </div>
  );
};

// メモ化して不要な再レンダリングを防止
const MemoizedTrainItem = memo(TrainItem);

// 駅カードの表示用プロップス
interface StationCardProps {
  direction: DisplayDirection;
}

// 駅のカードを表示するコンポーネント
const StationCard: React.FC<StationCardProps> = ({ direction }) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-sm">
      {/* 方面のみを表示するヘッダー */}
      <div
        className="flex items-center px-4 py-2 bg-gray-700 border-l-4"
        style={{ borderColor: direction.color }}
      >
        <span className="text-base font-bold text-white truncate">{direction.title}</span>
      </div>

      {/* 列車リスト */}
      <div>
        {direction.trains.length > 0 ? (
          direction.trains.map((train, i) => (
            <MemoizedTrainItem key={i} train={train} color={direction.color} />
          ))
        ) : (
          <div className="text-center p-3 text-gray-400 italic text-sm">
            この時間帯の電車はありません
          </div>
        )}
      </div>
    </div>
  );
};

// メモ化して不要な再レンダリングを防止
export default memo(StationCard);