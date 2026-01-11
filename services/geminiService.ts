import { GoogleGenAI } from "@google/genai";
import { OfferingData } from "../types";

export const generateMinistryReport = async (data: OfferingData): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("Gemini API key is not set. Skipping AI report generation.");
    return "AI 보고서 생성을 위해 API 키가 필요합니다.";
  }

  try {
    // Initialize with named parameter as per guidelines
    const ai = new GoogleGenAI({ apiKey });
    
    const totalIncome = Object.values(data.counting).reduce((acc, day) => 
      acc + Object.values(day).reduce((accTime, time) => 
        accTime + Object.entries(time).reduce((accDenom, [denom, qty]) => 
          accDenom + (Number(denom) * qty), 0), 0), 0);

    const totalExpense = Object.values(data.expenses).reduce((a, b) => a + b, 0);
    const totalAttendance = Object.values(data.attendance).reduce((acc, day) => 
      acc + Object.values(day).reduce((a, b) => a + b, 0), 0);

    const prompt = `
      다음은 이번 주 교회 헌금 및 지출 데이터입니다.
      이 데이터를 바탕으로 정중하고 격려가 되는 '목회 회계 요약 보고서'를 한국어로 작성해주세요.
      
      [데이터 요약]
      - 총 헌금: ${totalIncome.toLocaleString()}원
      - 총 지출: ${totalExpense.toLocaleString()}원
      - 잔액: ${(totalIncome - totalExpense).toLocaleString()}원
      - 총 참석 인원: ${totalAttendance}명
      - 주요 지출 항목: ${Object.entries(data.expenses).filter(([_, v]) => v > 0).map(([k, v]) => `${k}(${v.toLocaleString()}원)`).join(', ')}

      보고서에는 다음 내용이 포함되어야 합니다:
      1. 감사의 인사와 성경적 격려 메시지 (짧게)
      2. 재정 현황 요약
      3. 효율적인 재정 집행에 대한 짧은 코멘트
      4. 마무리 기도문 느낌의 문구
    `;

    // Correct method call for generating content using the provided helper
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Access .text property directly (not a method)
    return response.text || "보고서를 생성할 수 없습니다.";
  } catch (error) {
    console.error("AI Report generation failed:", error);
    return "AI 분석을 가져오는 중 오류가 발생했습니다.";
  }
};
