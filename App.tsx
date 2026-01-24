import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { generateShopifyHtml } from './services/geminiService';
import { AppState } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    image: null,
    description1: '',
    description2: '',
    bggInfo: '',
    isGenerating: false,
    result: null,
    error: null,
  });

  const [copyStates, setCopyStates] = useState({ b1: false, b2: false, b3: false, seo: false });

  const handleGenerate = async () => {
    if (!state.image) {
      setState(prev => ({ ...prev, error: "Carica l'immagine della scatola." }));
      return;
    }
    
    setState(prev => ({ ...prev, isGenerating: true, error: null, result: null }));

    try {
      const result = await generateShopifyHtml(
        state.image, 
        state.description1, 
        state.description2, 
        state.bggInfo
      );
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        result
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isGenerating: false, error: err.message }));
    }
  };

  const copy = (text: string, key: 'b1' | 'b2' | 'b3' | 'seo') => {
    navigator.clipboard.writeText(text);
    setCopyStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopyStates(prev => ({ ...prev, [key]: false })), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">
      <header className="mb-8 md:mb-12 text-center">
        <div className="inline-block p-3 md:p-4 bg-indigo-500/10 rounded-full mb-4 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
          <span className="text-4xl md:text-5xl">🐸</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white mb-2 italic tracking-tighter uppercase leading-none">
          FroGames <span className="text-indigo-400">Forge</span>
        </h1>
        <p className="text-slate-400 font-bold text-[10px] md:text-xs italic uppercase tracking-[0.2em] md:tracking-[0.3em]">SEO Boardgame Engine • Shopify Layouts</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        {/* INPUT PANEL */}
        <div className="lg:col-span-5 order-2 lg:order-1">
          <section className="bg-slate-800/40 border border-slate-700/60 p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-2xl lg:sticky lg:top-8">
            <h2 className="text-[10px] font-black uppercase text-indigo-400 mb-6 md:mb-8 tracking-widest flex items-center gap-3">
              <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-pulse"></span> Configurazione
            </h2>
            <div className="space-y-6 md:space-y-8">
              <ImageUploader 
                image={state.image} 
                onImageUpload={(img) => setState(prev => ({ ...prev, image: img }))} 
              />
              
              <div className="p-4 md:p-6 bg-black/30 border border-white/5 rounded-[24px]">
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-4 block">Dati Meccanici / Link BGG</label>
                <input 
                  type="text"
                  value={state.bggInfo}
                  onChange={(e) => setState(prev => ({ ...prev, bggInfo: e.target.value }))}
                  placeholder="Nome gioco o link BoardGameGeek..."
                  className="w-full bg-black/40 border border-slate-700/50 rounded-xl p-4 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                />
              </div>

              {state.error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-[11px] font-bold text-center">{state.error}</p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={state.isGenerating}
                className="w-full py-4 md:py-5 bg-white hover:bg-indigo-50 text-black rounded-[20px] md:rounded-[24px] font-black text-base md:text-lg shadow-xl active:scale-95 transition-all disabled:opacity-20 uppercase tracking-widest"
              >
                {state.isGenerating ? 'GENERANDO...' : 'FORGIA ORA'}
              </button>
            </div>
          </section>
        </div>

        {/* OUTPUT PANEL */}
        <div className="lg:col-span-7 order-1 lg:order-2 space-y-6 md:space-y-10">
          {state.result ? (
            <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-500 overflow-x-hidden">
              
              {/* SEO PREVIEW */}
              <div className="bg-white/5 border border-white/10 rounded-[24px] md:rounded-[32px] p-5 md:p-6">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">SEO & Meta Tag</h3>
                  <button onClick={() => copy(`${state.result!.seoTitle}\n\n${state.result!.metaDescription}`, 'seo')} className="text-[10px] font-black uppercase text-indigo-300 hover:text-white transition-colors">
                    {copyStates.seo ? 'Copiato!' : 'Copia SEO'}
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <p className="text-white text-xs font-bold truncate">{state.result.seoTitle}</p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{state.result.metaDescription}</p>
                  </div>
                </div>
              </div>

              {/* HTML BLOCKS */}
              {[
                { title: '1. Atmosfera', data: state.result.html1, key: 'b1' as const },
                { title: '2. Meccaniche', data: state.result.html2, key: 'b2' as const }
              ].map((block) => (
                <div key={block.key} className="bg-slate-800/20 border border-slate-700/40 rounded-[24px] md:rounded-[32px] overflow-hidden">
                  <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{block.title}</h3>
                    <button onClick={() => copy(block.data, block.key)} className="text-[10px] font-black uppercase text-indigo-300 hover:text-white">
                      {copyStates[block.key] ? 'Copiato!' : 'Copia HTML'}
                    </button>
                  </div>
                  <div className="max-h-[600px] md:max-h-[800px] overflow-y-auto p-4 md:p-10 bg-[#0a0a0a] flex flex-col items-center">
                     <div className="shopify-preview-container w-full flex flex-col items-center justify-center text-center" dangerouslySetInnerHTML={{ __html: block.data }} />
                  </div>
                </div>
              ))}

              {/* MANUAL BLOCK */}
              <div className="bg-slate-800/20 border border-slate-700/40 rounded-[24px] md:rounded-[32px] p-5 md:p-6">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">3. Come si Gioca (Testo)</h3>
                  <button onClick={() => copy(state.result.html3, 'b3')} className="text-[10px] font-black uppercase text-indigo-300 hover:text-white">
                    {copyStates.b3 ? 'Copiato!' : 'Copia Testo'}
                  </button>
                </div>
                <div className="bg-black/30 p-4 md:p-6 rounded-2xl border border-white/5">
                  <pre className="text-slate-300 text-[12px] md:text-[13px] leading-relaxed whitespace-pre-wrap font-sans font-medium text-left">
                    {state.result.html3.replace(/\*\*/g, '')}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] md:min-h-[600px] flex flex-col items-center justify-center bg-slate-800/10 border-2 border-dashed border-slate-800/40 rounded-[32px] md:rounded-[48px] opacity-40">
              <span className="text-5xl md:text-7xl mb-6 md:mb-8">🛠️</span>
              <p className="text-lg md:text-xl font-black italic tracking-tight text-indigo-300 uppercase">In attesa della forgia...</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .shopify-preview-container {
          max-width: 100%;
          overflow-x: hidden;
          word-wrap: break-word;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .shopify-preview-container * {
          max-width: 100% !important;
          box-sizing: border-box;
          word-break: normal;
          hyphens: none;
        }
        .shopify-preview-container h1, 
        .shopify-preview-container h2, 
        .shopify-preview-container h3 {
          width: 100%;
          text-align: center;
          word-break: keep-all;
          overflow-wrap: break-word;
          white-space: normal;
        }
        .shopify-preview-container img {
          height: auto;
          display: block;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
};

export default App;
