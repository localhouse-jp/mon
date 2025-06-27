import React, { memo } from 'react';

export interface RemainingTimeProps {
  minutes: number;
  format?: 'default' | 'compact';
  threshold?: number;
}

/**
 * 残り時間を表示するコンポーネント
 * - format: 'default'（あと○○分）または 'compact'（○○分）
 * - threshold: この分数以下でハイライト表示（デフォルト: 20分）
 */
const RemainingTime: React.FC<RemainingTimeProps> = ({
  minutes,
  format = 'default',
  threshold = 20
}) => {
  // 残り時間が閾値以下かどうかを判定
  const isAlmostTime = minutes <= threshold && minutes >= 0;

  // ハイライト用のスタイル
  const highlightStyle = isAlmostTime ? {
    borderRadius: '4px',
    padding: '4px 8px'
  } : {};

  // 表示用テキストのフォーマット
  const displayText = format === 'default'
    ? `（あと${minutes}分）`
    : `${minutes} 分前`;

  return (
    <span
      className={`${isAlmostTime ? 'bg-yellow-300 text-black font-bold' : 'text-gray-400'}`}
      style={highlightStyle}
    >
      {displayText}
    </span>
  );
};

export default memo(RemainingTime);