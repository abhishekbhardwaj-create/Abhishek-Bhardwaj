
import React, { useState, useEffect } from 'react';
import { TrackedJob } from '../types';

const JobTracker: React.FC = () => {
  const [jobs, setJobs] = useState<TrackedJob[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('hirematch_tracker');
    if (saved) setJobs(JSON.parse(saved));
  }, []);

  const updateStatus = (id: string, status: TrackedJob['status']) => {
    const updated = jobs.map(j => j.id === id ? { ...j, status } : j);
    setJobs(updated);
    localStorage.setItem('hirematch_tracker', JSON.stringify(updated));
  };

  const removeJob = (id: string) => {
    const updated = jobs.filter(j => j.id !== id);
    setJobs(updated);
    localStorage.setItem('hirematch_tracker', JSON.stringify(updated));
  };

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-blue-50/20">
        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-3xl mb-6 shadow-inner border border-blue-100">📂</div>
        <p className="text-slate-900 font-extrabold text-2xl tracking-tight">History is empty</p>
        <p className="text-slate-700 text-sm mt-2 max-w-xs text-center font-bold">Your analyzed jobs and strategy insights will appear here for easy access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <div className="space-y-2">
           <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Strategy History</h2>
           <p className="text-slate-700 font-bold">Track your application progress and return to saved strategies.</p>
        </div>
        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200 uppercase tracking-widest shadow-sm">{jobs.length} Active Records</span>
      </div>
      
      <div className="grid gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl hover:border-blue-200 transition-all group">
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-slate-900 leading-none group-hover:text-blue-600 transition-colors">{job.roleTitle}</h3>
              <p className="text-lg text-slate-700 font-bold">{job.companyName}</p>
              <div className="flex items-center gap-4 mt-4">
                <span className="text-[10px] font-bold px-3 py-1 bg-slate-100 rounded-lg text-slate-600 uppercase tracking-wider border border-slate-200">{job.date}</span>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                   <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{job.matchScore}% Intensity</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative">
                <select 
                  value={job.status}
                  onChange={(e) => updateStatus(job.id, e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-[11px] font-black rounded-xl pl-6 pr-12 py-3.5 outline-none focus:ring-2 focus:ring-blue-600/10 transition-all appearance-none cursor-pointer hover:bg-white"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%232563eb\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'3\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '0.8rem' }}
                >
                  <option>Applied</option>
                  <option>Interview</option>
                  <option>Offer</option>
                  <option>Rejected</option>
                </select>
              </div>
              <button 
                onClick={() => removeJob(job.id)}
                className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                title="Remove Record"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobTracker;
