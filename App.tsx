
import React, { useState, useRef, useCallback } from 'react';
import { AnalysisResult, AnalysisStatus, JobInput } from './types';
import { analyzeJobFit } from './services/geminiService';
import AnalysisView from './components/AnalysisView';
import JobTracker from './components/JobTracker';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import mammoth from 'mammoth';
import { GoogleGenAI } from "@google/genai";

// Fixed Worker Source: Use a more stable CDN for the worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const MAX_FILE_SIZE_MB = 5;

const App: React.FC = () => {
  const [view, setView] = useState<'input' | 'tracker'>('input');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [input, setInput] = useState<JobInput>({
    resumeText: '',
    jobDescription: '',
    companyName: '',
    roleTitle: ''
  });
  const [error, setError] = useState<{ message: string; detail?: string; fields?: string[] } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string>('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      setExtractionProgress('Initializing PDF engine...');
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const totalPages = pdf.numPages;
      const pagesToProcess = Math.min(totalPages, 10);
      
      setExtractionProgress(`Reading ${pagesToProcess} pages in parallel...`);
      
      const pagePromises = Array.from({ length: pagesToProcess }, (_, i) => 
        pdf.getPage(i + 1).then(async (page: any) => {
          const textContent = await page.getTextContent();
          return textContent.items.map((item: any) => item.str).join(' ');
        })
      );
      
      const pagesText = await Promise.all(pagePromises);
      const fullText = pagesText.join('\n');
      
      if (!fullText.trim()) throw new Error("PDF seems to be empty or image-only.");
      return fullText;
    } catch (e: any) {
      console.error("PDF Extraction Error:", e);
      throw new Error(`PDF Error: ${e.message}`);
    }
  };

  const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      setExtractionProgress('Processing DOCX file...');
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (!result.value.trim()) throw new Error("DOCX file is empty.");
      return result.value;
    } catch (e: any) {
      throw new Error(`DOCX Error: ${e.message}`);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError({ 
        message: "File too large", 
        detail: `Please upload a file smaller than ${MAX_FILE_SIZE_MB}MB.` 
      });
      return;
    }

    const validTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'text/plain'
    ];
    
    if (!validTypes.includes(file.type)) {
      setError({ 
        message: "Unsupported file format", 
        detail: "Please upload a PDF, DOCX, or TXT file." 
      });
      return;
    }

    setFileName(file.name);
    setIsExtracting(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(arrayBuffer);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractTextFromDocx(arrayBuffer);
      } else {
        text = new TextDecoder().decode(arrayBuffer);
      }
      
      setInput(prev => ({ ...prev, resumeText: text.trim() }));
    } catch (err: any) {
      setError({ 
        message: "Extraction failed", 
        detail: err.message || "We couldn't read the text. Try copying the text manually." 
      });
      setFileName(null);
    } finally {
      setIsExtracting(false);
      setExtractionProgress('');
    }
  };

  const autoFillFromJD = async () => {
    if (!input.jobDescription.trim()) {
      setError({ message: "Job Description Empty", detail: "Paste the job description first so I can extract details." });
      return;
    }

    setIsAutoFilling(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract the company name and role title from this job description. Return only valid JSON: {"companyName": "...", "roleTitle": "..."}\n\nJD: ${input.jobDescription}`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text || '{}');
      setInput(prev => ({
        ...prev,
        companyName: data.companyName || prev.companyName,
        roleTitle: data.roleTitle || prev.roleTitle
      }));
    } catch (err) {
      setError({ message: "Auto-fill failed", detail: "Could not detect details." });
    } finally {
      setIsAutoFilling(false);
    }
  };

  const loadSampleData = () => {
    setInput({
      companyName: 'TechNova Solutions',
      roleTitle: 'Senior Full Stack Engineer',
      resumeText: 'John Doe\nFull Stack Developer with 8 years of experience in React, Node.js, and Cloud Architecture. Led teams of 5 to deliver SaaS products used by millions. Expert in TypeScript and PostgreSQL.',
      jobDescription: 'We are looking for a Senior Full Stack Engineer to join TechNova. Requirements: 7+ years experience, expert React/Node knowledge, experience with cloud scalability and mentoring junior devs.'
    });
    setError(null);
    setFileName('sample_resume.pdf');
  };

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const missing = [];
    if (!input.companyName.trim()) missing.push("companyName");
    if (!input.roleTitle.trim()) missing.push("roleTitle");
    if (!input.resumeText.trim()) missing.push("resumeText");
    if (!input.jobDescription.trim()) missing.push("jobDescription");

    if (missing.length > 0) {
      setError({ 
        message: "Incomplete Form", 
        detail: "Some required fields are missing.",
        fields: missing
      });
      return;
    }

    setStatus(AnalysisStatus.LOADING);
    setError(null);
    try {
      const analysis = await analyzeJobFit(input);
      setResult(analysis);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      let errorMsg = "The AI was unable to complete the analysis.";
      let errorDetail = "This might be due to content filters or connection issues.";
      setError({ message: errorMsg, detail: errorDetail });
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const reset = () => {
    setStatus(AnalysisStatus.IDLE);
    setResult(null);
    setError(null);
    setView('input');
    setFileName(null);
    setInput({ resumeText: '', jobDescription: '', companyName: '', roleTitle: '' });
  };

  const isFieldMissing = (field: string) => error?.fields?.includes(field);

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/60 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-50/40 blur-[100px] rounded-full"></div>
      </div>

      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20 transition-transform group-hover:scale-105">H</div>
            <div className="flex flex-col -space-y-1">
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">HireMatch<span className="text-blue-600">AI</span></span>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Job Success Engine</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button onClick={() => setView('input')} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${view === 'input' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>Matching</button>
              <button onClick={() => setView('tracker')} className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${view === 'tracker' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>History</button>
            </div>
            <a 
              href="https://www.linkedin.com/in/abhishek-bhardwaj-892483318/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
            >
              Connect
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        {view === 'tracker' ? (
          <JobTracker />
        ) : (
          <>
            {(status === AnalysisStatus.IDLE || status === AnalysisStatus.LOADING || status === AnalysisStatus.ERROR) ? (
              <div className="flex flex-col lg:flex-row gap-20 items-start justify-center min-h-[70vh]">
                <div className="lg:w-1/2 space-y-10 text-center lg:text-left lg:sticky lg:top-32">
                  <div className="space-y-6">
                    <div className="inline-flex px-4 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-[0.2em] border border-blue-200 shadow-sm">AI Powered Recruitment</div>
                    <h1 className="text-6xl md:text-7xl font-extrabold text-slate-900 tracking-tighter leading-[1.05]">Land your <span className="text-blue-600">Dream Job</span> in minutes.</h1>
                    <p className="text-lg md:text-xl text-slate-700 font-medium leading-relaxed max-w-lg mx-auto lg:mx-0">Instantly score your profile against job requirements and generate perfectly tailored resume highlights.</p>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                    <button onClick={loadSampleData} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-200">
                      <span>✨ Try Sample Data</span>
                    </button>
                  </div>
                </div>

                <div className="lg:w-1/2 w-full max-w-2xl">
                  <form onSubmit={handleStartAnalysis} className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-200/20 border border-slate-100 p-8 md:p-12 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Company</label>
                        <input 
                          placeholder="e.g. OpenAI"
                          className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400 ${isFieldMissing('companyName') ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}
                          value={input.companyName}
                          onChange={(e) => setInput({...input, companyName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Target Role</label>
                        <input 
                          placeholder="e.g. Lead Engineer"
                          className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white focus:border-blue-600 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-400 ${isFieldMissing('roleTitle') ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}
                          value={input.roleTitle}
                          onChange={(e) => setInput({...input, roleTitle: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Resume</label>
                      <div 
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => fileInputRef.current?.click()}
                        className={`file-drop-zone p-8 border-2 border-dashed rounded-[1.5rem] transition-all cursor-pointer text-center group ${isDragging ? 'border-blue-600 bg-blue-50' : (isFieldMissing('resumeText') ? 'border-red-300 bg-red-50/30' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50')}`}
                      >
                        <input type="file" className="hidden" ref={fileInputRef} accept=".pdf,.docx,.txt" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isExtracting ? 'bg-blue-100' : 'bg-slate-200 group-hover:bg-blue-100'}`}>
                            {isExtracting ? (
                              <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                              <svg className="w-6 h-6 text-slate-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800">{fileName ? fileName : 'Upload Resume (PDF, DOCX)'}</p>
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                              {isExtracting ? extractionProgress : 'Drag & Drop or click to browse'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <textarea placeholder="Or paste resume text..." className={`w-full h-32 px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white outline-none transition-all resize-none font-medium text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 ${isFieldMissing('resumeText') ? 'border-red-300' : 'border-slate-200'}`} value={input.resumeText} onChange={(e) => setInput({...input, resumeText: e.target.value})} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Job Description</label>
                        <button type="button" onClick={autoFillFromJD} disabled={isAutoFilling} className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center gap-1.5 transition-colors disabled:opacity-50">
                          {isAutoFilling ? 'Extracting...' : '✨ Auto-fill Company/Role'}
                        </button>
                      </div>
                      <textarea placeholder="Paste the role requirements here..." className={`w-full h-36 px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white outline-none transition-all resize-none font-medium text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 ${isFieldMissing('jobDescription') ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`} value={input.jobDescription} onChange={(e) => setInput({...input, jobDescription: e.target.value})} />
                    </div>

                    {error && (
                      <div className="p-5 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-1 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3 text-red-800 font-bold text-sm">
                          <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-red-800 text-xs">!</span>
                          {error.message}
                        </div>
                        {error.detail && <p className="text-[11px] text-red-700 font-semibold ml-8">{error.detail}</p>}
                      </div>
                    )}

                    <button type="submit" disabled={status === AnalysisStatus.LOADING || isExtracting || isAutoFilling} className={`w-full py-5 rounded-2xl font-black text-white text-lg transition-all shadow-xl shadow-blue-600/20 relative overflow-hidden group ${(status === AnalysisStatus.LOADING || isExtracting || isAutoFilling) ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'}`}>
                      <div className="relative z-10 flex items-center justify-center gap-3">
                        {status === AnalysisStatus.LOADING ? (
                          <>
                            <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="uppercase text-xs tracking-widest">Running AI Matching...</span>
                          </>
                        ) : (
                          <>
                            <span>Generate Analysis</span>
                            <svg className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                          </>
                        )}
                      </div>
                    </button>
                    <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Instant analysis • Accurate matching</p>
                  </form>
                </div>
              </div>
            ) : (
              result && <AnalysisView result={result} companyName={input.companyName} roleTitle={input.roleTitle} onReset={reset} />
            )}
          </>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-200 py-24 bg-slate-50/30 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-20 right-10 w-64 h-64 bg-blue-100/30 blur-[100px] rounded-full"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16 relative z-10">
           <div className="col-span-1 md:col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-sm">H</div>
                <span className="text-xl font-black text-slate-900 uppercase tracking-widest">HireMatch AI</span>
              </div>
              <p className="text-slate-700 text-sm font-semibold leading-relaxed max-w-xs">Empowering job seekers with elite-level AI matching and resume optimization. 100% data secure.</p>
              
              <div className="pt-4">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Developed By</h5>
                <a 
                  href="https://www.linkedin.com/in/abhishek-bhardwaj-892483318/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-blue-300 hover:shadow-xl hover:translate-y-[-4px] transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Abhishek Bhardwaj</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Connect on LinkedIn</p>
                  </div>
                  <div className="ml-4 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </div>
                </a>
              </div>
           </div>

           <div className="space-y-8">
             <h5 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Product</h5>
             <ul className="space-y-4 text-xs font-bold text-slate-600">
                <li><button onClick={reset} className="hover:text-blue-600 transition-colors">Analyzer</button></li>
                <li><button onClick={() => setView('tracker')} className="hover:text-blue-600 transition-colors">History Tracker</button></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Success Logic</a></li>
             </ul>
           </div>

           <div className="space-y-8">
             <h5 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Connect</h5>
             <ul className="space-y-4 text-xs font-bold text-slate-600">
                <li><a href="https://www.linkedin.com/in/abhishek-bhardwaj-892483318/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors flex items-center gap-2">LinkedIn Profile</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms of Use</a></li>
             </ul>
           </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
           <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">© 2025 AI Matching Labs Inc. Built with ❤️ for Job Seekers.</p>
           <div className="flex gap-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Stable v3.4</span>
              <span>Cloud Engine v9.2</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
