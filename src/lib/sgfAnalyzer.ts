// SGF 분석 API 클라이언트

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * SGF 분석을 위한 백엔드 API 요청 함수
 * @param sgfContent SGF 파일 내용
 * @returns 분석된 SGF 내용
 */
export async function analyzeSGF(sgfContent: string): Promise<string> {
  try {
    console.log('SGF 분석 요청 시작');
    
    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sgf: sgfContent }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`분석 API 오류 (${response.status}): ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('SGF 분석 완료', data);
    
    return data.analyzedSgf;
  } catch (error) {
    console.error('SGF 분석 중 오류:', error);
    throw error;
  }
}