// src/lib/game.ts
import { 
  Stone, 
  Intersection, 
  GameState, 
  Territory, 
  Hashable,
  Pointer,
  GameTree,
  GameNode
} from './types';

/**
 * HashSet 클래스 구현
 * 같은 위치의 교차점을 중복 없이 저장하기 위해 사용
 */
export class HashSet<T extends Hashable> {
  private hashSet: Map<string, T> = new Map();

  constructor(...items: T[]) {
    for(const item of items) {
      this.insert(item);
    }
  }

  public includes(item: T | null): boolean {
    return item ? this.hashSet.has(item.hashKey()) : false;
  }

  public insert(item: T | null) {
    if(item) {
      this.hashSet.set(item.hashKey(), item);
    }
  }

  public values(): T[] {
    return Array.from(this.hashSet.values());
  }
}

/**
 * 바둑판의 교차점 구현
 */
export class IntersectionImpl implements Intersection, Hashable {
  xPos: number;
  yPos: number;
  stone: Stone;
  
  constructor(x: number, y: number, s: Stone = Stone.None) {
    this.xPos = x;
    this.yPos = y;
    this.stone = s;
  }
  
  public hashKey(): string {
    return `(${this.xPos},${this.yPos})`;
  }

  public copy(): Intersection {
    return new IntersectionImpl(this.xPos, this.yPos, this.stone);
  }
}

/**
 * 영역 클래스 구현
 */
export class TerritoryImpl implements Territory {
  region: Intersection[];
  owner: Stone;
  score: number = 0;

  constructor(owner: Stone, region?: Intersection[]) {
    this.owner = owner;
    this.region = region || [];

    if (region) {
      this.score = region.reduce((total, int) => 
        total + (int.stone === Stone.None ? 1 : 2), 0
      );
    }
  }

  public merge(territory: Territory): Territory {
    const merged = new TerritoryImpl(Stone.None);

    if(this.owner === Stone.None) {
      merged.owner = territory.owner;
    }
    else if(territory.owner === Stone.None) {
      merged.owner = this.owner;
    }
    else if(this.owner !== territory.owner) {
      merged.owner = Stone.Unknown;
    }
    else {
      merged.owner = this.owner;
    }

    merged.region = [...this.region, ...territory.region];
    merged.score = this.score + territory.score;

    return merged;
  }
}

/**
 * 게임 상태 클래스 구현
 */
export class GameStateImpl implements GameState {
  intersections: Intersection[][];
  turn: Stone;
  moveNum: number = 0;
  prevGameState: GameState | null;
  nextGameState: GameState | null = null;
  blackScore: number = 0;
  whiteScore: number = 0;
  isPass: boolean = false;
  move: Intersection | null = null;
  public comment: string = '';

  constructor(
    ints: Intersection[][], 
    t: Stone, 
    bScore: number = 0, 
    wScore: number = 0, 
    prev: GameState | null = null,
    public markers: { x: number; y: number; type: string; label?: string; moveNum?: number }[] = [],
    comment: string = ''
  ) {
    this.turn = t;
    this.prevGameState = prev;
    this.intersections = ints;
    this.blackScore = bScore;
    this.whiteScore = wScore;
    this.comment = comment;

    if(prev === null) {
      this.moveNum = 0;
    }
    else {
      this.moveNum = prev.moveNum + 1;
      prev.nextGameState = this;
    }
  }

  public toString(): string {
    const transpose = (array: Intersection[][]): Intersection[][] =>
      array[0].map((_, i) => array.map(row => row[i]));

    const transposed = transpose(this.intersections);
    
    return transposed.map(col => {
      return col.map(i => {
        if(i.stone === Stone.Black) {
          return 'b';
        }
        else if(i.stone === Stone.White) {
          return 'w';
        }
        else {
          return '-'
        }
      }).join(' ');
    }).join('\n');
  }

  public getState(moveNum: number): GameState | null {
    let state = this as GameState;
    
    while(state.moveNum > moveNum) {
      if (!state?.prevGameState) return null;
      state = state.prevGameState;
    }

    return state;
  }
}

/**
 * 게임 클래스 구현
 * 핵심 바둑 게임 로직을 포함
 */
