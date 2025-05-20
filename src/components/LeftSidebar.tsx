"use client";

// 기존 import 유지
import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { motion } from "framer-motion";
// 기존 아이콘 import 유지
import { 
  ChevronDoubleLeftIcon, 
  ChevronDoubleRightIcon, 
  DocumentIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
// Intersection 타입 import 추가
import { Intersection } from "@/lib/types";

export interface SGFFile {
  id: string;
  name: string;
  openedAt: string;
  createdAt: string;
  favorite?: boolean;
  thumbnail?: string;
  isAnalyzed?: boolean;
  highlights?: HighlightData[];
}

// 하이라이트 데이터 인터페이스
export interface HighlightData {
  id: string;
  startMove: number;
  endMove: number; 
  description: string;
  boardSnapshot?: Intersection[][];
}

interface DeleteModalProps {
  file: SGFFile;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ file, onConfirm, onCancel }) => {
  const handleConfirmClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('DeleteModal: 삭제 버튼 클릭');
    onConfirm();
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('DeleteModal: 취소 버튼 클릭');
    onCancel();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">파일 삭제</h3>
            <button 
              onClick={handleCancelClick}
              className="text-gray-400 hover:text-gray-500"
              type="button"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-4">
            <span className="font-semibold text-black">{file.name}</span> 파일을 삭제하시겠습니까?
          </p>
          <p className="text-sm text-red-400 mb-1">
            이 작업은 되돌릴 수 없으며, 파일이 영구적으로 삭제됩니다.
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
          <button
            onClick={handleCancelClick}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            type="button"
          >
            취소
          </button>
          <button
            onClick={handleConfirmClick}
            className="px-4 py-2 text-sm font-medium text-white bg-red-400 border border-transparent rounded-md shadow-sm hover:bg-red-500"
            type="button"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default function LeftSidebar({
  recentFiles,
  onFileClick,
  onToggleFavorite,
  onDeleteFile,
  isCollapsed,
  onToggle,
  currentFileId,
}: {
  recentFiles: SGFFile[];
  onFileClick: (file: SGFFile) => void;
  onToggleFavorite?: (file: SGFFile) => void;
  onDeleteFile?: (file: SGFFile) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  currentFileId?: string;
}) {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = React.useState<'recent' | 'favorite'>('recent');
  const [fileToDelete, setFileToDelete] = useState<SGFFile | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const userToggleRef = useRef<boolean>(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (userToggleRef.current) {
        userToggleRef.current = false;
        return;
      }
      
      if (mobile && !isCollapsed) {
        onToggle();
      } else if (!mobile && isCollapsed) {
        onToggle();
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isCollapsed, onToggle]);

  const handleToggleClick = () => {
    userToggleRef.current = true;
    onToggle();
  };

  const favoriteFiles = recentFiles.filter(file => file.favorite);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.getFullYear() === now.getFullYear()) {
      return new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    }
    
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        if (diffMinutes === 0) {
          return '방금 전';
        }
        return `${diffMinutes}분 전`;
      }
      return `${diffHours}시간 전`;
    }
    
    if (diffDays < 7) {
      return `${diffDays}일 전`;
    }
    
    if (diffDays < 30) {
      const diffWeeks = Math.floor(diffDays / 7);
      return `${diffWeeks}주 전`;
    }
    
    return formatDate(dateString);
  };

  const handleDeleteClick = (file: SGFFile, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('파일 삭제 모달 표시:', file.name);
    setFileToDelete(file);
  };

  const handleConfirmDelete = () => {
    console.log('삭제 확인 클릭');
    if (fileToDelete && onDeleteFile) {
      try {
        setFileToDelete(null);
        setTimeout(() => {
          onDeleteFile(fileToDelete);
        }, 10);
      } catch (error) {
        console.error('삭제 처리 중 오류:', error);
        alert('파일 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleCancelDelete = () => {
    console.log('삭제 취소 클릭');
    setFileToDelete(null);
  };

  return (
    <motion.aside 
      className={`${isCollapsed ? 'w-16' : 'w-72'} p-4 border-r bg-gray-50 flex flex-col h-[calc(100vh-64px)] overflow-hidden transition-all duration-300 ${isMobile ? 'mobile-sidebar' : ''}`}
      initial={false}
    >
      {isCollapsed ? (
        <div className="flex flex-col items-center justify-between h-full">
          <div>
            <button
              onClick={handleToggleClick}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center mb-4"
              aria-label="펼치기"
            >
              <ChevronDoubleRightIcon className="w-5 h-5 text-gray-400" />
            </button>
            
            {status === "authenticated" && session?.user && (
              <div className="relative mb-4">
                <Image
                  src={session.user.image || '/images/default_profile.png'}
                  alt="avatar"
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-white shadow-sm"
                />
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <DocumentIcon className="w-6 h-6 text-blue-500" />
            <StarIcon className="w-6 h-6 text-yellow-400" />
          </div>
          
          <div></div>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            {status === "authenticated" && session?.user ? (
              <div className="flex items-center flex-1">
                <div className="relative">
                  <Image
                    src={session.user.image || '/images/default_profile.png'}
                    alt="avatar"
                    width={40}
                    height={40}
                    className="rounded-full border-2 border-white shadow-sm"
                  />
                </div>
                <div className="ml-3 max-w-[150px]">
                  <h3 className="font-semibold text-gray-800 truncate">{session.user.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 text-gray-500 text-sm">로그인이 필요합니다</div>
            )}
            
            <button
              onClick={handleToggleClick}
              className="hover:bg-gray-200 rounded-full transition-colors p-1.5"
              aria-label="사이드바 접기"
            >
              <ChevronDoubleLeftIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="border-b mb-4"></div>

          <div className="flex mb-4">
            <button 
              className={`flex-1 py-2 text-sm font-medium text-center relative ${activeTab === 'recent' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('recent')}
            >
              최근 파일
              {activeTab === 'recent' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
              )}
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-medium text-center relative ${activeTab === 'favorite' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('favorite')}
            >
              즐겨찾기
              <span className="ml-1.5 bg-gray-200 text-gray-700 px-1.5 py-0.5 text-xs rounded-full">
                {favoriteFiles.length}
              </span>
              {activeTab === 'favorite' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
              )}
            </button>
          </div>

          <div className="flex flex-col flex-grow overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                {activeTab === 'recent' ? '내 SGF 파일' : '즐겨찾기'}
              </h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {activeTab === 'recent' ? recentFiles.length : favoriteFiles.length}개
              </span>
            </div>
            
            <div className="flex-grow bg-white rounded-lg shadow-sm overflow-hidden max-h-[calc(100%-30px)]">
              <div className="h-full overflow-y-auto custom-scrollbar">
                {(activeTab === 'recent' ? recentFiles : favoriteFiles).length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {(activeTab === 'recent' ? recentFiles : favoriteFiles).map((file) => (
                      <li
                        key={file.id}
                        className={`hover:bg-blue-50 transition-colors ${currentFileId === file.id ? 'bg-blue-100' : ''}`}
                      >
                        <div 
                          className="p-3 cursor-pointer"
                          onClick={() => onFileClick(file)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center flex-1 min-w-0">
                              <DocumentIcon className={`w-5 h-5 ${currentFileId === file.id ? 'text-blue-500' : 'text-gray-400'} mr-2 flex-shrink-0`} />
                              <div className="font-medium text-gray-800 truncate">{file.name}</div>
                              
                              {/* 분석된 파일 표시 추가 */}
                              {file.isAnalyzed && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded flex items-center">
                                  AI
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-1 ml-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onToggleFavorite) {
                                    onToggleFavorite(file);
                                  }
                                }}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                title={file.favorite ? "즐겨찾기 해제" : "즐겨찾기에 추가"}
                              >
                                <StarIcon 
                                  className={`w-4 h-4 ${file.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} 
                                />
                              </button>
                              
                              <button 
                                onClick={(e) => handleDeleteClick(file, e)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-red-500"
                                title="삭제"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 mt-1 pl-7">
                            <div className="flex items-center">
                              <CalendarIcon className="w-3.5 h-3.5 mr-1 text-gray-400" />
                              <span>{formatDate(file.createdAt)}</span>
                            </div>
                            <div className="flex items-center text-xs text-gray-400">
                              <ClockIcon className="w-3.5 h-3.5 mr-1" />
                              <span>{getRelativeTime(file.openedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <DocumentIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      {activeTab === 'recent' ? '등록된 파일이 없습니다' : '즐겨찾기한 파일이 없습니다'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {fileToDelete && (
            <DeleteModal 
              file={fileToDelete}
              onConfirm={handleConfirmDelete}
              onCancel={handleCancelDelete}
            />
          )}
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </motion.aside>
  );
}