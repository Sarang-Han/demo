'use client';

import { Stone } from '@/lib/types';
import { 
  CaretDoubleLeft, 
  CaretLeft, 
  CaretRight, 
  CaretDoubleRight, 
  DownloadSimple, 
  FolderOpen, 
  PencilSimple, 
  StopCircle,
  X,
  Triangle,
  Square,
  Circle,
  TextAUnderline,
  NumberOne
} from '@phosphor-icons/react';
import { useState, useEffect } from 'react';

interface GameControlsProps {
  currentPlayer: Stone;
  blackScore: number;
  whiteScore: number;
  blackTerritory: number; 
  whiteTerritory: number;
  isGameEnded: boolean;
  onGoToStart?: () => void;
  onGoToEnd?: () => void;
  onPass: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: () => void;
  onSelectTool?: (tool: string) => void;
  selectedTool?: string;
  type: 'score' | 'controls' | 'game-end';
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export default function GameControls({
  currentPlayer,
  blackScore,
  whiteScore,
  blackTerritory,
  whiteTerritory,
  isGameEnded,
  onGoToStart,
  onGoToEnd,
  onPass,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  onSelectTool,
  selectedTool,
  onAnalyze,
  isAnalyzing = false,
  type
}: GameControlsProps) {
  // 마커 모달 상태 관리
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  // 화면 크기에 따른 UI 조정을 위한 상태
  const [viewportState, setViewportState] = useState({
    isMobile: false,
    isTablet: false
  });
  
  // 화면 크기 변화 감지
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setViewportState({
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024
      });
    };
    
    // 초기 실행
    handleResize();
    
