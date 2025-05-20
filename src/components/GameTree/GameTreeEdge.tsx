import React from 'react';

interface GameTreeEdgeProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isMainLine: boolean;
}

export default function GameTreeEdge({ 
  x1, 
  y1, 
  x2, 
  y2, 
  isMainLine 
}: GameTreeEdgeProps) {
  // 수직 방향 이동인지 확인
  const isVertical = x1 === x2;
  
  // 커브의 제어점 계산 - 훨씬 완만한 곡선으로
  const midY = (y1 + y2) / 2;
  
  // 경로 생성
  let path;
  if (isVertical) {
    path = `M ${x1} ${y1} L ${x2} ${y2}`;
  } else {
    // 베지어 커브는 오직 수평 변경일 때만 사용
    path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  }

  return (
    <path
      d={path}
      fill="none"
      stroke={isMainLine ? '#00bcff' : '#9CA3AF'}
      strokeWidth={isMainLine ? 2 : 1.5}
      strokeLinecap="round"
      strokeOpacity={1} // 투명도 100%로 설정
      className="transition-colors"
      vectorEffect="non-scaling-stroke" // SVG 크기 변경시에도 선 두께 일정하게
    />
  );
}