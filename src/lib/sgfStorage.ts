import { SGFFile, HighlightData } from "@/components/LeftSidebar";

// DB 설정 값
const DB_NAME = 'goggleDB';
const DB_VERSION = 1;
const SGF_STORE = 'sgfFiles';
const CONTENT_STORE = 'sgfContents';
const HIGHLIGHTS_STORE = 'highlights';

// 이벤트 버스 (컴포넌트 간 통신용)
const eventBus = {
  dispatch(eventName: string, data?: unknown): void {
    const event = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(event);
  },
  subscribe(eventName: string, callback: (event: CustomEvent) => void): () => void {
    const handler = (e: Event): void => {
      callback(e as CustomEvent);
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }
};

interface SGFContent {
  id: string;
  content: string;
}

interface SGFHighlight {
  fileId: string;
  highlights: HighlightData[];
}

// IndexedDB 연결 및 초기화
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('DB 연결에 실패했습니다:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // SGF 파일 메타데이터 저장소
      if (!db.objectStoreNames.contains(SGF_STORE)) {
        const sgfStore = db.createObjectStore(SGF_STORE, { keyPath: 'id' });
        sgfStore.createIndex('favorite', 'favorite', { unique: false });
        sgfStore.createIndex('createdAt', 'createdAt', { unique: false });
        sgfStore.createIndex('openedAt', 'openedAt', { unique: false });
        sgfStore.createIndex('isAnalyzed', 'isAnalyzed', { unique: false });
      }
      
      // SGF 내용 저장소
      if (!db.objectStoreNames.contains(CONTENT_STORE)) {
        db.createObjectStore(CONTENT_STORE, { keyPath: 'id' });
      }
      
      // 하이라이트 데이터 저장소
      if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE)) {
        db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: 'fileId' });
      }
    };
  });
}

// DB 트랜잭션 헬퍼 함수
function createTransaction(
  storeNames: string | string[], 
  mode: IDBTransactionMode = 'readonly'
): Promise<{ 
  transaction: IDBTransaction, 
  stores: Record<string, IDBObjectStore>
}> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDatabase();
      const storeNamesArray = typeof storeNames === 'string' ? [storeNames] : storeNames;
      const transaction = db.transaction(storeNamesArray, mode);
      
      const stores: Record<string, IDBObjectStore> = {};
      storeNamesArray.forEach(name => {
        stores[name] = transaction.objectStore(name);
      });
      
      resolve({ transaction, stores });
    } catch (error) {
      reject(error);
    }
  });
}

