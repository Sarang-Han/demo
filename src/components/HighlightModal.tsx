'use client';

import React, { useState } from 'react';
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { HighlightData } from './LeftSidebar';
import { Stone } from '@/lib/types';
import { cn } from '@/lib/utils';

interface HighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: HighlightData[];
  onMoveToPosition: (moveNum: number) => void;
}

export default function HighlightModal({ 
  isOpen, 
  onClose, 
  highlights,
  onMoveToPosition 
}: HighlightModalProps) {
  const [currentHighlight, setCurrentHighlight] = useState(0);
  
  if (!isOpen || !highlights || highlights.length === 0) return null;

  const goToPrevHighlight = () => {
    setCurrentHighlight(prev => Math.max(0, prev - 1));
  };

  const goToNextHighlight = () => {
    setCurrentHighlight(prev => Math.min(highlights.length - 1, prev + 1));
  };

  const highlight = highlights[currentHighlight];
  
  const handleMoveToPosition = () => {
    onMoveToPosition(highlight.startMove);
    onClose();
  };

  // 작은 바둑판 렌더링
  const renderMiniBoard = () => {
    if (!highlight.boardSnapshot) return (
      <div className="flex items-center justify-center w-28 h-28 bg-gray-100 rounded-md">
        <p className="text-xs text-gray-500">스냅샷 없음</p>
      </div>
    );

    return (
      <div className="relative w-28 h-28 bg-[#DCBB69] rounded shadow-md">
        {/* 19x19 바둑판 그리드 */}
        <div className="absolute inset-0 grid grid-cols-19 grid-rows-19">
          {Array.from({ length: 19 * 19 }).map((_, index) => {
            const x = index % 19;
            const y = Math.floor(index / 19);
            
            // 해당 위치의 돌 정보 - 옵셔널 체이닝으로 안전하게 접근
            const stone = highlight.boardSnapshot?.[x]?.[y]?.stone;
            
            return (
              <div 
                key={`${x}-${y}`} 
                className="relative"
              >
                {/* 격자 표시 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-black opacity-70"></div>
                  <div className="h-full w-px bg-black opacity-70"></div>
                </div>
                
                {/* 돌 표시 */}
                {stone === Stone.Black && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-black shadow-sm"></div>
                  </div>
                )}
                {stone === Stone.White && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-white border border-gray-300 shadow-sm"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold flex items-center">
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded mr-2">
              AI 하이라이트
            </span>
            <span>총 {highlights.length}개의 주요 국면</span>
          </h3>
          
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} weight="bold" />
          </button>
        </div>
        
        <div className="flex items-center mb-3">
          <button 
            onClick={goToPrevHighlight}
            disabled={currentHighlight === 0}
            className={cn(
              "p-1 rounded hover:bg-gray-100", 
              currentHighlight === 0 ? "text-gray-300" : "text-gray-700"
            )}
          >
            <CaretLeft size={20} weight="bold" />
          </button>
          
          <span className="mx-2 text-sm text-gray-600">
            {currentHighlight + 1} / {highlights.length}
          </span>
          
          <button 
            onClick={goToNextHighlight}
            disabled={currentHighlight === highlights.length - 1}
            className={cn(
              "p-1 rounded hover:bg-gray-100", 
              currentHighlight === highlights.length - 1 ? "text-gray-300" : "text-gray-700"
            )}
          >
            <CaretRight size={20} weight="bold" />
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 flex items-start">
          {/* 미니 바둑판 */}
          <div className="flex-shrink-0 mr-4">
            {renderMiniBoard()}
            <button 
              onClick={handleMoveToPosition}
              className="mt-2 w-full text-xs bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600 transition-colors"
            >
              이동
            </button>
          </div>
          
          {/* 하이라이트 설명 */}
          <div className="flex-grow">
            <h4 className="font-medium text-base mb-1">
              {highlight.startMove}~{highlight.endMove}수: 주요 국면
            </h4>
            <p className="text-sm text-gray-700">{highlight.description}</p>
          </div>
        </div>
        
        {/* 스크롤 표시기 */}
        <div className="mt-3 flex justify-center">
          {highlights.map((_, index) => (
            <button
              key={index}
              className={`mx-0.5 w-2 h-2 rounded-full ${
                index === currentHighlight ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              onClick={() => setCurrentHighlight(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}