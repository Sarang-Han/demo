'use client';

import React from 'react';
import { X } from '@phosphor-icons/react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: number;
  status: string;
}

export default function AnalysisModal({ 
  isOpen, 
  onClose, 
  progress, 
  status 
}: AnalysisModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-11/12 max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">AI 기보 분석 중</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} weight="bold" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-700 mb-2">{status}</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-right text-sm text-gray-500 mt-1">{progress}%</p>
        </div>
        
        {progress < 100 && (
          <p className="text-sm text-gray-500 italic">
            바둑 AI 엔진이 최적의 수를 분석 중입니다. 이 작업은 몇 분 정도 걸릴 수 있습니다.
          </p>
        )}
        
        {progress === 100 && (
          <div className="mt-4 flex justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}