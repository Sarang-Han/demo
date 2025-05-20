// src/hooks/useGame.ts
import { useState, useCallback, useRef } from 'react';
import { Game } from '@/lib/game';
import { Stone, Intersection } from '@/lib/types';
import { sgfStorage } from '@/lib/sgfStorage';
import { HighlightData } from '@/components/LeftSidebar';
import type { SGFFile } from '@/components/LeftSidebar';

export default function useGame() {
  const [comment, setComment] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [boardState, setBoardState] = useState<Intersection[][] | null>(null);
  const [blackScore, setBlackScore] = useState(0);
  const [whiteScore, setWhiteScore] = useState(0);
  const [blackTerritory, setBlackTerritory] = useState(0);
  const [whiteTerritory, setWhiteTerritory] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<Stone>(Stone.Black);
  const [lastMove, setLastMove] = useState<{x: number, y: number} | null>(null);
  const [markers, setMarkers] = useState<{ x: number; y: number; type: string; label?: string; moveNum?: number }[]>([]);
  const gameRef = useRef<Game | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePosition, setDeletePosition] = useState<{x: number, y: number} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 분석 모달 관련 상태 추가
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('분석 준비 중...');
  const [showHighlightsModal, setShowHighlightsModal] = useState(false);
  const [currentHighlights, setCurrentHighlights] = useState<HighlightData[]>([]);
  
  // 게임 상태 변화 시 UI 업데이트
  const updateGameState = useCallback(() => {
    if (!gameRef.current) return;
    
    const game = gameRef.current;
    setBoardState([...game.intersections]);
    setBlackScore(game.getBlackScore());
    setWhiteScore(game.getWhiteScore());
    setCurrentPlayer(game.getTurn());
    
    const lastMove = game.getLastMove();
    setLastMove(lastMove ? {x: lastMove.xPos, y: lastMove.yPos} : null);
    
    const currentComment = game.getGameState()?.comment ?? '';
    console.log("🗒️ Updating comment from GameState:", currentComment);
    setComment(currentComment);
    
    // 영역 점수 계산
    const { territory: blackTerr } = game.getScoreWithTerritory(Stone.Black);
    const { territory: whiteTerr } = game.getScoreWithTerritory(Stone.White);
    setBlackTerritory(blackTerr);
    setWhiteTerritory(whiteTerr);
    
    // 게임이 끝났는지 확인
    setIsGameEnded(game.getTurn() === Stone.None);
  }, []);
  
  // 새 게임 시작
  const startGame = useCallback(() => {
    const newGame = new Game(19, 19, updateGameState);
    gameRef.current = newGame;
    setGame(newGame);
    setIsGameStarted(true);
    setIsGameEnded(false);
    setCurrentPlayer(Stone.Black);
    setBoardState([...newGame.intersections]);
    setBlackScore(0);
    setWhiteScore(0);
    setBlackTerritory(0);
    setWhiteTerritory(0);
    setLastMove(null);
  }, [updateGameState]);
  
  // loadSGFContent 함수 추가 - 중복 제거를 위해 공통 함수화
  const loadSGFContent = useCallback(async (sgfContent: string, fileId?: string) => {
    if (!gameRef.current) {
      gameRef.current = new Game(19, 19, updateGameState);
    }
    
    const success = gameRef.current.loadSGF(sgfContent);
    if (success) {
      setGame(gameRef.current);
      setIsGameStarted(true);
      setBoardState([...gameRef.current.intersections]);
      setBlackScore(gameRef.current.getBlackScore());
      setWhiteScore(gameRef.current.getWhiteScore());
      setCurrentPlayer(gameRef.current.getTurn());
      const lastMove = gameRef.current.getLastMove();
      setLastMove(lastMove ? {x: lastMove.xPos, y: lastMove.yPos} : null);
      setMarkers(gameRef.current.markers ?? []);
      setComment(gameRef.current.getGameState()?.comment ?? '');
      
      // 하이라이트 로드 - 비동기 처리 개선
      if (fileId) {
        try {
          const highlights = await sgfStorage.getHighlights(fileId);
          setCurrentHighlights(highlights);
          // 분석된 기보인 경우 하이라이트가 있을 것임
          if (highlights.length > 0) {
            setShowHighlightsModal(true);
          }
        } catch (error) {
          console.error('하이라이트 데이터 로드 중 오류:', error);
          setCurrentHighlights([]);
        }
      } else {
        setCurrentHighlights([]);
      }
      
      return true;
    }
    return false;
  }, [updateGameState]);
  
  // loadSGF 함수 수정 - 비동기 처리 개선
  const loadSGF = useCallback(async (sgfContent: string, fileId?: string) => {
    try {
      return await loadSGFContent(sgfContent, fileId);
    } catch (error) {
      console.error('SGF 로드 중 오류 발생:', error);
      return false;
    }
  }, [loadSGFContent]);
  
  // 돌 놓기
  const makeMove = useCallback((x: number, y: number) => {
    if (!gameRef.current || isGameEnded) return false;
    
    const success = gameRef.current.makeMove(x, y);
    if (success) {
      updateGameState();
    }
    return success;
  }, [isGameEnded, updateGameState]);
  
  // 맨 앞으로 이동 (첫 번째 수로)
