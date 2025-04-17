'use client';

import React from 'react';
import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import LandingPage from '@/components/LandingPage';
import GameBoard from '@/components/GameBoard';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import useGame from '@/hooks/useGame';

/**
 * 사용자의 인증 및 게임 상태에 따라 게임 화면 또는 랜딩 페이지를 렌더링하는 React 컴포넌트입니다.
 *
 * 사용자가 로그인되어 있고 게임이 시작되지 않은 경우, 게임을 자동으로 시작합니다.
 * 게임이 시작된 경우 내비게이션 바, 게임 보드, 푸터를 포함한 게임 인터페이스를 표시하며,
 * 그렇지 않으면 랜딩 페이지를 보여줍니다.
 */
export default function Home() {
  const { isGameStarted, startGame } = useGame();
  const { data: session, status } = useSession();
  
  // 로그인 상태 확인 후 게임 자동 시작
  useEffect(() => {
    if (status === 'authenticated' && session && !isGameStarted) {
      startGame();
    }
  }, [status, session, isGameStarted, startGame]);
  
  const handleLogoClick = () => {
    signOut({ redirect: true, callbackUrl: '/' });
  };
  
  return (
    <>
      {isGameStarted ? (
        <div className="min-h-screen flex flex-col">
          <NavBar onLogoClick={handleLogoClick} />
          
          <main className="flex-grow">
            <GameBoard />
          </main>
          
          <Footer className="py-6" />
        </div>
      ) : (
        <LandingPage />
      )}
    </>
  );
}