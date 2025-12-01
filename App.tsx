import React from 'react';
import Editor from './components/Editor';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-banana-400 rounded-lg flex items-center justify-center transform -rotate-6 shadow-sm">
               <span className="text-slate-900 font-bold text-lg">N</span>
            </div>
            <span className="font-bold text-slate-800 text-xl tracking-tight">NanoBanana</span>
          </div>
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            v2.5 Flash Image
          </div>
        </div>
      </header>

      <main className="flex-grow py-8">
        <Editor />
      </main>

      <footer className="w-full bg-white border-t border-slate-200 py-6 mt-auto">
         <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
            <p>&copy; {new Date().getFullYear()} Nano Banana Inc. Powered by Google Gemini.</p>
         </div>
      </footer>
    </div>
  );
};

export default App;