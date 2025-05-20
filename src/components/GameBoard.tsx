'use client';
import { Game } from '@/lib/game';
import * as FileSaver from 'file-saver';
import { useCallback, useEffect, useRef, useState } from 'react';
import Board from './Board';
import GameControls from './GameControls';
import useGame from '@/hooks/useGame';
import RightSidebar from './RightSidebar';
import LeftSidebar from './LeftSidebar';
import NavBar from './NavBar';
import { sgfStorage } from '@/lib/sgfStorage';
import { SGFFile } from './LeftSidebar';
import AnalysisModal from './AnalysisModal';
import HighlightModal from './HighlightModal';

export default function GameBoard() {
  const [currentTool, setCurrentTool] = useState<string>('move');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sgfFiles, setSgfFiles] = useState<SGFFile[]>([]);
  const [currentSGFFile, setCurrentSGFFile] = useState<SGFFile | null>(null);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  // 반응형 디자인을 위한 상태
  const [boardSize, setBoardSize] = useState(0);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const userToggleRef = useRef(false);
  
  // Game 객체를 위한 ref - 한 곳에만 정의
  const gameRef = useRef<Game | null>(null);

  // 반응형 상태 감지 (모바일, 태블릿, 데스크탑)
  const [viewportSize, setViewportSize] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });

  // useGame에서 필요한 기능들을 가져옵니다
  const {
    isGameEnded,
    boardState,
    blackScore,
    whiteScore,
    blackTerritory,
    whiteTerritory,
    currentPlayer,
    makeMove,
    pass,
    undo,
    redo,
    claimTerritory,
    startGame,
    goToStart,
    goToEnd,
    loadSGFContent, // 새로 추가된 공통 함수 사용
    importSGF: importSGFFromHook, // 이름 변경하여 충돌 방지
    game, // game 객체 자체를 활용
    comment,
    setComment,
    handleDeleteClick,
    isAnalyzing,
    analyzeGame,
    showAnalysisModal,
    analysisProgress,
    analysisStatus,
    closeAnalysisModal,
    showHighlightsModal,
    setShowHighlightsModal,
    currentHighlights,
    goToMove
  } = useGame();
  
  // SGF 파일 목록 로드 함수 정의
  const loadSgfFileList = useCallback(async () => {
    try {
      const files = await sgfStorage.getAll();
      setSgfFiles(files);
    } catch (error) {
      console.error('SGF 파일 목록 로드 중 오류:', error);
    }
  }, []);

  // 반응형 디자인 코드 (기존 useEffect 유지)
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1280;
      const isDesktop = width >= 1280;
      
      setViewportSize({ isMobile, isTablet, isDesktop });
      
      // 사이드바 자동 조정 (사용자 토글이 아닌 경우)
      if (!userToggleRef.current) {
        if (isMobile) {
          setIsSidebarCollapsed(true);
          setIsRightSidebarCollapsed(true);
        } else if (isTablet) {
          setIsSidebarCollapsed(true);
          setIsRightSidebarCollapsed(false);
        } else {
          setIsSidebarCollapsed(false);
          setIsRightSidebarCollapsed(false);
        }
      }
      
      // 바둑판 크기 계산
      calculateBoardSize();
    };
    
    // 바둑판 크기를 동적으로 계산하는 함수
    const calculateBoardSize = () => {
      if (!boardContainerRef.current) return;
      
      // 컨테이너 영역 측정
      const containerWidth = boardContainerRef.current.clientWidth;
      
      // 네비게이션 바 높이(48px) + 상단 컨트롤 높이(약 60px) + 하단 컨트롤 높이(약 60px) + 여백(20px)
      // 실제 사용 가능한 높이를 더 정확하게 계산
      const navbarHeight = 48;
      const controlHeight = 120;
      const padding = 20;
      const availableHeight = window.innerHeight - navbarHeight - controlHeight - padding;
      
      // 컨테이너 너비와 사용 가능한 높이 중 작은 값을 사용 (정사각형)
      const maxSize = Math.min(containerWidth * 0.95, availableHeight * 0.95);
      
      // 최소 크기는 320px로 유지
      const finalSize = Math.max(Math.floor(maxSize), 320);
      
      console.log('Calculated board size:', finalSize, 'Available height:', availableHeight);
      setBoardSize(finalSize);
    };
    
    // 초기 실행 및 이벤트 리스너 등록
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 사이드바 토글 핸들러 - 첫 번째 선언 유지, 두 번째 선언 제거
  const handleSidebarToggle = useCallback(() => {
    userToggleRef.current = true;
    setIsSidebarCollapsed(prev => !prev);
    setTimeout(() => {
      userToggleRef.current = false;
    }, 200);
  }, []);

  const handleRightSidebarToggle = useCallback(() => {
    userToggleRef.current = true;
    setIsRightSidebarCollapsed(prev => !prev);
    setTimeout(() => {
      userToggleRef.current = false;
    }, 200);
  }, []);

  // SGF 파일 불러오기 함수 - 중복 제거
  const importSGF = useCallback(async () => {
    const savedFile = await importSGFFromHook();
    if (savedFile) {
      setCurrentSGFFile(savedFile);
      await loadSgfFileList(); // 파일 목록 갱신
    }
  }, [importSGFFromHook, loadSgfFileList]);

  // SGF 파일 불러오기 함수 개선
  const handleLoadSGF = useCallback(async (file: SGFFile) => {
    try {
      const sgfContent = await sgfStorage.getSGFContent(file.id);
      if (!sgfContent) {
        alert('SGF 파일 내용을 불러올 수 없습니다.');
        return;
      }

      // 비동기 처리 개선
      const success = await loadSGFContent(sgfContent, file.id);
      if (success) {
        await sgfStorage.updateOpenedTime(file.id);
        setCurrentSGFFile(file);
        await loadSgfFileList(); // 파일 목록 갱신
      } else {
        alert('SGF 파일 형식이 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('SGF 로드 중 오류 발생:', error);
      alert('SGF 파일을 불러오는 중 오류가 발생했습니다.');
    }
  }, [loadSGFContent, loadSgfFileList]);
  
  // 즐겨찾기 토글 핸들러 - 첫 번째 선언 유지, 두 번째 선언 제거
  const handleToggleFavorite = useCallback(async (file: SGFFile) => {
    try {
      await sgfStorage.toggleFavorite(file.id);
      loadSgfFileList();
    } catch (error) {
      console.error('즐겨찾기 토글 중 오류:', error);
    }
  }, [loadSgfFileList]);

  // 파일 삭제 핸들러 - 첫 번째 선언 유지, 두 번째 선언 제거
  const handleDeleteFile = useCallback(async (file: SGFFile) => {
    try {
      if (currentSGFFile && currentSGFFile.id === file.id) {
        startGame();
        setCurrentSGFFile(null);
      }

      await sgfStorage.deleteSGF(file.id);
      loadSgfFileList();
    } catch (error) {
      console.error('SGF 파일 삭제 중 오류 발생:', error);
      alert('파일 삭제 중 오류가 발생했습니다.');
    }
  }, [currentSGFFile, loadSgfFileList, startGame]);

  // IndexedDB 이벤트 구독 추가
  useEffect(() => {
    loadSgfFileList();
    
    // IndexedDB 커스텀 이벤트 구독
    const unsubscribe = sgfStorage.subscribe((event) => {
      console.log('SGF 스토리지 변경 감지:', event);
      loadSgfFileList();
    });
    
    return () => {
      unsubscribe(); // 컴포넌트 언마운트 시 구독 해제
    };
  }, [loadSgfFileList]);

  useEffect(() => {
    if (!boardState) {
      startGame();
    }
  }, [boardState, startGame]);

  // useEffect에서 game 업데이트 - 중복 제거
  useEffect(() => {
    if (game) {
      gameRef.current = game;
    }
  }, [game]);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.markers = game?.getGameState()?.markers ?? [];
    }
  }, [game]);

  const handleIntersectionClick = useCallback(
    (x: number, y: number) => {
      if (isGameEnded) {
        claimTerritory(x, y);
      } else {
        if (currentTool === 'move') {
          makeMove(x, y);
        } else {
          const currentMarkers = game?.getGameState()?.markers ?? [];
          const existing = currentMarkers.find(
            (m) => m.x === x && m.y === y
          );

          if (existing?.type === currentTool) {
            if (!game) return;
            game.removeMarker(x, y, currentTool);
          } else {
            if (!game) return;
            let label: string | undefined = undefined;

            if (currentTool === 'letter') {
              const allLetters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'];
              const usedLabels = currentMarkers
                .filter((m) => m.type === 'letter')
                .map((m) => m.label);
              label = allLetters.find((ch) => !usedLabels.includes(ch)) ?? '?';
            }

            if (currentTool === 'number') {
              const usedNumbers = currentMarkers
                .filter((m) => m.type === 'number')
                .map((m) => parseInt(m.label || '0'));
              const nextNumber = usedNumbers.length > 0
                ? Math.max(...usedNumbers) + 1
                : 1;
              label = nextNumber.toString();
            }

            game.addMarker(x, y, currentTool, label);
          }
        }
      }
    },
    [isGameEnded, makeMove, claimTerritory, currentTool, game]
  );

  const handleMarkerClick = useCallback(
    (x: number, y: number) => {
      if (currentTool !== 'move') {
        handleIntersectionClick(x, y);
      }
    },
    [currentTool, handleIntersectionClick]
  );

  // SGF 파일 저장 함수 개선
  const handleSaveSGF = useCallback(async () => {
    if (!game) return;

    const sgf = game.saveSGF();
    if (sgf) {
      try {
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const fileName = `Goggle-${year}${month}${day}-${hours}${minutes}.sgf`;

        // 파일 다운로드
        const blob = new Blob([sgf], { type: 'application/x-go-sgf' });
        FileSaver.saveAs(blob, fileName);

        // IndexedDB에 저장
        const savedFile = await sgfStorage.saveSGF(fileName, sgf);
        await loadSgfFileList();
        setCurrentSGFFile(savedFile);

        alert(`SGF 파일이 저장되었습니다: ${fileName}`);
      } catch (error) {
        console.error('SGF 저장 중 오류 발생:', error);
        alert('SGF 파일 저장 중 오류가 발생했습니다.');
      }
    }
  }, [game, loadSgfFileList]);

  if (!boardState) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl mb-4">게임 로딩 중...</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <NavBar />
      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽 사이드바 */}
        <LeftSidebar
          recentFiles={sgfFiles}
          onFileClick={handleLoadSGF}
          onToggleFavorite={handleToggleFavorite}
          onDeleteFile={handleDeleteFile}
          isCollapsed={isSidebarCollapsed}
          onToggle={handleSidebarToggle}
          currentFileId={currentSGFFile?.id}
        />
        
        {/* 게임 보드 섹션 - 메인 컨텐츠 */}
        <div 
          ref={boardContainerRef}
          className="flex-1 flex flex-col items-center justify-center overflow-hidden"
        >
          {/* 게임 컨트롤과 바둑판을 하나의 단위로 통합 */}
          <div className={`
            w-full h-full flex flex-col justify-center items-center px-1
            ${viewportSize.isMobile ? 'py-0' : 'py-0'}
          `}>
            <div className="w-full max-w-3xl flex flex-col items-center">
              {/* 상단 점수 표시 영역 - 마진 축소 */}
              <div className="w-full mb-1">
                <GameControls
                  currentPlayer={currentPlayer}
                  blackScore={blackScore}
                  whiteScore={whiteScore}
                  blackTerritory={blackTerritory}
                  whiteTerritory={whiteTerritory}
                  isGameEnded={isGameEnded}
                  onPass={pass}
                  onUndo={undo}
                  onRedo={redo}
                  onSave={handleSaveSGF}
                  onLoad={importSGF}
                  type="score"
                />
              </div>
              
              {/* 바둑판 영역 */}
              <div className="w-full flex justify-center my-1">
                <Board
                  size={19}
                  boardState={boardState}
                  lastMoveMarkers={game?.getCurrentAndNextMove()}
                  isGameEnded={isGameEnded}
                  onIntersectionClick={handleIntersectionClick}
                  markers={game?.getGameState()?.markers ?? []}
                  showDeleteConfirm={false}
                  deletePosition={null}
                  onDeleteClick={handleDeleteClick}
                  onConfirmDelete={() => {}}
                  onCancelDelete={() => {}}
                  isMarkerMode={currentTool !== 'move'}
                  onMarkerClick={handleMarkerClick}
                  boardSize={boardSize}
                />
              </div>
              
              {/* 하단 컨트롤 영역 - 마진 축소 */}
              <div className="w-full mt-1">
                <GameControls
                  currentPlayer={currentPlayer}
                  blackScore={blackScore}
                  whiteScore={whiteScore}
                  blackTerritory={blackTerritory}
                  whiteTerritory={whiteTerritory}
                  isGameEnded={isGameEnded}
                  onGoToStart={goToStart}
                  onGoToEnd={goToEnd}
                  onPass={pass}
                  onUndo={undo}
                  onRedo={redo}
                  onSave={handleSaveSGF}
                  onLoad={importSGF}
                  onSelectTool={setCurrentTool}
                  selectedTool={currentTool}
                  onAnalyze={analyzeGame}
                  isAnalyzing={isAnalyzing}
                  type="controls"
                />
              </div>
              
              {/* 게임 종료 메시지 */}
              {isGameEnded && (
                <div className="w-full mt-1">
                  <GameControls
                    currentPlayer={currentPlayer}
                    blackScore={blackScore}
                    whiteScore={whiteScore}
                    blackTerritory={blackTerritory}
                    whiteTerritory={whiteTerritory}
                    isGameEnded={isGameEnded}
                    onPass={pass}
                    onUndo={undo}
                    onRedo={redo}
                    onSave={handleSaveSGF}
                    onLoad={importSGF}
                    type="game-end"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 오른쪽 사이드바 */}
        <RightSidebar 
          comment={comment}
          setComment={setComment}
          gameRef={gameRef}
          gameTree={gameRef.current?.getGameTree()}
          isCollapsed={isRightSidebarCollapsed}
          onToggle={handleRightSidebarToggle}
        />
      </div>

      {/* 분석 모달 추가 */}
      <AnalysisModal 
        isOpen={showAnalysisModal}
        onClose={closeAnalysisModal}
        progress={analysisProgress}
        status={analysisStatus}
      />

      {/* 하이라이트 모달 추가 */}
      <HighlightModal 
        isOpen={showHighlightsModal}
        onClose={() => setShowHighlightsModal(false)}
        highlights={currentHighlights}
        onMoveToPosition={goToMove}
      />
    </div>
  );
}