export class Game {
  public intersections: Intersection[][];
  public markers: { x: number; y: number; type: string; label?: string; moveNum?: number }[] = [];
  private gameState: GameState | null = null;
  private lastMove: Intersection | null = null;
  private xLines: number = 19;
  private yLines: number = 19;
  private turn: Stone = Stone.Black;
  private blackScore: number = 0;
  private whiteScore: number = 0;
  private claimedTerritories: Territory[] = [];
  private claimedTerritoryLookup: HashSet<Intersection> = new HashSet();
  private stateChangeCallback: (() => void) | null = null;
  private gameTree: GameTree;
  private nodeMap: Map<string, GameNode> = new Map();
  private currentNode: GameNode;
  constructor(
    xLines: number = 19, 
    yLines: number = 19,
    onStateChange: (() => void) | null = null
  ) {
    this.xLines = xLines;
    this.yLines = yLines;
    this.stateChangeCallback = onStateChange;
    
    this.intersections = Game.initIntersections(xLines, yLines);
    this.gameState = this.newGameState();
    const rootNode = {
      id: 'root',
      parentId: null,
      children: [],
      data: {
        move: { x: -1, y: -1, color: Stone.Black }
      }
    };

    // 루트 노드를 Map에 추가
    this.nodeMap.set(rootNode.id, rootNode);

    this.gameTree = {
      root: rootNode,
      currentNodeId: 'root',
      mainPath: new Set(['root']),
      get: (id: string): GameNode => {
        // Map에서 먼저 검색
        const node = this.nodeMap.get(id);
        if (node) return node;

        // Map에 없는 경우 트리 순회로 fallback
        const traverse = (node: GameNode): GameNode | null => {
          if (node.id === id) return node;
          for (const child of node.children) {
            const found = traverse(child);
            if (found) return found;
          }
          return null;
        };

        const result = traverse(this.gameTree.root);
        if (!result) {
          throw new Error(`Node with id ${id} not found`);
        }

        // 찾은 노드를 Map에 캐시
        this.nodeMap.set(id, result);
        return result;
      }
    };

    this.currentNode = rootNode;
  }

  /**
   * 바둑판 초기화
   */
  static initIntersections(xLines: number = 19, yLines: number = 19): Intersection[][] {
    const ints = new Array(xLines);
    for(let x = 0; x < xLines; x++) {
      ints[x] = new Array(yLines);

      for(let y = 0; y < yLines; y++) {
        ints[x][y] = new IntersectionImpl(x, y);
      }
    }

    return ints;
  }

  /**
   * SGF 파일 로드
   */
  public static loadSGF(sgfContent: string): Game | null {
    const game = new Game();
    sgfContent = sgfContent.trim().replace(/\)+$/, '');
    const charToPos = (char: string) => char.charCodeAt(0) - 97;
  
    // Parse board size - 정규식 최적화
    const sizeMatch = sgfContent.match(/SZ\[(\d+)\]/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      game.xLines = size;
      game.yLines = size;
      game.intersections = Game.initIntersections(size, size);
      game.gameState = game.newGameState();
    }
  
