
import { GoogleGenAI, Type } from "@google/genai";
import { JobInput, AnalysisResult } from "../types";

export const analyzeJobFit = async (input: JobInput): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    As an elite Technical Recruiter and Career Coach, perform a precise, deterministic analysis.
    
    CRITICAL: Your goal is absolute consistency. Analyze the relationship between the resume and the job description with mathematical rigor.
    
    COMPANY: ${input.companyName}
    ROLE: ${input.roleTitle}
    
    JOB DESCRIPTION:
    ${input.jobDescription}
    
    RESUME:
    ${input.resumeText}
    
    TASKS:
    1. Calculate a "Match Score" (Overall Fit) and an "ATS Compatibility Score".
    2. Provide a "Match Breakdown" (0-100) for Skills, Experience, Education, and Potential Fit.
    3. Provide "Match Evidence": For each breakdown category, provide 1 sentence of direct evidence from the resume that justifies the score.
    4. Provide an "ATS Breakdown" (0-100) for Keywords, Formatting, Readability, and Structure.
    5. List specific ATS warnings (e.g., "Multi-column layout detected", "Missing contact header").
    6. Identify matched skills and missing critical keywords.
    7. Generate 3-4 high-impact, tailored resume bullet points using the STAR format.
    8. Provide estimated market salary insights.
    9. Write a persuasive, metric-driven cover letter.
    10. Provide a referral strategy with a networking script.
    
    NOTE: Provide your answer ONLY in the requested JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0, // CRITICAL: Forces deterministic output
        seed: 42,      // CRITICAL: Fixed seed for consistency
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchScore: { type: Type.NUMBER },
            matchBreakdown: {
              type: Type.OBJECT,
              properties: {
                skillsMatch: { type: Type.NUMBER },
                experienceMatch: { type: Type.NUMBER },
                educationMatch: { type: Type.NUMBER },
                potentialFit: { type: Type.NUMBER }
              },
              required: ["skillsMatch", "experienceMatch", "educationMatch", "potentialFit"]
            },
            matchEvidence: {
              type: Type.OBJECT,
              properties: {
                skills: { type: Type.STRING },
                experience: { type: Type.STRING },
                education: { type: Type.STRING },
                potential: { type: Type.STRING }
              },
              required: ["skills", "experience", "education", "potential"]
            },
            atsScore: { type: Type.NUMBER },
            atsBreakdown: {
              type: Type.OBJECT,
              properties: {
                keywordMatch: { type: Type.NUMBER },
                formatting: { type: Type.NUMBER },
                readability: { type: Type.NUMBER },
                structure: { type: Type.NUMBER },
                warnings: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["keywordMatch", "formatting", "readability", "structure", "warnings"]
            },
            matchReasoning: { type: Type.STRING },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            tailoredBulletPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  improved: { type: Type.STRING },
                  starComponents: {
                    type: Type.OBJECT,
                    properties: {
                      situation: { type: Type.STRING },
                      task: { type: Type.STRING },
                      action: { type: Type.STRING },
                      result: { type: Type.STRING }
                    },
                    required: ["situation", "task", "action", "result"]
                  }
                },
                required: ["improved", "starComponents"]
              }
            },
            salaryInsights: {
              type: Type.OBJECT,
              properties: {
                range: { type: Type.STRING },
                marketContext: { type: Type.STRING }
              },
              required: ["range", "marketContext"]
            },
            coverLetter: { type: Type.STRING },
            referralStrategy: {
              type: Type.OBJECT,
              properties: {
                targetRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
                networkingScript: { type: Type.STRING },
                advice: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["targetRoles", "networkingScript", "advice"]
            }
          },
          required: [
            "matchScore", "matchBreakdown", "matchEvidence", "atsScore", 
            "atsBreakdown", "matchReasoning", "missingSkills", "matchedSkills", 
            "strengths", "weaknesses", "tailoredBulletPoints", "salaryInsights", 
            "coverLetter", "referralStrategy"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI.");
    return JSON.parse(text.trim()) as AnalysisResult;
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
};
