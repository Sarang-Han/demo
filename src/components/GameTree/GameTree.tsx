import React, { type ReactElement } from 'react';
import { GameNode, type GameTree as GameTreeType } from '@/lib/types';
import GameTreeNode from './GameTreeNode';
import GameTreeEdge from './GameTreeEdge'; // 별도 컴포넌트 사용
import { calculateTreeLayout } from '@/lib/treeLayout';

interface GameTreeProps {
  gameTree: GameTreeType;
  onNodeClick: (nodeId: string) => void;
  gridSize?: number;
}

export default function GameTree({ 
  gameTree, 
  onNodeClick,
  gridSize = 30
}: GameTreeProps) {
  const layout = calculateTreeLayout(gameTree);
  
  // 노드 캐시
  const nodeCache = new Map<string, GameNode>();

  // 노드 찾기 함수
  const findNodeById = (nodeId: string): GameNode | null => {
    if (nodeCache.has(nodeId)) {
      return nodeCache.get(nodeId)!;
    }

    const traverse = (node: GameNode): GameNode | null => {
      if (node.id === nodeId) return node;
      for (const child of node.children) {
        const found = traverse(child);
        if (found) return found;
      }
      return null;
    };

    const result = traverse(gameTree.root);
    if (result) {
      nodeCache.set(nodeId, result);
    }
    return result;
  };

  const renderEdges = () => {
    const edges: ReactElement[] = [];
    
    function addEdge(from: GameNode, to: GameNode) {
      const fromPos = layout.positions.get(from.id);
      const toPos = layout.positions.get(to.id);
      
      if (!fromPos || !toPos) {
        return;
      }
      
      const x1 = fromPos.x * gridSize;
      const y1 = fromPos.y * gridSize;
      const x2 = toPos.x * gridSize;
      const y2 = toPos.y * gridSize;
      
      // x좌표가 같으면 메인라인이지만, 여기서는 gameTree.mainPath로 확인
      const isInMainPath = gameTree.mainPath.has(to.id);
      
      edges.push(
        <GameTreeEdge
          key={`${from.id}-${to.id}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          isMainLine={isInMainPath}
        />
      );
    }

    function traverse(node: GameNode) {
      if (!node || !node.children) {
        return;
      }

      node.children.forEach(child => {
        if (child) {
          addEdge(node, child);
          traverse(child);
        }
      });
    }

    traverse(gameTree.root);
    return edges;
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 min-w-[180px]">
        <svg 
          width={layout.width * gridSize + 20} 
          height={layout.height * gridSize + 20}
          className="overflow-visible bg-transparent"
          viewBox={`-10 -10 ${layout.width * gridSize + 20} ${layout.height * gridSize + 20}`}
        >
          {/* 엣지 렌더링 향상을 위한 설정 */}
          <defs>
            <filter id="crisp-edges">
              <feFlood x="0" y="0" width="100%" height="100%" floodColor="none" />
              <feComposite in="SourceGraphic" operator="over" />
            </filter>
          </defs>
          
          {/* 배경을 명시적으로 투명하게 설정 */}
          <rect
            x="-10"
            y="-10"
            width={layout.width * gridSize + 40}
            height={layout.height * gridSize + 40}
            fill="transparent"
          />
          
          {/* 연결선 먼저 그리기 */}
          <g className="connections">
            {renderEdges()}
          </g>
          
          {/* 노드는 나중에 그려서 선 위에 올라가도록 */}
          <g className="nodes">
            {Array.from(layout.positions.entries()).map(([id, pos]) => {
              const node = findNodeById(id);
              if (!node) return null;
              
              return (
                <GameTreeNode
                  key={id}
                  node={node}
                  isMainPath={gameTree.mainPath.has(id)}
                  isSelected={id === gameTree.currentNodeId}
                  onClick={onNodeClick}
                  x={pos.x * gridSize}
                  y={pos.y * gridSize}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}