    // 노드 파싱 최적화 - 한 번에 분할
    const nodes = sgfContent.split(';').map(s => s.trim()).filter(s => s);
    const movePattern = /^(B|W)\[([a-z]{0,2})\]/;
    const markerPattern = /(TR|SQ|CR|MA|LB)((\[[^\]]+\])+)/g;
    let lastMoveColor: Stone | null = null;
  
    // 이전 게임 상태를 추적하여 불필요한 참조 줄이기
    let prevState: GameState | null = game.gameState;
    // let boardState = game.copyIntersections(); // 현재 보드 상태 복사본
  
    for (const node of nodes) {
      const moveMatch = node.match(movePattern);
      const markers: { x: number; y: number; type: string; label?: string; moveNum?: number }[] = [];
    
      // 마커 파싱 - 정규식 재사용
      let markerMatch;
      // Define a mapping from SGF marker codes to our internal marker types
      const typeMapping: { [key: string]: string } = {
        TR: "triangle",
        SQ: "square",
        CR: "circle",
        MA: "cross",
        LB: "letter"
      };

      while ((markerMatch = markerPattern.exec(node)) !== null) {
        const type = markerMatch[1];
        const coordsStr = markerMatch[2];
        const coords = coordsStr.match(/\[([a-z]{2})(?::([^\]]+))?\]/g) || [];
        
        for (let i = 0; i < coords.length; i++) {
          const coord = coords[i];
          const posMatch = coord.match(/\[([a-z]{2})(?::([^\]]+))?\]/);
          if (posMatch) {
            const pos = posMatch[1];
            const label = posMatch[2];
            const x = charToPos(pos[0]);
            const y = charToPos(pos[1]);
            markers.push({
              x,
              y,
              type: typeMapping[type] || type.toLowerCase(),
              label
            });
          }
        }
      }
      
      // 마커 파싱 이후에 node의 moveNum을 각 마커에 할당
      if (markers.length > 0) {
        const nodeMoveNum = (prevState ? prevState.moveNum + 1 : 0);
        for (let i = 0; i < markers.length; i++) {
          markers[i].moveNum = nodeMoveNum;
        }
      }
      
      // 코멘트 추출 - 정규식 간소화
      const commentMatch = node.match(/C\[([\s\S]*?)\](?=\s|$)/);
      const comment = commentMatch ? commentMatch[1].replace(/\\]/g, "]") : '';
      
      // 수가 없으면 건너뜀 (하지만 마커나 코멘트가 있으면 처리)
      if (!moveMatch && markers.length === 0 && !comment) continue;
      
      const color = moveMatch ? (moveMatch[1] === 'B' ? Stone.Black : Stone.White) : game.turn;
      const coord = moveMatch ? moveMatch[2] : '';
      
      // 보드 상태 복사 대신 기존 배열 재사용
      const newBoardState = game.copyIntersections();
      
      if (moveMatch && coord !== '') {
        const x = charToPos(coord[0]);
        const y = charToPos(coord[1]);

        newBoardState[x][y].stone = color;

        if (game.intersections[x][y].stone === Stone.None) {
          game.intersections[x][y].stone = color;

          const otherPlayer = color === Stone.Black ? Stone.White : Stone.Black;
          const capturedGroups = [];
          const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          const processedStones = new Set<string>();
          let numCaptured = 0;

          for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < game.xLines && ny >= 0 && ny < game.yLines) {
              const neighbor = game.intersections[nx][ny];

              if (neighbor.stone === otherPlayer && !processedStones.has(`${nx},${ny}`)) {
                const captured = game.getCapturedGroup(neighbor);

                if (captured.length > 0) {
                  capturedGroups.push(captured);

                  for (const stone of captured) {
                    processedStones.add(`${stone.xPos},${stone.yPos}`);
                    newBoardState[stone.xPos][stone.yPos].stone = Stone.None;
                    game.intersections[stone.xPos][stone.yPos].stone = Stone.None;
                    numCaptured++;
                  }
                }
              }
            }
          }

          const selfCaptured = game.getCapturedGroup(game.intersections[x][y]);
          if (selfCaptured.length > 0) {
            for (const stone of selfCaptured) {
              newBoardState[stone.xPos][stone.yPos].stone = Stone.None;
              game.intersections[stone.xPos][stone.yPos].stone = Stone.None;
            }
          }

          if (numCaptured > 0) {
            if (color === Stone.Black) {
              game.blackScore += numCaptured;
            } else {
              game.whiteScore += numCaptured;
            }
          }

          game.lastMove = game.intersections[x][y];
        }
      }
      
      // 게임 상태 생성 및 연결
      const newState = new GameStateImpl(
        newBoardState,
        color,
        game.blackScore,
        game.whiteScore,
        prevState,
        markers,
        comment
      );
      
      if (coord !== '' && moveMatch) {
        const x = charToPos(coord[0]);
        const y = charToPos(coord[1]);
        newState.move = newBoardState[x][y].copy();
      }
      
      // 상태 업데이트
      if (prevState) {
        prevState.nextGameState = newState;
      }
      
      prevState = newState;
      // boardState = newBoardState;
      
      if (!game.gameState || game.gameState.moveNum === 0) {
        game.gameState = newState;
      }
      
      game.setTurn(color);
      lastMoveColor = color;
    }
    
    // 최종 상태 적용: 게임 상태 체인의 마지막 상태(prevState)를 그대로 사용하여, 각 노드의 마커가 온전하게 보존되도록 함
    if (prevState && prevState !== game.gameState) {
      game.gameState = prevState;
    }
    
    if (game.stateChangeCallback) {
      game.stateChangeCallback();
    }

    // 마지막 수가 흑이면 백의 턴, 백이면 흑의 턴으로 설정
    if (lastMoveColor === Stone.Black) {
      game.setTurn(Stone.White);
    } else if (lastMoveColor === Stone.White) {
      game.setTurn(Stone.Black);
    }

    return game;
  }

  /**
   * SGF 파일로 저장
   */
  public saveSGF(): string {
    const header = `(;GM[1]FF[4]CA[UTF-8]AP[Goggle:1.0]KM[6.5]SZ[${this.xLines}]DT[${new Date().toISOString().split('T')[0]}]`;

    const serializeNode = (node: GameNode): string => {
      let sgf = '';
      
      // 현재 노드의 데이터를 SGF로 변환
      if (node.id !== 'root') {
        const move = node.data.move!;
        sgf += `;${move.color === Stone.Black ? 'B' : 'W'}[${this.convertToSGFCoord(move.x, move.y)}]`;
        
        if (node.data.comment) {
          sgf += `C[${node.data.comment}]`;
        }
      }

      // 자식 노드가 있는 경우
      if (node.children.length > 0) {
        // 모든 자식이 변화도가 되어야 함
        const variations = node.children.map(child => serializeNode(child));
        
        if (variations.length === 1) {
          // 자식이 하나면 그대로 이어서 작성
          sgf += variations[0];
        } else {
          // 자식이 여러 개면 각각을 괄호로 감싸서 병렬로 작성
          sgf += variations.map(v => `(${v})`).join('');
        }
      }

      return sgf;
    };

    return header + serializeNode(this.gameTree.root) + ')';
  }

  private convertToSGFCoord(x: number, y: number): string {
    return String.fromCharCode(97 + x) + String.fromCharCode(97 + y);
  }

  /**
   * SGF 형식으로 변환
   */
  public getSGF(): string {
    const sgfNodes = [
      ";GM[1]FF[4]CA[UTF-8]AP[Goggle]SZ[19]"
    ];
 
    if (!this.gameState) return `(${sgfNodes.join('')})`;
 
    let prevMove: Stone | null = null; // Track the previous move color
 
    for (let state = this.gameState.getState(1); state != null; state = state.nextGameState) {
      const turn = state.turn === Stone.Black ? "B" : "W";
      const move = state.move;
 
      let node = "";
 
      // Include move if it exists
      if (move) {
        const xChar = String.fromCharCode(97 + move.xPos);
        const yChar = String.fromCharCode(97 + move.yPos);
        node += `;${turn}[${xChar}${yChar}]`;
 
        // Add markers
        const coord = (x: number, y: number) =>
          `[${String.fromCharCode(97 + x)}${String.fromCharCode(97 + y)}]`;
 
        const grouped = {
          TR: [] as string[], // triangle
          SQ: [] as string[], // square
          CR: [] as string[], // circle
          MA: [] as string[], // cross
          LB: [] as string[], // label
        };
 
        const markerMap = new Map<string, { x: number; y: number; type: string; label?: string; moveNum?: number }>();
        for (const marker of (state.markers ?? [])) {
          const key = `${marker.x}-${marker.y}-${marker.type}-${marker.label || ''}-${marker.moveNum || ''}`;
          if (!markerMap.has(key)) {
            markerMap.set(key, marker);
          }
        }
        const allMarkers = Array.from(markerMap.values());
        for (const marker of allMarkers) {
          const c = coord(marker.x, marker.y);
          if (marker.moveNum === state.moveNum || (marker.moveNum == null && move && marker.x === move.xPos && marker.y === move.yPos)) {
            if (marker.type === 'triangle') grouped.TR.push(c);
            else if (marker.type === 'square') grouped.SQ.push(c);
            else if (marker.type === 'circle') grouped.CR.push(c);
            else if (marker.type === 'cross') grouped.MA.push(c);
            else if (marker.type === 'letter' || marker.type === 'number') {
              grouped.LB.push(`${String.fromCharCode(97 + marker.x)}${String.fromCharCode(97 + marker.y)}:${marker.label}`);
            }
          }
        }
 
        // Add markers to the node
        for (const [tag, entries] of Object.entries(grouped)) {
          if (entries.length > 0) {
            if (tag === 'LB') {
              node += `LB${entries.map(e => `[${e}]`).join('')}`;
            } else {
              node += `${tag}${entries.join('')}`;
            }
          }
        }
      }
 
      // Preserve comments if available
      if (state.comment) {
        node += `C[${state.comment}]`;
      }
 
      // Add empty move for passes
      if (!move && prevMove === Stone.Black) {
        node += `;W[]`;
      }
 
      sgfNodes.push(node);
      prevMove = state.turn; // Update previous move to current turn
    }
 
    return `(${sgfNodes.join('')})`;
  }

  /**
   * 바둑판 상태 복사
   */
  public copyIntersections(): Intersection[][] {
    const { xLines, yLines, intersections } = this;

    const ints = new Array(xLines);
    for(let x = 0; x < xLines; x++) {
      ints[x] = new Array(yLines);

      for(let y = 0; y < yLines; y++) {
        ints[x][y] = new IntersectionImpl(x, y);
        ints[x][y].stone = intersections[x][y].stone;
      }
    }

    return ints;
  }

  /**
   * 돌 놓기
   */
  public makeMove(xPos: number, yPos: number): boolean {
    // 이미 돌이 있는 위치인지 확인
    if (this.intersections[xPos][yPos].stone !== Stone.None) {
      return false;
    }
    
    // 임시로 돌 놓기
    this.intersections[xPos][yPos].stone = this.turn;

    // 상대방 돌 잡기
    const capturedNeighbors = this.getCapturedNeighbors(xPos, yPos);
    let legalMove = capturedNeighbors.length > 0;
    
    // 잡힌 돌이 없다면, 방금 놓은 돌이 잡히는지 확인
    if (!legalMove) {
      const selfCaptured = this.getCapturedGroup(this.intersections[xPos][yPos]);
      legalMove = selfCaptured.length === 0;
    }
    
    // 유효한 수가 아니면 돌을 제거하고 종료
    if (!legalMove) {
      this.intersections[xPos][yPos].stone = Stone.None;
      return false;
    }
    
    // 상대방 돌 제거 및 점수 계산
    let numCaptured = 0;
    for (const group of capturedNeighbors) {
      for (const stone of group) {
        // 명시적으로 돌을 제거
        this.intersections[stone.xPos][stone.yPos].stone = Stone.None;
        numCaptured++;
      }
    }
    
    // 점수 업데이트
    if (numCaptured > 0) {
      if (this.turn === Stone.Black) {
        this.blackScore += numCaptured;
      } else {
        this.whiteScore += numCaptured;
      }
    }
    
    // 고 규칙 확인 - 제거 후에 확인해야 함
    if (this.checkForKo()) {
      // Ko 규칙 위반이면 원래 상태로 복원
      if (this.gameState) {
        this.loadGameState(this.gameState);
      }
      return false;
    }
    
    // 이동을 기록하고 턴 변경
    this.lastMove = this.intersections[xPos][yPos];
    const success = true;

    const newNode: GameNode = {
      id: Math.random().toString(36).slice(2),
      parentId: this.currentNode.id,
      children: [],
      data: {
        move: { x: xPos, y: yPos, color: this.turn }
      }
    };

    // 새로운 메인 패스 생성
    const newMainPath = new Set(['root']);
    
    // 새 노드부터 루트까지의 경로를 메인 패스로 설정
    let current: GameNode | null = newNode;
    while (current) {
      newMainPath.add(current.id);
      if (current.parentId) {
        current = this.findNodeById(current.parentId);
      } else {
        break;
      }
    }

    // 게임 트리 업데이트
    this.currentNode.children.push(newNode);
    this.nodeMap.set(newNode.id, newNode);
    this.currentNode = newNode;
    this.gameTree.currentNodeId = newNode.id;
    this.gameTree.mainPath = newMainPath;  // 메인 패스 업데이트

    this.notifyStateChange();
    this.nextTurn();
    return true;
  }

  /**
   * 패스
   */
  public pass(): void {
    if (this.gameState?.prevGameState?.isPass) {
      this.endGame();
    } else {
      if (this.gameState) {
        this.gameState.isPass = true;
      }
      this.nextTurn();
    }
  }

  /**
   * 무르기
   */
  public undo(): void {
    if (this.gameState?.prevGameState) {
      this.loadGameState(this.gameState.prevGameState);
      this.claimedTerritories = [];
      this.claimedTerritoryLookup = new HashSet();
      this.notifyStateChange();
    }
  }

  /**
   * 앞으로 가기
   */
  public redo(): void {
    if (this.gameState?.nextGameState) {
      this.loadGameState(this.gameState.nextGameState);
      this.notifyStateChange();
    }
  }

  /**
   * 게임 종료
   */
  private endGame(): void {
    this.setTurn(Stone.None);
    
    // 영역 계산
    // const territories = this.getAllTerritories();
    this.notifyStateChange();
  }

  /**
   * 턴 변경
   */
  public setTurn(turn: Stone): void {
    this.turn = turn;
  }

  /**
   * 다음 턴으로 넘어가기
   */
  private nextTurn(): void {
    // 먼저 현재 상태 저장
    this.gameState = this.newGameState();
    if (this.lastMove) {
      this.gameState.move = this.lastMove.copy();
    }
    
    // 그 다음 턴 변경
    if (this.turn === Stone.Black) {
      this.setTurn(Stone.White);
    } else {
      this.setTurn(Stone.Black);
    }
    
    this.notifyStateChange();
  }

  /**
   * 새 게임 상태 생성
   */
  private newGameState(comment: string = ''): GameState {
    return new GameStateImpl(
      this.copyIntersections(), 
      this.turn, 
      this.blackScore, 
      this.whiteScore, 
      this.gameState,
      [],
      comment
    );
  }

  /**
   * 게임 상태 불러오기
   */
  private loadGameState(state: GameState): void {
    if (!state) return;
    
    const { xLines, yLines } = this;

    this.setTurn(state.turn);

    for (let x = 0; x < xLines; x++) {
      for (let y = 0; y < yLines; y++) {
        this.intersections[x][y].stone = state.intersections[x][y].stone;
      }
    }

    this.blackScore = state.blackScore;
    this.whiteScore = state.whiteScore;
    this.gameState = state;
    this.markers = state.markers ?? [];

    // 턴을 해당 수순에 맞게 설정
    if (state.move && state.move.stone === Stone.Black) {
      this.setTurn(Stone.White); // 마지막 수가 흑이면 백의 턴
    } else if (state.move && state.move.stone === Stone.White) {
      this.setTurn(Stone.Black); // 마지막 수가 백이면 흑의 턴
    }

    this.notifyStateChange();
  }

  /**
   * 고 규칙 체크 (같은 위치에 돌을 놓는 패턴 방지)
   */
  private checkForKo(): boolean {
    if (!this.gameState?.prevGameState) return false;
    
    const { xLines, yLines, intersections } = this;
    const prevState = this.gameState.prevGameState;

    for (let x = 0; x < xLines; x++) {
      for (let y = 0; y < yLines; y++) {
        if (intersections[x][y].stone !== prevState.intersections[x][y].stone) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 주변에 잡히는 돌 그룹 찾기
   */
  private getCapturedNeighbors(xPos: number, yPos: number): Intersection[][] {
    const otherPlayer = this.getOtherPlayer();
    const intersection = this.intersections[xPos][yPos];
    const neighbors = this.getAdjacentNeighbors(intersection);
    const capturedGroups: Intersection[][] = [];

    // 이미 처리된 돌을 추적하는 HashSet
    const processedStones: HashSet<Intersection> = new HashSet();
    
    for (const neighbor of neighbors) {
      if (neighbor && neighbor.stone === otherPlayer) {
        // 이미 처리된 돌은 건너뛰기
        if (processedStones.includes(neighbor)) continue;
        
        const captured = this.getCapturedGroup(neighbor);
        
        if (captured.length > 0) {
          // 새로 포획된 그룹의 모든 돌을 processedStones에 추가
          captured.forEach(stone => processedStones.insert(stone));
          capturedGroups.push(captured);
        }
      }
    }

    return capturedGroups;
  }

  /**
   * 돌이 잡히는지 확인
   */
  private getCapturedGroup(intersection: Intersection, visited: HashSet<Intersection> = new HashSet()): Intersection[] {
    const neighbors = this.getAdjacentNeighbors(intersection).filter(int => !visited.includes(int));
    
    // visited 해시셋에 현재 돌과 방문하지 않은 이웃들 추가
    [intersection, ...neighbors].forEach(int => visited.insert(int));

    let captured = true;
    let group = [intersection];
    
    for (const neighbor of neighbors) {
      if (neighbor === null) {
        // 가장자리인 경우는 항상 잡힘
        captured = true;
      } else if (neighbor.stone === Stone.None) {
        // 빈 공간이 있으면 잡히지 않음
        captured = false;
      } else if (neighbor.stone === intersection.stone) {
        // 같은 색상의 돌이면 연결된 그룹 확인
        const subGroup = this.getCapturedGroup(neighbor, visited);
        captured = captured && subGroup.length > 0;

        if (captured) {
          group = [...group, ...subGroup];
        }
      }

      if (!captured) {
        return [];
      }
    }

    return group;
  }

  /**
   * 다른 플레이어 (색상) 가져오기
   */
  private getOtherPlayer(turn?: Stone): Stone {
    const currentTurn = turn !== undefined ? turn : this.turn;
    return currentTurn === Stone.Black ? Stone.White : Stone.Black;
  }

  /**
   * 인접한 교차점들 가져오기
   */
  private getAdjacentNeighbors(intersection: Intersection): (Intersection | null)[] {
    const { xPos, yPos } = intersection;
    
    // 중복 제거하여 이웃 교차점들 가져오기
    const adjacentPositions = [
      this.getValidIntersection(xPos, yPos - 1),
      this.getValidIntersection(xPos, yPos + 1),
      this.getValidIntersection(xPos - 1, yPos),
      this.getValidIntersection(xPos + 1, yPos)
    ];
    
    // Create HashSet only with non-null intersections
    // const validNeighbors = adjacentPositions.filter((int): int is Intersection => int !== null);
    // const neighbors = new HashSet<Intersection>(...validNeighbors);
    
    return adjacentPositions;
  }

  /**
   * 유효한 교차점 가져오기 (바둑판 범위 체크)
   */
  private getValidIntersection(xPos: number, yPos: number): Intersection | null {
    if (0 <= xPos && xPos < this.xLines && 0 <= yPos && yPos < this.yLines) {
      return this.intersections[xPos][yPos];
    }
    return null;
  }

  /**
   * 영역 점령
   */
  public claimTerritory(xPos: number, yPos: number): boolean {
    const intersection = this.intersections[xPos][yPos];

    if (intersection.stone === Stone.None || this.claimedTerritoryLookup.includes(intersection)) {
      return false;
    }

    const owner = this.getOtherPlayer(intersection.stone);
    const territory = this.getTerritory(intersection, owner);

    this.claimedTerritories.push(territory);

    for (const int of territory.region) {
      this.claimedTerritoryLookup.insert(int);
    }

    this.notifyStateChange();
    return true;
  }

  /**
   * 모든 영역 가져오기
   */
  public getAllTerritories(): Territory[] {
    const apparentTerritories = this.getAllApparentTerritories(this.claimedTerritoryLookup);
    return [...this.claimedTerritories, ...apparentTerritories];
  }

  /**
   * 명확한 영역 계산하기
   */
  private getAllApparentTerritories(exclude: HashSet<Intersection> = new HashSet()): Territory[] {
    const { xLines, yLines } = this;
    const visited = new HashSet<Intersection>();
    const territories: Territory[] = [];

    for (let x = 0; x < xLines; x++) {
      for (let y = 0; y < yLines; y++) {
        const int = this.intersections[x][y];

        if (int.stone === Stone.None && !visited.includes(int) && !exclude.includes(int)) {
          const territory = this.getApparentTerritory(int, visited, true);

          if (territory.owner !== Stone.Unknown) {
            territories.push(territory);
          }
        }
      }
    }

    return territories;
  }

  /**
   * 명확한 영역 가져오기
   */
  private getApparentTerritory(
    intersection: Intersection, 
    visited: HashSet<Intersection> = new HashSet(), 
    greedy: boolean = false, 
    mode: Pointer<Stone> = { value: Stone.None }
  ): Territory {
    if (intersection.stone !== Stone.None) {
      return new TerritoryImpl(Stone.None, []);
    }

    const neighbors = this.getAdjacentNeighbors(intersection).filter(int => 
      int !== null && !visited.includes(int)
    );

    // visited 해시셋에 현재 돌과 빈 교차점인 이웃들 추가
    [intersection, ...neighbors].forEach(int => {
      if (int !== null && int.stone === Stone.None) {
        visited.insert(int);
      }
    });

    let territory = new TerritoryImpl(Stone.None, [intersection]);
    
    for (const neighbor of neighbors) {
      if (neighbor === null) {
        // 가장자리
        continue;
      }

      if (mode.value === Stone.None) {
        // 모드가 아직 설정되지 않았으면 이웃의 색상으로 설정
        mode.value = neighbor.stone;
      }
      
      if (neighbor.stone === Stone.None) {
        // 빈 교차점이면 재귀적으로 탐색
        const subTerritory = this.getApparentTerritory(neighbor, visited, greedy, mode);

        if (subTerritory.owner !== Stone.Unknown) {
          territory = territory.merge(subTerritory);
        }
      } else if (neighbor.stone === mode.value) {
        // 현재 모드와 같은 색상
        continue;
      } else if (neighbor.stone !== mode.value) {
        // 다른 색상이 발견되면 영역이 아님
        mode.value = Stone.Unknown;
      }

      if (!greedy && mode.value === Stone.Unknown) {
        break;
      }
    }

    if (mode.value === Stone.Unknown) {
      return new TerritoryImpl(Stone.Unknown, []);
    }

    return new TerritoryImpl(mode.value, territory.region);
  }

  /**
   * 영역 가져오기
   */
  private getTerritory(
    intersection: Intersection, 
    mode: Stone, 
    visited: HashSet<Intersection> = new HashSet()
  ): Territory {
    if (intersection.stone === mode) {
      return new TerritoryImpl(Stone.None, []);
    }

    const neighbors = this.getAdjacentNeighbors(intersection).filter(int => 
      int !== null && !visited.includes(int)
    );

    // visited 해시셋에 현재 위치와 이웃들 추가
    [intersection, ...neighbors].forEach(int => visited.insert(int));

    let territory = new TerritoryImpl(mode, [intersection]);
    
    for (const neighbor of neighbors) {
      if (neighbor === null) {
        // 가장자리
        continue;
      }

      if (neighbor.stone !== mode) {
        // 모드와 다른 색이면 재귀적으로 탐색
        const subTerritory = this.getTerritory(neighbor, mode, visited);
        territory = territory.merge(subTerritory);
      }
    }

    return territory;
  }
  
  /**
   * 상태 변화 알림
   */
  public notifyStateChange(): void {
    if (this.stateChangeCallback) {
      this.stateChangeCallback();
    }
  }

  // 게터 메서드들
  public getXLines(): number { return this.xLines; }
  public getYLines(): number { return this.yLines; }
  public getTurn(): Stone { return this.turn; }
  public getBlackScore(): number { return this.blackScore; }
  public getWhiteScore(): number { return this.whiteScore; }
  public getLastMove(): Intersection | null { return this.lastMove; }
  public getGameState(): GameState | null { return this.gameState; }
  public getCurrentAndNextMove(): { current?: Intersection; next?: Intersection } {
    return {
      current: this.gameState?.prevGameState?.move ?? undefined,
      next: this.gameState?.move ?? undefined
    };
  }

  public getScoreWithTerritory(color: Stone): { score: number, territory: number } {
    const baseScore = color === Stone.Black ? this.blackScore : this.whiteScore;
    let territoryScore = 0;
    
    const territories = this.getAllTerritories();
    for (const territory of territories) {
      if (territory.owner === color) {
        territoryScore += territory.score;
      }
    }
    
    return { score: baseScore, territory: territoryScore };
  }

  public addMarker(x: number, y: number, type: string, label?: string): void {
    
    const existingIndex = this.markers.findIndex(m => m.x === x && m.y === y);
  
    if (existingIndex !== -1) {
      // 기존 마커 삭제
      this.markers.splice(existingIndex, 1);
      if (this.gameState && this.gameState.markers) {
        this.gameState.markers = this.gameState.markers.filter(m => !(m.x === x && m.y === y));
      }
    }
  
    const moveNum = this.gameState?.moveNum ?? 0;
    const marker = { x, y, type, label, moveNum };
  
    // 새 마커 추가
    this.markers.push(marker);
    if (this.gameState) {
      this.gameState.markers = [...(this.gameState.markers ?? []), marker];
    }
  
    this.notifyStateChange();
  }
  public setStateChangeCallback(cb: () => void): void {
    this.stateChangeCallback = cb;
  }

  public getGameTree(): GameTree {
    return this.gameTree;
  }

  public navigateToNode(nodeId: string): void {
    const targetNode = this.findNodeById(nodeId);
    if (!targetNode) return;

    // 1. 새로운 메인 패스 생성
    const newMainPath = new Set(['root']);
    
    // 2. 선택된 노드부터 루트까지의 경로를 메인 패스로 설정
    let current: GameNode | null = targetNode;
    while (current) {
      newMainPath.add(current.id);
      if (current.parentId) {
        current = this.findNodeById(current.parentId);
      } else {
        break;
      }
    }

    // 3. 메인 패스 업데이트
    this.gameTree.mainPath = newMainPath;

    // 4. 보드 상태 업데이트
    this.resetBoardState(targetNode);
    this.currentNode = targetNode;
    this.gameTree.currentNodeId = nodeId;

    this.notifyStateChange();
  }

  private resetBoardState(targetNode: GameNode): void {
    // 보드 초기화
    this.intersections = Game.initIntersections(this.xLines, this.yLines);
    
    // 경로 상의 수를 복원
    const path = this.getPathToNode(targetNode);
    for (const node of path) {
      const move = node.data.move;
      if (move && move.x >= 0 && move.y >= 0) {
        this.intersections[move.x][move.y].stone = move.color;
        if (move.color === Stone.Black) {
          this.turn = Stone.White;
        } else {
          this.turn = Stone.Black;
        }
      }
    }
  }

  // 노드까지의 경로 찾기
  private getPathToNode(node: GameNode): GameNode[] {
    const path: GameNode[] = [];
    let current: GameNode | null = node;

    while (current) {
      path.unshift(current);
      current = current.parentId ? this.findNodeById(current.parentId) : null;
    }

    return path;
  }

  // 특정 노드 상태로 보드 초기화
  private resetBoardToNode(node: GameNode): void {
    this.intersections = Game.initIntersections(this.xLines, this.yLines);
    this.blackScore = 0;
    this.whiteScore = 0;

    const path = this.getPathToNode(node);
    for (const n of path) {
      const move = n.data.move;
      if (move && move.x >= 0 && move.y >= 0) {
        this.makeMove(move.x, move.y);
      }
    }
  }

  // 게임 트리 상태 업데이트
  private updateGameTreeState(node: GameNode): void {
    // 메인 수순 업데이트
    const newMainPath = new Set<string>();
    let current: GameNode | null = node;
    
    while (current) {
      newMainPath.add(current.id);
      current = this.findNodeById(current.parentId || '');
    }

    this.gameTree.mainPath = newMainPath;
    this.gameTree.currentNodeId = node.id;
    this.currentNode = node;
  }

  private findNodeById(nodeId: string): GameNode | null {
    // Map에서 먼저 조회 (O(1) 시간 복잡도)
    if (this.nodeMap.has(nodeId)) {
      return this.nodeMap.get(nodeId)!;
    }

    // Map에 없는 경우 트리 순회로 fallback
    const traverse = (node: GameNode): GameNode | null => {
      if (node.id === nodeId) {
        // 찾은 노드를 Map에 캐시
        this.nodeMap.set(nodeId, node);
        return node;
      }
      for (const child of node.children) {
        const found = traverse(child);
        if (found) return found;
      }
      return null;
    };

    return traverse(this.gameTree.root);
  }

  private restoreGameState(node: GameNode): void {
    // Reset the board
    this.intersections = Game.initIntersections(this.xLines, this.yLines);
    this.blackScore = 0;
    this.whiteScore = 0;
    
    // Get path from root to target node
    const path: GameNode[] = [];
    let current: GameNode | null = node;
    while (current) {
      path.unshift(current);
      current = this.findNodeById(current.parentId || '');
    }
    
    // Replay moves along the path
    for (const node of path) {
      if (node.data?.move && node.data.move.x >= 0 && node.data.move.y >= 0) {
        this.makeMove(node.data.move.x, node.data.move.y);
      }
    }
    
    this.currentNode = node;
  }

  /**
   * 변화도 전환
   * @param targetNodeId 전환하고자 하는 변화도의 노드 ID
   */
  public switchVariation(targetNodeId: string): void {
    const targetNode = this.findNodeById(targetNodeId);
    if (!targetNode || !targetNode.parentId) return;

    // 1. 새로운 메인 패스 생성
    const newMainPath = new Set(['root']);
    
    // 2. 타겟 노드부터 루트까지 거슬러 올라가며 메인 패스 설정
    let current: GameNode | null = targetNode;
    while (current) {
      newMainPath.add(current.id);
      if (current.parentId) {
        current = this.findNodeById(current.parentId);
      } else {
        break;
      }
    }

    // 3. 타겟 노드의 첫 번째 자식들도 메인 패스에 추가
    const addFirstChildrenToMainPath = (node: GameNode) => {
      if (node.children.length > 0) {
        const firstChild = node.children[0];
        newMainPath.add(firstChild.id);
        addFirstChildrenToMainPath(firstChild);
      }
    };
    addFirstChildrenToMainPath(targetNode);

    // 4. 메인 패스 업데이트
    this.gameTree.mainPath = newMainPath;

    // 5. 현재 노드 업데이트 및 UI 갱신
    this.navigateToNode(targetNodeId);
    this.notifyStateChange();
  }
}