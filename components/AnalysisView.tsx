
import React, { useState } from 'react';
import { AnalysisResult, TrackedJob } from '../types';
import MatchScore from './MatchScore';

interface AnalysisViewProps {
  result: AnalysisResult;
  companyName: string;
  roleTitle: string;
  onReset: () => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ result, companyName, roleTitle, onReset }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'resume' | 'cover' | 'referral'>('summary');
  const [isTracked, setIsTracked] = useState(false);

  const tabs = [
    { id: 'summary', label: 'Match Analysis' },
    { id: 'resume', label: 'Resume Lab' },
    { id: 'cover', label: 'Cover Letter' },
    { id: 'referral', label: 'Strategy' },
  ];

  const handleTrackJob = () => {
    const newJob: TrackedJob = {
      id: Date.now().toString(),
      companyName,
      roleTitle,
      status: 'Applied',
      date: new Date().toLocaleDateString(),
      matchScore: result.matchScore
    };
    const saved = JSON.parse(localStorage.getItem('hirematch_tracker') || '[]');
    localStorage.setItem('hirematch_tracker', JSON.stringify([newJob, ...saved]));
    setIsTracked(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'bg-blue-600';
    if (score >= 60) return 'bg-blue-400';
    return 'bg-amber-500';
  };

  const getScoreTextColorClass = (score: number) => {
    if (score >= 80) return 'text-blue-600';
    if (score >= 60) return 'text-blue-400';
    return 'text-amber-500';
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-100/30 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Dashboard Top bar */}
      <div className="px-10 md:px-14 py-14 bg-white border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-[0.2em] border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Deterministic Score Verified
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
            {roleTitle} <span className="text-blue-600 font-extrabold block mt-3 text-2xl md:text-3xl opacity-90">@ {companyName}</span>
          </h2>
          <div className="max-w-2xl bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner relative">
             <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg">“</div>
             <p className="text-slate-700 text-lg font-bold leading-relaxed italic">
              {result.matchReasoning}
            </p>
          </div>
        </div>
        
        <div className="flex gap-12 items-center shrink-0">
          <div className="hidden sm:block text-right pr-12 border-r border-slate-200">
             <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">ATS Score</span>
             <span className={`text-5xl font-black ${getScoreTextColorClass(result.atsScore)}`}>{result.atsScore}%</span>
          </div>
          <MatchScore score={result.matchScore} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/50 backdrop-blur-md sticky top-0 z-20 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 md:px-12 py-7 text-[12px] font-black uppercase tracking-[0.2em] transition-all border-b-4 flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center pr-6 gap-8">
          {!isTracked ? (
            <button onClick={handleTrackJob} className="text-[11px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest px-6 py-3 border-2 border-blue-100 rounded-2xl hover:bg-blue-50 transition-all shadow-sm">
              Track Application
            </button>
          ) : (
            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest px-6 py-3 bg-emerald-50 rounded-2xl border-2 border-emerald-100">Saved to Tracker</span>
          )}
          <button onClick={onReset} className="text-[11px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">Start Over</button>
        </div>
      </div>

      <div className="p-10 md:p-16 min-h-[600px] bg-white">
        {activeTab === 'summary' && (
          <div className="space-y-20 animate-in fade-in duration-700">
            {/* Detailed Logic Breakdown */}
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="space-y-3">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Strategic Fit Intelligence</h3>
                  <p className="text-slate-500 text-base font-bold uppercase tracking-widest flex items-center gap-3">
                    <span className="w-8 h-px bg-slate-300"></span>
                    Verified mapping of Resume Data to Requirements
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { label: 'Technical Skills', value: result.matchBreakdown.skillsMatch, evidence: result.matchEvidence.skills, icon: '🛠️' },
                  { label: 'Experience Level', value: result.matchBreakdown.experienceMatch, evidence: result.matchEvidence.experience, icon: '📈' },
                  { label: 'Academic Fit', value: result.matchBreakdown.educationMatch, evidence: result.matchEvidence.education, icon: '🎓' },
                  { label: 'Culture & Potential', value: result.matchBreakdown.potentialFit, evidence: result.matchEvidence.potential, icon: '🌱' }
                ].map((item, i) => (
                  <div key={i} className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all group flex flex-col gap-8">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">{item.icon}</div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{item.label}</h4>
                          <span className={`text-2xl font-black ${getScoreTextColorClass(item.value)}`}>{item.value}% Match</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-slate-200 shadow-inner">
                      <div className={`h-full transition-all duration-1000 ${getScoreColorClass(item.value)} shadow-[0_0_10px_rgba(37,99,235,0.3)]`} style={{ width: `${item.value}%` }}></div>
                    </div>

                    <div className="p-6 bg-white rounded-2xl border border-slate-100 text-sm font-bold text-slate-800 leading-relaxed relative shadow-sm">
                      <div className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-[0.2em] flex items-center gap-2">
                        <span className="w-4 h-px bg-blue-200"></span>
                        Direct Evidence
                      </div>
                      "{item.evidence}"
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ATS Audit Intelligence Section */}
            <div className="p-14 rounded-[4rem] bg-slate-950 text-white space-y-16 shadow-[0_30px_60px_rgba(15,23,42,0.3)] border border-slate-800">
               <div className="flex flex-col md:flex-row justify-between items-center gap-10 border-b border-slate-800 pb-12">
                  <div className="space-y-4 text-center md:text-left">
                    <h3 className="text-5xl font-black tracking-tighter text-white">ATS Audit Simulation</h3>
                    <p className="text-slate-400 text-lg font-bold">Standardized Enterprise HR Parser Analysis</p>
                  </div>
                  <div className="bg-slate-900 px-12 py-8 rounded-[2.5rem] text-center border border-slate-800 shadow-2xl group transition-all">
                    <span className={`text-7xl font-black ${getScoreTextColorClass(result.atsScore)} group-hover:scale-105 transition-transform block`}>{result.atsScore}%</span>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] block mt-2">Overall Compliance</span>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-16">
                  {[
                    { label: 'Keyword Density', score: result.atsBreakdown.keywordMatch, icon: '🔑' },
                    { label: 'Formatting Audit', score: result.atsBreakdown.formatting, icon: '📐' },
                    { label: 'Readability', score: result.atsBreakdown.readability, icon: '📄' },
                    { label: 'Logic Structure', score: result.atsBreakdown.structure, icon: '🏗️' }
                  ].map((item, i) => (
                    <div key={i} className="space-y-5">
                      <div className="flex justify-between items-center text-[12px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-3">
                          <span className="text-xl">{item.icon}</span>
                          {item.label}
                        </span>
                        <span className={getScoreTextColorClass(item.score)}>{item.score}%</span>
                      </div>
                      <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden p-1">
                        <div className={`h-full transition-all duration-1000 rounded-full ${getScoreColorClass(item.score)}`} style={{ width: `${item.score}%` }}></div>
                      </div>
                    </div>
                  ))}
               </div>

               {result.atsBreakdown.warnings.length > 0 && (
                 <div className="p-10 rounded-[2.5rem] bg-amber-900/10 border-2 border-amber-900/30 space-y-8">
                    <h4 className="text-[12px] font-black text-amber-500 uppercase tracking-[0.3em] flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 text-xl">⚠️</div>
                      Parser Critical Warnings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {result.atsBreakdown.warnings.map((w, i) => (
                        <div key={i} className="text-sm text-amber-100 font-bold p-6 bg-slate-900/50 rounded-2xl border border-amber-900/10 flex gap-5 items-start">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0 animate-pulse"></span>
                          {w}
                        </div>
                      ))}
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Other tabs remain enhanced but follow the core logic provided in previous steps */}
        {activeTab === 'resume' && (
           <div className="max-w-4xl mx-auto space-y-16 animate-in slide-in-from-bottom-8 duration-700">
             <div className="space-y-4 text-center">
               <h3 className="text-4xl font-black text-slate-900 tracking-tighter">AI-Tailored Optimization</h3>
               <p className="text-slate-500 font-bold text-xl">High-impact impact statements calibrated for this specific role.</p>
             </div>
             <div className="space-y-10">
               {result.tailoredBulletPoints.map((item, i) => (
                 <div key={i} className="group relative">
                   <div className="p-12 bg-white border-2 border-slate-100 rounded-[3rem] shadow-xl hover:border-blue-400 hover:shadow-blue-100/30 transition-all duration-500">
                     <div className="flex justify-between items-start gap-10 mb-10">
                         <div className="flex-1 text-slate-900 text-2xl font-black leading-[1.2] pr-12">
                           {item.improved}
                         </div>
                         <button onClick={() => copyToClipboard(item.improved)} className="p-4 text-slate-400 hover:text-blue-600 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-all border-2 border-transparent hover:border-blue-100 shrink-0 shadow-sm">
                           <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                         </button>
                     </div>
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-10 border-t-2 border-slate-50">
                       {Object.entries(item.starComponents).map(([key, val]) => (
                         <div key={key} className="space-y-2">
                           <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em] block">{key}</span>
                           <p className="text-sm text-slate-800 font-bold leading-tight">{val}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        )}

        {activeTab === 'cover' && (
           <div className="max-w-3xl mx-auto space-y-12 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Metric-Driven Letter</h3>
                  <p className="text-slate-500 font-bold text-lg">Persuasive narrative designed to clear screening thresholds.</p>
                </div>
                <button onClick={() => copyToClipboard(result.coverLetter)} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-2xl shadow-2xl shadow-blue-600/40 transition-all uppercase tracking-widest">Copy Content</button>
              </div>
              <div className="bg-slate-50 p-14 rounded-[3.5rem] border-2 border-slate-100 font-bold text-2xl text-slate-800 leading-[1.6] whitespace-pre-wrap shadow-inner selection:bg-blue-200">
                {result.coverLetter}
              </div>
           </div>
        )}

        {activeTab === 'referral' && (
          <div className="space-y-20 animate-in fade-in duration-700">
             <div className="grid lg:grid-cols-2 gap-20">
               <div className="space-y-12">
                 <div className="space-y-3">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Strategic Networking</h3>
                    <p className="text-slate-500 font-bold text-base">Elite tactics to bypass the standard applicant pool.</p>
                 </div>
                 <div className="space-y-6">
                   {result.referralStrategy.advice.map((item, i) => (
                     <div key={i} className="flex gap-8 p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
                       <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-lg shrink-0 border-2 border-blue-100 group-hover:scale-110 transition-transform">0{i+1}</div>
                       <p className="text-lg text-slate-800 font-bold leading-snug">{item}</p>
                     </div>
                   ))}
                 </div>
               </div>
               
               <div className="space-y-12">
                 <div className="space-y-3">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Ideal Connections</h3>
                    <p className="text-slate-500 font-bold text-base">Target these professional titles on LinkedIn.</p>
                 </div>
                 <div className="grid grid-cols-1 gap-5">
                   {result.referralStrategy.targetRoles.map((role, i) => (
                     <div key={i} className="p-7 rounded-[2rem] bg-slate-900 text-white font-black text-base flex items-center gap-6 border border-slate-800 shadow-2xl group hover:bg-slate-800 transition-colors">
                       <div className="w-4 h-4 bg-blue-500 rounded-full group-hover:scale-150 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                       {role}
                     </div>
                   ))}
                 </div>
               </div>
             </div>

             <div className="p-16 bg-slate-950 rounded-[4rem] border-4 border-slate-900 space-y-10 relative overflow-hidden group shadow-[0_40px_80px_rgba(0,0,0,0.4)]">
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl">💬</div>
                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">LinkedIn Outreach Template</span>
                  </div>
                  <button onClick={() => copyToClipboard(result.referralStrategy.networkingScript)} className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all">Copy Template</button>
                </div>
                <div className="p-10 bg-slate-900/60 rounded-[2.5rem] font-mono text-lg text-blue-100/90 leading-relaxed border border-blue-900/20 relative z-10 shadow-inner">
                  {result.referralStrategy.networkingScript}
                </div>
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisView;
