
export interface AnalysisResult {
  matchScore: number;
  matchBreakdown: {
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    potentialFit: number;
  };
  matchEvidence: {
    skills: string;
    experience: string;
    education: string;
    potential: string;
  };
  atsScore: number;
  atsBreakdown: {
    keywordMatch: number;
    formatting: number;
    readability: number;
    structure: number;
    warnings: string[];
  };
  matchReasoning: string;
  missingSkills: string[];
  matchedSkills: string[];
  strengths: string[];
  weaknesses: string[];
  tailoredBulletPoints: {
    original?: string;
    improved: string;
    starComponents: {
      situation: string;
      task: string;
      action: string;
      result: string;
    };
  }[];
  salaryInsights: {
    range: string;
    marketContext: string;
  };
  coverLetter: string;
  referralStrategy: {
    targetRoles: string[];
    networkingScript: string;
    advice: string[];
  };
}

export interface JobInput {
  resumeText: string;
  jobDescription: string;
  companyName: string;
  roleTitle: string;
}

export interface TrackedJob {
  id: string;
  companyName: string;
  roleTitle: string;
  status: 'Applied' | 'Interview' | 'Offer' | 'Rejected';
  date: string;
  matchScore: number;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
