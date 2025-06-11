# Goggle

## 🗂️ 프로젝트 구조

```
src/
  app/            # Next.js 앱 엔트리, 글로벌 스타일, 라우팅
  components/     # UI 컴포넌트 (Board, GameBoard, GameControls, Sidebar 등)
  hooks/          # 커스텀 React 훅 (useGame 등)
  lib/            # 바둑 로직, SGF 파서, d3, AI 분석, IndexedDB 등 핵심 로직
  types/          # 타입 정의 (TypeScript)
public/           # 정적 파일 (이미지, favicon 등)
...
```

## 주요 기능

- SGF(바둑 기보) 파일 업로드/저장/삭제/다운로드/즐겨찾기
- 바둑판 SVG 시각화, 다양한 마커 및 하이라이트 표시
- AI(카타고 등) 기반 기보 분석 및 결과 시각화
- 소셜 로그인 및 사용자별 데이터 관리


## ⚙️ How to Build

1. **의존성 설치**
   ```sh
   npm install
   ```
2. **개발 서버 실행**
   ```sh
   npm run dev
   ```
   - 기본적으로 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

3. **프로덕션 빌드**
   ```sh
   npm run build
   npm start
   ```


## 🛠️ How to Install

1. Node.js(18+)와 npm이 설치되어 있어야 합니다.
2. 프로젝트 클론:
   ```sh
   git clone https://github.com/Sarang-Han/demo.git
   cd demo
   ```
3. 환경변수 설정: `.env.local` 파일을 생성하고 아래와 같이 입력합니다.
   ```
   # NextAuth 설정 (소셜 로그인용)
   NEXTAUTH_URL = http://localhost:3000
   NEXTAUTH_SECRET = 임의의_긴_문자열_입력

   # Google OAuth
   GOOGLE_CLIENT_ID = 구글_클라이언트_ID
   GOOGLE_CLIENT_SECRET = 구글_클라이언트_시크릿

   # Naver OAuth (선택)
   NAVER_CLIENT_ID = 네이버_클라이언트_ID
   NAVER_CLIENT_SECRET = 네이버_클라이언트_시크릿
   ```
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: [Google Cloud Console](https://console.cloud.google.com/)에서 발급받은 값
   - `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`: [네이버 개발자 센터](https://developers.naver.com/)에서 발급받은 값

4. 위의 **How to Build** 단계 참고


## 사용된 주요 오픈소스

- **Next.js**: React 기반 SSR/SSG 프레임워크 ([nextjs.org](https://nextjs.org/))
- **React**: UI 라이브러리 ([react.dev](https://react.dev/))
- **d3.js**: SVG 기반 바둑판 렌더링 및 시각화 ([d3js.org](https://d3js.org/))
- **@sabaki/boardmatcher**: 바둑 패턴 인식용 라이브러리
- **next-auth**: 소셜 로그인/인증
- **IndexedDB**: 브라우저 내 로컬 데이터 저장 (SGF, 하이라이트 등)
- **Tailwind CSS**: 유틸리티 기반 CSS 프레임워크
- **FileSaver.js**: SGF 파일 다운로드 지원


## 기타 참고

- SGF 파싱 및 저장 로직: [`src/lib/game.ts`](src/lib/game.ts), [`src/lib/sgfStorage.ts`](src/lib/sgfStorage.ts)
- 바둑판 렌더링: [`src/lib/d3Setup.ts`](src/lib/d3Setup.ts), [`src/components/Board.tsx`](src/components/Board.tsx)
- AI 분석 연동: [`src/lib/sgfAnalyzer.ts`](src/lib/sgfAnalyzer.ts)
- 타입 정의: [`src/lib/types.ts`](src/lib/types.ts)