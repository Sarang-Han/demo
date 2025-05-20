'use client';

import React from 'react';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import LandingPage from '@/components/LandingPage';
import GameBoard from '@/components/GameBoard';
import useGame from '@/hooks/useGame';

export default function Home() {
  const { isGameStarted, startGame } = useGame();
  const { data: session, status } = useSession();
  
  // 로그인 상태 확인 후 게임 자동 시작
  useEffect(() => {
    if (status === 'authenticated' && session && !isGameStarted) {
      startGame();
    }
  }, [status, session, isGameStarted, startGame]);
  
  return (
    <>
      {isGameStarted ? (
        <div className="h-screen overflow-hidden">
          <GameBoard />
        </div>
      ) : (
        <LandingPage />
      )}
    </>
  );
}