// IndexedDB를 이용한 SGF 파일 관리 서비스
export const sgfStorage = {
  // 모든 SGF 파일 목록 가져오기
  getAll: async (): Promise<SGFFile[]> => {
    try {
      const { stores } = await createTransaction(SGF_STORE);
      const store = stores[SGF_STORE];
      
      return new Promise((resolve, reject) => {
        const request = store.index('openedAt').openCursor(null, 'prev');
        const files: SGFFile[] = [];
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            files.push(cursor.value as SGFFile);
            cursor.continue();
          } else {
            resolve(files);
          }
        };
        
        request.onerror = () => {
          console.error('파일 목록 조회 중 오류 발생:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('SGF 파일 목록을 불러오는 중 오류 발생:', error);
      return [];
    }
  },

  // SGF 파일 내용 가져오기
  getSGFContent: async (fileId: string): Promise<string | null> => {
    try {
      const { stores } = await createTransaction(CONTENT_STORE);
      const store = stores[CONTENT_STORE];
      
      return new Promise((resolve, reject) => {
        const request = store.get(fileId);
        
        request.onsuccess = () => {
          const content = request.result as SGFContent | undefined;
          resolve(content ? content.content : null);
        };
        
        request.onerror = () => {
          console.error('SGF 내용 조회 중 오류 발생:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('SGF 파일 내용을 불러오는 중 오류 발생:', error);
      return null;
    }
  },

  // SGF 파일 저장하기
  saveSGF: async (name: string, content: string, thumbnail?: string): Promise<SGFFile> => {
    try {
      // 중복 파일명 체크
      const files = await sgfStorage.getAll();
      
      let uniqueName = name;
      let counter = 1;
      
      while (files.some(file => file.name === uniqueName)) {
        const nameParts = name.split('.');
        const ext = nameParts.pop() || '';
        const baseName = nameParts.join('.');
        uniqueName = `${baseName} (${counter}).${ext}`;
        counter++;
      }
      
      // 새 SGF 파일 정보 생성
      const newFile: SGFFile = {
        id: Date.now().toString(),
        name: uniqueName,
        openedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        favorite: false,
        thumbnail
      };
      
      const { transaction, stores } = await createTransaction([SGF_STORE, CONTENT_STORE], 'readwrite');
      const sgfStore = stores[SGF_STORE];
      const contentStore = stores[CONTENT_STORE];
      
      return new Promise((resolve, reject) => {
        // 파일 메타데이터 저장
        const metaRequest = sgfStore.add(newFile);
        
        metaRequest.onsuccess = () => {
          // 파일 내용 저장
          const contentRequest = contentStore.add({
            id: newFile.id,
            content
          });
          
          contentRequest.onsuccess = () => {
            // 이벤트 발생
            eventBus.dispatch('sgf-storage-changed', { type: 'add', file: newFile });
            resolve(newFile);
          };
          
          contentRequest.onerror = () => {
            console.error('SGF 내용 저장 중 오류 발생:', contentRequest.error);
            reject(contentRequest.error);
          };
        };
        
        metaRequest.onerror = () => {
          console.error('SGF 메타데이터 저장 중 오류 발생:', metaRequest.error);
          reject(metaRequest.error);
        };
        
        transaction.onerror = (event) => {
          console.error('트랜잭션 실패:', (event.target as IDBTransaction).error);
          reject((event.target as IDBTransaction).error);
        };
      });
    } catch (error) {
      console.error('SGF 파일 저장 중 오류 발생:', error);
      throw error;
    }
  },

  // 분석된 SGF 파일로 저장
  saveSGFWithAnalysis: async (
    name: string, 
    content: string, 
    highlights: HighlightData[], 
    thumbnail?: string
  ): Promise<SGFFile> => {
    try {
      // 중복 파일명 체크
      const files = await sgfStorage.getAll();
      
      let uniqueName = name;
      let counter = 1;
      
      while (files.some(file => file.name === uniqueName)) {
        const nameParts = name.split('.');
        const ext = nameParts.pop() || '';
        const baseName = nameParts.join('.');
        uniqueName = `${baseName} (${counter}).${ext}`;
        counter++;
      }
      
      // 새 SGF 파일 정보 생성
      const newFile: SGFFile = {
        id: Date.now().toString(),
        name: uniqueName,
        openedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        favorite: false,
        thumbnail,
        isAnalyzed: true,
      };
      
      const { transaction, stores } = await createTransaction(
        [SGF_STORE, CONTENT_STORE, HIGHLIGHTS_STORE], 
        'readwrite'
      );
      
      const sgfStore = stores[SGF_STORE];
      const contentStore = stores[CONTENT_STORE];
      const highlightsStore = stores[HIGHLIGHTS_STORE];
      
      return new Promise((resolve, reject) => {
        // 파일 메타데이터 저장
        const metaRequest = sgfStore.add(newFile);
        
        metaRequest.onsuccess = () => {
          // 파일 내용 저장
          const contentRequest = contentStore.add({
            id: newFile.id,
            content
          });
          
          contentRequest.onsuccess = () => {
            // 하이라이트 데이터 저장
            const highlightRequest = highlightsStore.add({
              fileId: newFile.id,
              highlights
            });
            
            highlightRequest.onsuccess = () => {
              // 이벤트 발생
              eventBus.dispatch('sgf-storage-changed', { 
                type: 'add', 
                file: newFile, 
                isAnalyzed: true 
              });
              resolve(newFile);
            };
            
            highlightRequest.onerror = () => {
              console.error('하이라이트 데이터 저장 중 오류 발생:', highlightRequest.error);
              reject(highlightRequest.error);
            };
          };
          
          contentRequest.onerror = () => {
            console.error('SGF 내용 저장 중 오류 발생:', contentRequest.error);
            reject(contentRequest.error);
          };
        };
        
        metaRequest.onerror = () => {
          console.error('SGF 메타데이터 저장 중 오류 발생:', metaRequest.error);
          reject(metaRequest.error);
        };
        
        transaction.onerror = (event) => {
          console.error('트랜잭션 실패:', (event.target as IDBTransaction).error);
          reject((event.target as IDBTransaction).error);
        };
      });
    } catch (error) {
      console.error('분석된 SGF 파일 저장 중 오류 발생:', error);
      throw error;
    }
  },

  // 하이라이트 데이터 가져오기
  getHighlights: async (fileId: string): Promise<HighlightData[]> => {
    try {
      const { stores } = await createTransaction(HIGHLIGHTS_STORE);
      const store = stores[HIGHLIGHTS_STORE];
      
      return new Promise((resolve, reject) => {
        const request = store.get(fileId);
        
        request.onsuccess = () => {
          const data = request.result as SGFHighlight | undefined;
          resolve(data ? data.highlights : []);
        };
        
        request.onerror = () => {
          console.error('하이라이트 데이터 조회 중 오류 발생:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('하이라이트 데이터 로드 중 오류:', error);
      return [];
    }
  },

  // 최근 열어본 시간 업데이트
  updateOpenedTime: async (fileId: string): Promise<boolean> => {
    try {
      const { stores } = await createTransaction(SGF_STORE, 'readwrite');
      const store = stores[SGF_STORE];
      
      return new Promise((resolve, reject) => {
        const getRequest = store.get(fileId);
        
        getRequest.onsuccess = () => {
          const file = getRequest.result as SGFFile | undefined;
          
          if (!file) {
            console.error(`파일을 찾을 수 없음: ${fileId}`);
            resolve(false);
            return;
          }
          
          const updatedFile = {
            ...file,
            openedAt: new Date().toISOString()
          };
          
          const putRequest = store.put(updatedFile);
          
          putRequest.onsuccess = () => {
            eventBus.dispatch('sgf-storage-changed', { 
              type: 'update', 
              file: updatedFile 
            });
            resolve(true);
          };
          
          putRequest.onerror = () => {
            console.error('열어본 시간 업데이트 중 오류 발생:', putRequest.error);
            reject(putRequest.error);
          };
        };
        
        getRequest.onerror = () => {
          console.error('파일 조회 중 오류 발생:', getRequest.error);
          reject(getRequest.error);
        };
      });
    } catch (error) {
      console.error('열어본 시간 업데이트 중 오류 발생:', error);
      return false;
    }
  },

  // 즐겨찾기 토글
  toggleFavorite: async (fileId: string): Promise<void> => {
    try {
      const { stores } = await createTransaction(SGF_STORE, 'readwrite');
      const store = stores[SGF_STORE];
      
      return new Promise((resolve, reject) => {
        const getRequest = store.get(fileId);
        
        getRequest.onsuccess = () => {
          const file = getRequest.result as SGFFile | undefined;
          
          if (!file) {
            reject(new Error(`파일을 찾을 수 없음: ${fileId}`));
            return;
          }
          
          const updatedFile = {
            ...file,
            favorite: !file.favorite
          };
          
          const putRequest = store.put(updatedFile);
          
          putRequest.onsuccess = () => {
            eventBus.dispatch('sgf-storage-changed', { 
              type: 'update', 
              file: updatedFile 
            });
            resolve();
          };
          
          putRequest.onerror = () => {
            console.error('즐겨찾기 토글 중 오류 발생:', putRequest.error);
            reject(putRequest.error);
          };
        };
        
        getRequest.onerror = () => {
          console.error('파일 조회 중 오류 발생:', getRequest.error);
          reject(getRequest.error);
        };
      });
    } catch (error) {
      console.error('즐겨찾기 토글 중 오류 발생:', error);
    }
  },

  // SGF 파일 삭제
  deleteSGF: async (fileId: string): Promise<boolean> => {
    try {
      const { stores } = await createTransaction(
        [SGF_STORE, CONTENT_STORE, HIGHLIGHTS_STORE], 
        'readwrite'
      );
      
      const sgfStore = stores[SGF_STORE];
      const contentStore = stores[CONTENT_STORE];
      const highlightsStore = stores[HIGHLIGHTS_STORE];
      
      return new Promise((resolve, reject) => {
        // 파일 메타데이터 가져오기 (삭제 이벤트용)
        const getRequest = sgfStore.get(fileId);
        let fileToDelete: SGFFile | undefined;
        
        getRequest.onsuccess = () => {
          fileToDelete = getRequest.result as SGFFile | undefined;
          
          // 메타데이터 삭제
          const metaRequest = sgfStore.delete(fileId);
          
          metaRequest.onsuccess = () => {
            // 내용 삭제
            const contentRequest = contentStore.delete(fileId);
            
            contentRequest.onsuccess = () => {
              // 하이라이트 삭제 시도 (존재할 경우)
              const highlightRequest = highlightsStore.delete(fileId);
              
              highlightRequest.onsuccess = () => {
                if (fileToDelete) {
                  eventBus.dispatch('sgf-storage-changed', { 
                    type: 'delete', 
                    fileId 
                  });
                }
                resolve(true);
              };
              
              highlightRequest.onerror = () => {
                // 하이라이트가 없을 수도 있으므로 오류는 무시
                if (fileToDelete) {
                  eventBus.dispatch('sgf-storage-changed', { 
                    type: 'delete', 
                    fileId 
                  });
                }
                resolve(true);
              };
            };
            
            contentRequest.onerror = () => {
              console.error('SGF 내용 삭제 중 오류 발생:', contentRequest.error);
              reject(contentRequest.error);
            };
          };
          
          metaRequest.onerror = () => {
            console.error('SGF 메타데이터 삭제 중 오류 발생:', metaRequest.error);
            reject(metaRequest.error);
          };
        };
        
        getRequest.onerror = () => {
          console.error('파일 조회 중 오류 발생:', getRequest.error);
          reject(getRequest.error);
        };
      });
    } catch (error) {
      console.error('SGF 파일 삭제 중 오류 발생:', error);
      return false;
    }
  },
  
  // 이벤트 구독 (컴포넌트에서 사용)
  subscribe: (callback: (event: { type: string; file?: SGFFile; fileId?: string; isAnalyzed?: boolean }) => void): () => void => {
    const handler = (e: Event): void => {
      const customEvent = e as CustomEvent;
      callback(customEvent.detail);
    };
    
    window.addEventListener('sgf-storage-changed', handler);
    return () => window.removeEventListener('sgf-storage-changed', handler);
  }
};