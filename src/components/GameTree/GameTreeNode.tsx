import React from 'react';
import { Stone, GameTreeNodeProps } from '@/lib/types';

interface ExtendedGameTreeNodeProps extends GameTreeNodeProps {
  x: number;
  y: number;
}

export default function GameTreeNode({ 
  node, 
  isMainPath,
  isSelected,
  onClick,
  x,
  y
}: ExtendedGameTreeNodeProps) {
  const isBlack = node.data.move?.color === Stone.Black;
  const isRoot = node.id === 'root';
  const radius = isRoot ? 6 : 8;  // 노드 크기를 2배로 키웠습니다
  
  // 주석이 있는지 확인
  const hasComment = node.data.comment && node.data.comment.trim().length > 0;
  
  return (
    <g 
      transform={`translate(${x}, ${y})`}
      data-node-id={node.id}  // 노드 ID 추가
    >
      {/* 루트 노드는 마름모꼴로 표시 */}
      {isRoot ? (
        <>
          {/* 그림자 효과 */}
          <path
            d={`M 0 -${radius+1} L ${radius+1} 0 L 0 ${radius+1} L -${radius+1} 0 Z`}
            fill="rgba(0,0,0,0.2)"
            transform="translate(1, 1)"
            className="pointer-events-none"
          />
          
          <path
            d={`M 0 -${radius+1} L ${radius+1} 0 L 0 ${radius+1} L -${radius+1} 0 Z`}
            fill="#ffbf00"  // 황금색
            stroke="#00bcff" 
            strokeWidth={1.5}
            className="transition-colors cursor-pointer hover:opacity-80"
            onClick={() => onClick(node.id)}
          />
          
          {/* 선택 표시 */}
          {isSelected && (
            <path
              d={`M 0 -${radius+3} L ${radius+3} 0 L 0 ${radius+3} L -${radius+3} 0 Z`}
              fill="none"
              stroke="#00bcff"
              strokeWidth={2}
              strokeDasharray="2,2"
              className="pointer-events-none animate-pulse"
            />
          )}
        </>
      ) : (
        <>
          {/* 그림자 효과 */}
          <circle
            r={radius}
            fill="rgba(0,0,0,0.2)"
            cx={0.5}
            cy={0.5}
            className="pointer-events-none"
          />
          
          {/* 일반 노드 원 */}
          <circle
            r={radius}
            fill={isBlack ? '#000' : '#fff'}
            stroke={isMainPath ? '#00bcff' : '#9CA3AF'}
            strokeWidth={1.5}
            className="transition-colors cursor-pointer hover:opacity-80"
            onClick={() => onClick(node.id)}
          />
          
          {/* 변화도 표시 */}
          {node.children.length > 1 && (
            <circle
              r={2.5}
              cy={-radius - 2}
              fill="#ef4444" // 빨간색
              className="pointer-events-none"
            />
          )}
          
          {/* 주석 표시 */}
          {hasComment && (
            <circle
              r={2.5}
              cx={radius + 2}
              fill="#3b82f6" // 파란색
              className="pointer-events-none"
            />
          )}
          
          {/* 선택 표시 */}
          {isSelected && (
            <circle
              r={radius + 2}
              fill="none"
              stroke="#00bcff"
              strokeWidth={2}
              strokeDasharray="3,2"
              className="pointer-events-none animate-pulse"
            />
          )}
        </>
      )}
    </g>
  );
}