const goToStart = useCallback(() => {
  if (!gameRef.current) return;
  
  // root 노드로 이동
  const gameTree = gameRef.current.getGameTree();
  if (gameTree) {
    gameRef.current.navigateToNode('root');
    updateGameState();
  }
}, [updateGameState]);

// 맨 뒤로 이동 (마지막 수로)
const goToEnd = useCallback(() => {
  if (!gameRef.current) return;
  
  const gameTree = gameRef.current.getGameTree();
  if (!gameTree) return;
  
  // 현재 노드부터 시작해서 가장 마지막 자식 노드까지 이동
  let currentNode = gameRef.current.getCurrentNode();
  
  // 메인 패스 따라 마지막 노드까지 이동
  while (currentNode && currentNode.children.length > 0) {
    // 항상 첫 번째 자식을 선택 (메인 라인)
    const nextNode = gameTree.get(currentNode.children[0].id);
    if (!nextNode) break; // 다음 노드가 없으면 중단
    
    currentNode = nextNode;
    gameRef.current.navigateToNode(currentNode.id);
  }
  
  updateGameState();
}, [updateGameState]);

  // 특정 수로 이동
  const goToMove = useCallback((moveNum: number) => {
    if (!gameRef.current) return;
    
    // 현재 노드부터 시작해서 목표 moveNum까지 이동
    let currentMove = 0;
    const gameTree = gameRef.current.getGameTree();
    if (!gameTree) return;
    
    // 먼저 첫 번째 수로 이동
    goToStart();
    
    // 그 다음 moveNum까지 순차적으로 이동
    let currentNode = gameRef.current.getCurrentNode();
    while (currentNode && currentMove < moveNum && currentNode.children.length > 0) {
      const nextNode = gameTree.get(currentNode.children[0].id);
      if (!nextNode) break;
      
      currentNode = nextNode;
      gameRef.current.navigateToNode(currentNode.id);
      currentMove++;
    }
    
    updateGameState();
  }, [goToStart, updateGameState]);

  // 패스
  const pass = useCallback(() => {
    if (!gameRef.current || isGameEnded) return;
    
    gameRef.current.pass();
    updateGameState();
  }, [isGameEnded, updateGameState]);
  
  // 무르기
  const undo = useCallback(() => {
    if (!gameRef.current) return;
    
    gameRef.current.undo();
    updateGameState();
  }, [updateGameState]);
  
  // 앞으로 가기
  const redo = useCallback(() => {
    if (!gameRef.current) return;
    
    gameRef.current.redo();
    updateGameState();
  }, [updateGameState]);
  
  // SGF 저장
  const saveSGF = useCallback(() => {
    if (!gameRef.current) return;
    
    gameRef.current.saveSGF();
  }, []);

  // SGF 불러오기
  const importSGF = useCallback(async () => {
    console.log('SGF 파일 불러오기 다이얼로그 실행');
    return new Promise<SGFFile | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.sgf';
      
      input.onchange = async function(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        
        console.log(`선택된 SGF 파일: ${file.name}`);
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const sgfContent = reader.result as string;
            
            // IndexedDB에 저장
            const savedFile = await sgfStorage.saveSGF(file.name, sgfContent);
            
            // 파일 로드
            await loadSGF(sgfContent, savedFile.id);
            resolve(savedFile);
          } catch (error) {
            console.error('SGF 저장 및 로드 중 오류 발생:', error);
            alert('SGF 파일을 불러오는 중 오류가 발생했습니다.');
            resolve(null);
          }
        };
        
        reader.onerror = () => {
          console.error('파일 읽기 오류');
          alert('파일을 읽는 중 오류가 발생했습니다.');
          resolve(null);
        };
        
        reader.readAsText(file);
      };
      
      input.click();
    });
  }, [loadSGF]);

  // 영역 점령
  const claimTerritory = useCallback((x: number, y: number) => {
    if (!gameRef.current || !isGameEnded) return false;
    
    const success = gameRef.current.claimTerritory(x, y);
    if (success) {
      updateGameState();
    }
    return success;
  }, [isGameEnded, updateGameState]);

  const addMarker = useCallback((x: number, y: number, type: string, label?: string) => {
    if (!gameRef.current) return;

    gameRef.current.addMarker(x, y, type, label);
    updateGameState();
  }, [updateGameState]);

  // 돌 삭제 처리
  const handleDeleteClick = useCallback((x: number, y: number) => {
    console.log('handleDeleteClick called with:', { x, y });
    if (!gameRef.current) {
      console.error('gameRef.current is null');
      return;
    }
    
    // 돌이 있는지 확인
    if (!boardState || !boardState[x] || !boardState[y] || boardState[x][y].stone === Stone.None) {
      console.error('No stone at position:', { x, y });
      return;
    }
    
    // 바로 삭제 실행
    const success = gameRef.current.deleteStone(x, y);
    if (success) {
      console.log('Stone deleted successfully');
      // 게임 상태 업데이트
      setBoardState([...gameRef.current.intersections]);
      updateGameState();
    } else {
      console.log('Failed to delete stone');
    }
  }, [boardState, updateGameState]);

  // 삭제 확인
  const confirmDelete = useCallback(() => {
    if (!deletePosition || !gameRef.current) {
      console.error('Cannot delete: deletePosition or gameRef.current is null');
      return;
    }
    
    console.log('Confirming delete at:', deletePosition);
    const success = gameRef.current.deleteStone(deletePosition.x, deletePosition.y);
    if (success) {
      console.log('Stone deleted successfully');
      setShowDeleteConfirm(false);
      setDeletePosition(null);
      updateGameState();
    } else {
      console.error('Failed to delete stone');
    }
  }, [deletePosition, updateGameState]);

  // 삭제 취소
  const cancelDelete = useCallback(() => {
    console.log('Canceling delete');
    setShowDeleteConfirm(false);
    setDeletePosition(null);
  }, []);

  // 코멘트 업데이트 함수
  const updateComment = useCallback((newComment: string) => {
    setComment(newComment);
    if (gameRef.current) {
      gameRef.current.updateComment(newComment);
    }
  }, []);

  // 분석 완료 처리 함수 추가 (async 함수로 변경)
  const finishAnalysis = useCallback(async (sgfContent: string) => {
    try {
      // 분석이 완료되었다고 가정하고 가짜 결과 생성
      const analyzedSgf = sgfContent + '\n;C[AI 분석 완료: ' + new Date().toISOString() + ']';
      
      // 하이라이트 데이터 생성
      const highlights: HighlightData[] = [
        {
          id: '1',
          startMove: 15,
          endMove: 20,
          description: '흑의 좌상귀 삼삼 포석 후 흰색의 어깨짚기. 이 상황에서 흑은 흰돌을 잡아내는 대신 실리를 챙기는 선택을 했습니다. KataGo는 이 선택을 0.8점 높게 평가합니다.',
          boardSnapshot: gameRef.current ? gameRef.current.copyIntersections() : undefined
        },
        {
          id: '2',
          startMove: 35,
          endMove: 42,
          description: '우하귀에서 흰색의 침입에 대한 흑의 대응. 흑은 좀 더 공격적인 대응으로 흰돌을 가둘 기회를 놓쳤습니다. 이 지점에서 AI는 K4 지점을 추천했습니다.',
          boardSnapshot: gameRef.current ? gameRef.current.copyIntersections() : undefined
        },
        {
          id: '3',
          startMove: 67,
          endMove: 75,
          description: '중앙 전투에서 흑의 실수. 연결하는 대신 공격적인 착수를 선택했으나 흰색에게 반격의 기회를 제공했습니다. 결과적으로 흑은 약 3.5점의 손해를 보았습니다.',
          boardSnapshot: gameRef.current ? gameRef.current.copyIntersections() : undefined
        }
      ];
      
      // 파일 이름 생성
      const now = new Date();
      const year = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const fileName = `AI_분석_${year}${month}${day}_${hours}${minutes}.sgf`;
      
      // 로컬 스토리지에 하이라이트와 함께 저장 (IndexedDB 사용)
      const savedFile = await sgfStorage.saveSGFWithAnalysis(fileName, analyzedSgf, highlights);
      console.log('분석된 SGF 파일이 하이라이트와 함께 저장되었습니다:', savedFile);
      
      // 분석된 SGF 파일 로드
      loadSGF(analyzedSgf, savedFile.id);
      
      // 상태 업데이트
      setCurrentHighlights(highlights);
      
      // 2초 후 모달 닫기 및 하이라이트 표시
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowAnalysisModal(false);
        setShowHighlightsModal(true); // 하이라이트 모달 표시
        alert('AI 분석이 완료되었습니다. 분석된 기보가 로드되었습니다.');
      }, 2000);
      
    } catch (error) {
      console.error('분석 결과 처리 중 오류:', error);
      setIsAnalyzing(false);
      setShowAnalysisModal(false);
      alert('분석 결과 처리 중 오류가 발생했습니다.');
    }
  }, [loadSGF]);

  // AI 분석 함수 수정
  const analyzeGame = useCallback(async () => {
    if (!gameRef.current) return;
    
    try {
      // 분석 시작
      setIsAnalyzing(true);
      setShowAnalysisModal(true);
      setAnalysisProgress(0);
      setAnalysisStatus('분석 준비 중...');
      
      // 현재 게임 상태를 SGF로 변환
      const sgfContent = gameRef.current.saveSGF();
      
      // 테스트를 위한 가짜 진행 상황 업데이트 (실제로는 백엔드에서 주기적으로 상태를 받아야 함)
      const simulateProgress = () => {
        // 10번의 업데이트로 나누어 진행
        const stages = [
          { progress: 10, status: '바둑판 초기화 중...' },
          { progress: 20, status: '기보 데이터 로딩 중...' },
          { progress: 30, status: 'KataGo 엔진 초기화 중...' },
          { progress: 40, status: '착수 패턴 분석 중...' },
          { progress: 50, status: '주요 수 평가 중...' },
          { progress: 60, status: '중반 전략 분석 중...' },
          { progress: 70, status: '위험 수 검토 중...' },
          { progress: 80, status: '최적 수 계산 중...' },
          { progress: 90, status: '최종 평가 중...' },
          { progress: 100, status: '분석 완료!' }
        ];
        
        // 각 단계별 진행 시간 (실제 백엔드 구현시 제거)
        stages.forEach((stage, index) => {
          setTimeout(() => {
            setAnalysisProgress(stage.progress);
            setAnalysisStatus(stage.status);
            
            // 마지막 단계에서 분석 완료 처리
            if (index === stages.length - 1) {
              finishAnalysis(sgfContent);
            }
          }, (index + 1) * 1000); // 각 단계마다 1초씩 지연
        });
      };
      
      // 가짜 진행 상황 시작
      simulateProgress();
      
    } catch (error) {
      console.error('SGF 분석 중 오류 발생:', error);
      alert('SGF 분석 중 오류가 발생했습니다.');
      setIsAnalyzing(false);
      setShowAnalysisModal(false);
    }
  }, [finishAnalysis]);
  
  // 모달 닫기 함수
  const closeAnalysisModal = useCallback(() => {
    if (analysisProgress < 100) {
      // 진행 중인 경우 확인 필요
      if (confirm('분석을 중단하시겠습니까?')) {
        setShowAnalysisModal(false);
        setIsAnalyzing(false);
      }
    } else {
      // 완료된 경우 그냥 닫기
      setShowAnalysisModal(false);
    }
  }, [analysisProgress]);

  return {
    game,
    isGameStarted,
    isGameEnded,
    boardState,
    blackScore,
    whiteScore,
    blackTerritory,
    whiteTerritory,
    currentPlayer,
    lastMove,
    markers,
    comment,
    makeMove,
    goToStart,
    goToEnd,
    goToMove,
    pass,
    undo,
    redo,
    saveSGF,
    importSGF,
    claimTerritory,
    addMarker,
    showDeleteConfirm,
    deletePosition,
    handleDeleteClick,
    confirmDelete,
    cancelDelete,
    startGame,
    loadSGF,
    setComment: updateComment,
    isAnalyzing,
    analyzeGame,
    showAnalysisModal,
    analysisProgress,
    analysisStatus,
    closeAnalysisModal,
    showHighlightsModal,
    setShowHighlightsModal,
    currentHighlights,
    loadSGFContent // 새로 추가된 함수도 외부에서 사용할 수 있도록 노출
  };
}