    // 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 마커 모달이 열려있을 때 외부 클릭 감지하여 닫기
  useEffect(() => {
    if (!showMarkerModal) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.marker-modal') && !target.closest('.marker-toggle-btn')) {
        setShowMarkerModal(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMarkerModal]);

  // 점수 표시 영역 렌더링 함수
  if (type === 'score') {
    return (
      <div className="w-full flex justify-center mb-1">
        <div className={`
          flex items-center justify-center py-1
          ${viewportState.isMobile ? 'scale-85 transform' : 'scale-90 transform'}
        `}>
          {/* 흑 점수 */}
          <div className="flex items-center mr-1.5 sm:mr-3">
            <div className="bg-gray-100 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
              <span className="font-medium text-xs sm:text-xs">
                {isGameEnded ? blackScore + blackTerritory : blackScore}
              </span>
            </div>
          </div>
          
          {/* 흑 레이블 */}
          <div className="text-xs sm:text-sm font-bold mr-1">
            Black
          </div>
          
          <div className="relative w-12 h-7 mx-1 sm:w-14 sm:h-8 sm:mx-1.5">
            {/* 흑 원 */}
            <div className={`absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black transition-all duration-300 ${
              currentPlayer === Stone.Black ? 'z-10 left-0 top-0' : 'z-0 left-0 top-0'
            }`} />
            {/* 백 원 */}
            <div className={`absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-black transition-all duration-300 ${
              currentPlayer === Stone.White ? 'z-10 left-5 sm:left-6 top-0' : 'z-0 left-5 sm:left-6 top-0'
            }`} />
          </div>
          
          {/* 백 레이블 */}
          <div className="text-xs sm:text-sm font-bold ml-1">
            White
          </div>
          
          {/* 백 점수 */}
          <div className="flex items-center ml-1.5 sm:ml-3">
            <div className="bg-gray-100 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
              <span className="font-medium text-xs sm:text-xs">
                {isGameEnded ? whiteScore + whiteTerritory : whiteScore}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // 게임 종료 알림 영역 렌더링 함수 (하단에 표시)
  if (type === 'game-end' && isGameEnded) {
    return (
      <div className="w-full text-center mt-2 p-2 sm:p-3 bg-yellow-100 rounded mb-4 sm:mb-5">
        <p className="text-sm sm:text-base">게임이 종료되었습니다.</p>
        <p className="text-sm sm:text-base">돌을 클릭하여 영역을 확인하세요.</p>
      </div>
    );
  }
  
  // 메인 컨트롤 바 렌더링 (하단에 표시)
  if (type === 'controls') {
    return (
      <div className="w-full mt-1">
        <div className={`
          flex justify-center items-center 
          ${viewportState.isMobile ? 'gap-1 scale-90 transform' : viewportState.isTablet ? 'gap-2' : 'gap-4'}
        `}>
          {/* 맨 앞으로 - 모바일에서는 숨김 */}
          {!viewportState.isMobile && (
            <button onClick={onGoToStart} className="p-2 text-black hover:bg-gray-100 rounded-full transition">
              <CaretDoubleLeft weight="regular" size={viewportState.isTablet ? 20 : 24} />
            </button>
          )}
          
          {/* 이전 */}
          <button onClick={onUndo} className="p-1.5 sm:p-2 text-black hover:bg-gray-100 rounded-full transition">
            <CaretLeft weight="regular" size={viewportState.isMobile ? 18 : viewportState.isTablet ? 20 : 24} />
          </button>
          
          {/* 다음 */}
          <button onClick={onRedo} className="p-1.5 sm:p-2 text-black hover:bg-gray-100 rounded-full transition">
            <CaretRight weight="regular" size={viewportState.isMobile ? 18 : viewportState.isTablet ? 20 : 24} />
          </button>
          
          {/* 맨 뒤로 - 모바일에서는 숨김 */}
          {!viewportState.isMobile && (
            <button onClick={onGoToEnd} className="p-2 text-black hover:bg-gray-100 rounded-full transition">
              <CaretDoubleRight weight="regular" size={viewportState.isTablet ? 20 : 24} />
            </button>
          )}
          
          {/* 게임 종료 (패스) */}
          <button onClick={onPass} disabled={isGameEnded} className="p-1.5 sm:p-2 text-black hover:bg-gray-100 rounded-full transition disabled:opacity-50">
            <StopCircle weight="regular" size={viewportState.isMobile ? 18 : viewportState.isTablet ? 20 : 24} />
          </button>
          
          {/* 구분선 */}
          <div className="h-6 sm:h-8 w-px bg-gray-200 mx-1 sm:mx-2"></div>
          
          {/* 저장 */}
          <button onClick={onSave} className="p-1.5 sm:p-2 text-black hover:bg-gray-100 rounded-full transition">
            <DownloadSimple weight="regular" size={viewportState.isMobile ? 18 : viewportState.isTablet ? 20 : 24} />
          </button>
          
          {/* 불러오기 */}
          <button onClick={onLoad} className="p-1.5 sm:p-2 text-black hover:bg-gray-100 rounded-full transition">
            <FolderOpen weight="regular" size={viewportState.isMobile ? 18 : viewportState.isTablet ? 20 : 24} />
          </button>
          
          {/* AI 분석 - 모바일에서는 숨김 */}
          {!viewportState.isMobile && (
            <button 
              onClick={onAnalyze} 
              disabled={isAnalyzing}
              className="p-1.5 sm:p-2 text-black hover:bg-gray-100 rounded-full transition disabled:opacity-50"
              title="AI로 기보 분석"
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-t-transparent border-black rounded-full animate-spin" />
              ) : (
                <span className="font-bold text-xs sm:text-base">AI</span>
              )}
            </button>
          )}
          
          {/* 구분선 */}
          <div className="h-6 sm:h-8 w-px bg-gray-200 mx-1 sm:mx-2"></div>
          
          {/* 편집 도구 (마커) */}
          <div className="relative">
            <button 
              onClick={() => setShowMarkerModal(!showMarkerModal)}
              className={`marker-toggle-btn p-1.5 sm:p-2 ${selectedTool && selectedTool !== 'move' ? 'bg-gray-100' : 'hover:bg-gray-100'} rounded-full transition text-black cursor-pointer relative`}
              title="마커 도구 선택"
            >
              <PencilSimple weight="regular" size={viewportState.isMobile ? 18 : viewportState.isTablet ? 20 : 24} />
            </button>
            
            {/* 마커 도구 팝업 - 애니메이션 및 디자인 개선 */}
            {showMarkerModal && (
              <div 
                className="marker-modal absolute bottom-full mb-3 right-0"
                style={{ 
                  zIndex: 50,
                  transform: 'translateX(10%)',
                  animation: 'fadeIn 0.15s ease-out' 
                }}
              >
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 flex flex-col gap-2.5 min-w-[48px]">
                  {/* 마커 버튼들 - 디자인 통일 */}
                  <button 
                    onClick={() => {
                      onSelectTool?.(selectedTool === 'cross' ? 'move' : 'cross');
                      setShowMarkerModal(false);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${selectedTool === 'cross' ? 'bg-gray-200 text-black font-bold' : 'hover:bg-gray-100 text-black'}`}
                    title="X 마커"
                  >
                    <X weight="bold" size={18} />
                  </button>
                  
                  <button 
                    onClick={() => {
                      onSelectTool?.(selectedTool === 'triangle' ? 'move' : 'triangle');
                      setShowMarkerModal(false);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${selectedTool === 'triangle' ? 'bg-gray-200 text-black font-bold' : 'hover:bg-gray-100 text-black'}`}
                    title="삼각형 마커"
                  >
                    <Triangle weight="bold" size={18} />
                  </button>
                  
                  <button 
                    onClick={() => {
                      onSelectTool?.(selectedTool === 'square' ? 'move' : 'square');
                      setShowMarkerModal(false);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${selectedTool === 'square' ? 'bg-gray-200 text-black font-bold' : 'hover:bg-gray-100 text-black'}`}
                    title="사각형 마커"
                  >
                    <Square weight="bold" size={18} />
                  </button>
                  
                  <button 
                    onClick={() => {
                      onSelectTool?.(selectedTool === 'circle' ? 'move' : 'circle');
                      setShowMarkerModal(false);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${selectedTool === 'circle' ? 'bg-gray-200 text-black font-bold' : 'hover:bg-gray-100 text-black'}`}
                    title="원형 마커"
                  >
                    <Circle weight="bold" size={18} />
                  </button>
                  
                  <button 
                    onClick={() => {
                      onSelectTool?.(selectedTool === 'letter' ? 'move' : 'letter'); 
                      setShowMarkerModal(false);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${selectedTool === 'letter' ? 'bg-gray-200 text-black font-bold' : 'hover:bg-gray-100 text-black'}`}
                    title="알파벳 마커"
                  >
                    <TextAUnderline weight="bold" size={18} />
                  </button>
                  
                  <button 
                    onClick={() => {
                      onSelectTool?.(selectedTool === 'number' ? 'move' : 'number');
                      setShowMarkerModal(false);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${selectedTool === 'number' ? 'bg-gray-200 text-black font-bold' : 'hover:bg-gray-100 text-black'}`}
                    title="숫자 마커"
                  >
                    <NumberOne weight="bold" size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // 기본 반환값
  return null;
}