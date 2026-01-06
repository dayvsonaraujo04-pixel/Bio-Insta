
import React, { useState, useMemo, useEffect } from 'react';
import { analyzeBio, generateHooks, generateReelsScripts } from './geminiService';
import { BioAuditResult, Hook, ReelScript } from './types';
import { translations } from './translations';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Removed readonly to match identical modifiers requirement across global declarations
    aistudio: AIStudio;
  }
}

type Theme = 'white' | 'black' | 'purple' | 'blue' | 'pink' | 'yellow' | 'gray';
type Lang = 'pt' | 'en';
type FontStyle = 'Inter' | 'Playfair Display' | 'Montserrat' | 'Roboto Mono' | 'Lora' | 'Oswald' | 'Merriweather' | 'Poppins' | 'Raleway' | 'Cinzel';

const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('pt');
  const [theme, setTheme] = useState<Theme>('black');
  const [font, setFont] = useState<FontStyle>('Inter');
  const [isNicheEnabled, setIsNicheEnabled] = useState(true);
  
  const [niche, setNiche] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<BioAuditResult | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [scripts, setScripts] = useState<ReelScript[]>([]);
  const [activeTab, setActiveTab] = useState<'audit' | 'hooks' | 'scripts'>('audit');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const t = useMemo(() => translations[lang], [lang]);

  const themeConfig = useMemo(() => {
    const configs: Record<Theme, { bg: string; card: string; text: string; accent: string; header: string; input: string }> = {
      white: { bg: 'bg-slate-50', card: 'bg-white', text: 'text-slate-900', accent: 'bg-indigo-600', header: 'bg-slate-900', input: 'bg-slate-50' },
      black: { bg: 'bg-tech-legal', card: 'bg-slate-900/80', text: 'text-slate-100', accent: 'bg-indigo-500', header: 'bg-black/40', input: 'bg-slate-800' },
      purple: { bg: 'bg-purple-950', card: 'bg-purple-900/40', text: 'text-purple-100', accent: 'bg-purple-600', header: 'bg-purple-900/60', input: 'bg-purple-800' },
      blue: { bg: 'bg-blue-950', card: 'bg-blue-900/40', text: 'text-blue-100', accent: 'bg-blue-600', header: 'bg-blue-900/60', input: 'bg-blue-800' },
      pink: { bg: 'bg-pink-950', card: 'bg-pink-900/40', text: 'text-pink-100', accent: 'bg-pink-600', header: 'bg-pink-900/60', input: 'bg-pink-800' },
      yellow: { bg: 'bg-yellow-950', card: 'bg-yellow-900/40', text: 'text-yellow-100', accent: 'bg-amber-600', header: 'bg-yellow-600/60', input: 'bg-yellow-800' },
      gray: { bg: 'bg-gray-900', card: 'bg-gray-800/40', text: 'text-gray-100', accent: 'bg-gray-700', header: 'bg-gray-950/60', input: 'bg-gray-700' },
    };
    return configs[theme];
  }, [theme]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
    }
  };

  const handleError = (error: any) => {
    console.error("Erro capturado:", error);
    const errorMsg = error?.message || String(error);
    
    // Se for erro de cota ou chave, oferece seleção de chave
    if (errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429") || errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("401") || errorMsg.includes("403")) {
      const confirmKey = confirm(lang === 'pt' 
        ? "Limite da API excedido ou chave inválida. Deseja selecionar sua própria chave de API para continuar sem limites?"
        : "API limit exceeded or invalid key. Would you like to select your own API key to continue without limits?"
      );
      if (confirmKey) handleSelectKey();
    } else {
      alert(t.errorGeneric + " (" + errorMsg.substring(0, 50) + "...)");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const showCopyMessage = (msg: string) => {
    setCopySuccess(msg);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showCopyMessage(t.copied);
  };

  const runAnalysis = async () => {
    if (isNicheEnabled && !niche) {
      alert(t.errorNiche);
      return;
    }
    if (!image && !instagramHandle) {
      alert(t.errorSource);
      return;
    }
    
    setLoading(true);
    try {
      const result = await analyzeBio(isNicheEnabled ? niche : null, image, instagramHandle, lang, true);
      setAuditResult(result);
      setActiveTab('audit');
      setHooks([]);
      setScripts([]);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreHooks = async () => {
    const finalNiche = niche || auditResult?.recomendacoesGerais[0]?.split(' ')[0] || 'Direito'; 
    setLoading(true);
    try {
      const result = await generateHooks(finalNiche, lang);
      setHooks(prev => [...prev, ...result]);
      setActiveTab('hooks');
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreScripts = async () => {
    const finalNiche = niche || auditResult?.recomendacoesGerais[0]?.split(' ')[0] || 'Direito';
    setLoading(true);
    try {
      const result = await generateReelsScripts(finalNiche, lang, 10);
      setScripts(prev => [...prev, ...result]);
      setActiveTab('scripts');
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const updateAuditField = (field: keyof BioAuditResult, newValue: string) => {
    if (!auditResult) return;
    const updated = { ...auditResult };
    if (field !== 'recomendacoesGerais') {
      (updated[field] as any).sugestao = newValue;
    }
    setAuditResult(updated);
  };

  const updateScriptField = (index: number, field: keyof ReelScript, newValue: string) => {
    const updated = [...scripts];
    (updated[index] as any)[field] = newValue;
    setScripts(updated);
  };

  const fonts: FontStyle[] = [
    'Inter', 'Playfair Display', 'Montserrat', 'Roboto Mono', 'Lora', 
    'Oswald', 'Merriweather', 'Poppins', 'Raleway', 'Cinzel'
  ];

  return (
    <div 
      className={`min-h-screen pb-20 transition-all duration-500 ${themeConfig.bg} ${themeConfig.text}`}
      style={{ fontFamily: font }}
    >
      {/* Toast Notification */}
      {copySuccess && (
        <div className="fixed top-4 right-4 z-[100] bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce font-bold">
          <i className="fa-solid fa-check mr-2"></i> {copySuccess}
        </div>
      )}

      {/* Settings Bar */}
      <div className={`${themeConfig.header} backdrop-blur-md text-white px-4 py-3 flex flex-wrap justify-between items-center text-xs font-bold border-b border-white/10 gap-4`}>
        <div className="flex items-center gap-6">
          <div className="flex bg-white/10 rounded-lg p-1">
            <button onClick={() => setLang('pt')} className={`px-2 py-1 rounded transition-colors ${lang === 'pt' ? 'bg-white text-slate-900' : 'hover:bg-white/10'}`}>PT</button>
            <button onClick={() => setLang('en')} className={`px-2 py-1 rounded transition-colors ${lang === 'en' ? 'bg-white text-slate-900' : 'hover:bg-white/10'}`}>EN</button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="opacity-60">{t.selectFont}:</span>
            <select 
              value={font} 
              onChange={(e) => setFont(e.target.value as FontStyle)}
              className="bg-white/10 border-none rounded px-2 py-1 outline-none text-white cursor-pointer hover:bg-white/20 transition-all"
            >
              {fonts.map(f => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
             <button 
              onClick={handleSelectKey}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-key text-[10px] text-amber-400"></i>
              <span>API Key</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(['white', 'black', 'purple', 'blue', 'pink', 'yellow', 'gray'] as Theme[]).map(th => (
            <button 
              key={th} 
              onClick={() => setTheme(th)}
              className={`w-6 h-6 rounded-full border-2 border-white/20 transition-transform hover:scale-110 ${
                th === 'white' ? 'bg-white' : 
                th === 'black' ? 'bg-slate-900' : 
                th === 'purple' ? 'bg-purple-600' : 
                th === 'blue' ? 'bg-blue-600' : 
                th === 'pink' ? 'bg-pink-500' : 
                th === 'yellow' ? 'bg-yellow-400' : 
                'bg-gray-500'
              } ${theme === th ? 'scale-125 border-white ring-2 ring-white/30' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className={`py-16 px-4 mb-12 relative overflow-hidden transition-all duration-700`}>
        <div className="max-w-4xl mx-auto text-center relative z-10 animate-fadeIn">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter drop-shadow-2xl flex items-center justify-center">
            <i className="fa-solid fa-scale-balanced mr-4 text-amber-400 animate-pulse"></i>
            {t.title}
          </h1>
          <p className="opacity-90 text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed">{t.subtitle}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 relative z-20">
        {/* Step 1: Input Section */}
        <section className={`${themeConfig.card} rounded-3xl shadow-2xl backdrop-blur-md border border-white/10 p-10 mb-16 transform -mt-16 transition-all duration-500 hover:shadow-indigo-500/10`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-[0.2em] block opacity-60">{t.nicheLabel}</label>
                <button 
                  onClick={() => setIsNicheEnabled(!isNicheEnabled)}
                  className={`w-8 h-4 rounded-full relative transition-colors ${isNicheEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                  title={t.nicheToggle}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isNicheEnabled ? 'left-4.5' : 'left-0.5'}`} />
                </button>
              </div>
              <input 
                type="text" 
                disabled={!isNicheEnabled}
                placeholder={t.nichePlaceholder} 
                className={`w-full px-5 py-4 rounded-2xl ${themeConfig.input} border border-white/5 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-lg ${!isNicheEnabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.2em] block opacity-60">{t.urlLabel}</label>
              <input 
                type="text" 
                placeholder={t.urlPlaceholder} 
                className={`w-full px-5 py-4 rounded-2xl ${themeConfig.input} border border-white/5 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-lg`}
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.2em] block opacity-60">{t.uploadLabel}</label>
              <div className="relative group h-[58px]">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                  className="hidden" 
                  id="file-upload" 
                />
                <label 
                  htmlFor="file-upload" 
                  className={`flex items-center justify-center h-full w-full px-5 py-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${image ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/20 hover:border-white/40 text-slate-400'}`}
                >
                  <i className={`fa-solid ${image ? 'fa-image' : 'fa-cloud-arrow-up'} mr-3 text-xl`}></i>
                  <span className="font-bold text-sm truncate">{image ? t.uploadSuccess : t.uploadPlaceholder}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center">
             <button 
              onClick={runAnalysis}
              disabled={loading}
              className={`group px-16 py-5 rounded-2xl font-black text-xl text-white shadow-2xl transition-all flex items-center justify-center min-w-[300px] ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 hover:scale-105 active:scale-95'}`}
            >
              {loading && activeTab === 'audit' ? (
                <i className="fa-solid fa-circle-notch fa-spin mr-3"></i>
              ) : (
                <i className="fa-solid fa-bolt-lightning mr-3 group-hover:scale-110 transition-transform text-amber-400"></i>
              )}
              {t.analyzeBtn}
            </button>
            <p className="mt-6 opacity-40 text-sm text-center font-medium">
               <i className="fa-solid fa-clock-rotate-left mr-2"></i>
               Análise em tempo real do estado atual do seu Instagram.
            </p>
          </div>
        </section>

        {/* Action Controls for generated content */}
        {auditResult && (
          <div className="flex flex-wrap justify-center gap-6 mb-12 animate-fadeIn">
            <button 
              onClick={loadMoreHooks}
              className="flex items-center px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-2xl font-black shadow-xl transition-all hover:-translate-y-1 active:scale-95"
            >
              <i className="fa-solid fa-fire-flame-curved mr-3"></i> {t.genHooks}
            </button>
            <button 
              onClick={loadMoreScripts}
              className="flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl transition-all hover:-translate-y-1 active:scale-95"
            >
              <i className="fa-solid fa-clapperboard mr-3"></i> {t.genScripts}
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {auditResult && (
          <div className="space-y-12">
            {/* Tabs Navigation */}
            <div className={`flex p-2 rounded-3xl ${theme === 'white' ? 'bg-slate-200' : 'bg-white/5 backdrop-blur-xl border border-white/10'}`}>
              <button 
                onClick={() => setActiveTab('audit')}
                className={`flex-1 py-5 px-6 rounded-2xl font-black text-sm transition-all ${activeTab === 'audit' ? `${themeConfig.card} shadow-xl border border-white/10` : 'opacity-40 hover:opacity-100'}`}
              >
                <i className="fa-solid fa-shield-halved mr-2 text-indigo-400"></i> {t.tabAudit}
              </button>
              <button 
                onClick={() => setActiveTab('hooks')}
                className={`flex-1 py-5 px-6 rounded-2xl font-black text-sm transition-all ${activeTab === 'hooks' ? `${themeConfig.card} shadow-xl border border-white/10 text-amber-500` : 'opacity-40 hover:opacity-100'}`}
              >
                <i className="fa-solid fa-magnet mr-2"></i> {t.tabHooks} ({hooks.length})
              </button>
              <button 
                onClick={() => setActiveTab('scripts')}
                className={`flex-1 py-5 px-6 rounded-2xl font-black text-sm transition-all ${activeTab === 'scripts' ? `${themeConfig.card} shadow-xl border border-white/10 text-indigo-400` : 'opacity-40 hover:opacity-100'}`}
              >
                <i className="fa-solid fa-video mr-2"></i> {t.tabScripts} ({scripts.length})
              </button>
            </div>

            {/* Tab Panels */}
            <div className="min-h-[600px]">
              {/* Tab: Audit */}
              {activeTab === 'audit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fadeIn">
                  <AuditCard 
                    title={lang === 'pt' ? "Nome Estratégico (SEO)" : "Strategic Name (SEO)"} 
                    status={auditResult.nome.status} 
                    analysis={auditResult.nome.analise} 
                    suggestion={auditResult.nome.sugestao} 
                    onCopy={() => copyToClipboard(auditResult.nome.sugestao)}
                    onEdit={(val) => updateAuditField('nome', val)}
                    theme={themeConfig}
                    t={t}
                  />
                  <AuditCard 
                    title={lang === 'pt' ? "Linha 1: Declaração de Valor" : "Line 1: Value Statement"} 
                    status={auditResult.primeiraLinha.status} 
                    analysis={auditResult.primeiraLinha.analise} 
                    suggestion={auditResult.primeiraLinha.sugestao} 
                    onCopy={() => copyToClipboard(auditResult.primeiraLinha.sugestao)}
                    onEdit={(val) => updateAuditField('primeiraLinha', val)}
                    theme={themeConfig}
                    t={t}
                  />
                  <AuditCard 
                    title={lang === 'pt' ? "Linha 2: Diferencial/Método" : "Line 2: Differential/Method"} 
                    status={auditResult.segundaLinha.status} 
                    analysis={auditResult.segundaLinha.analise} 
                    suggestion={auditResult.segundaLinha.sugestao} 
                    onCopy={() => copyToClipboard(auditResult.segundaLinha.sugestao)}
                    onEdit={(val) => updateAuditField('segundaLinha', val)}
                    theme={themeConfig}
                    t={t}
                  />
                  <AuditCard 
                    title={lang === 'pt' ? "Linha 3: Prova Social" : "Line 3: Social Proof"} 
                    status={auditResult.terceiraLinha.status} 
                    analysis={auditResult.terceiraLinha.analise} 
                    suggestion={auditResult.terceiraLinha.sugestao} 
                    onCopy={() => copyToClipboard(auditResult.terceiraLinha.sugestao)}
                    onEdit={(val) => updateAuditField('terceiraLinha', val)}
                    theme={themeConfig}
                    t={t}
                  />
                  <AuditCard 
                    title={lang === 'pt' ? "Linha 4: CTA Irresistível" : "Line 4: Irresistible CTA"} 
                    status={auditResult.quartaLinha.status} 
                    analysis={auditResult.quartaLinha.analise} 
                    suggestion={auditResult.quartaLinha.sugestao} 
                    onCopy={() => copyToClipboard(auditResult.quartaLinha.sugestao)}
                    onEdit={(val) => updateAuditField('quartaLinha', val)}
                    theme={themeConfig}
                    t={t}
                  />
                  
                  <div className={`md:col-span-2 bg-gradient-to-br from-indigo-900/80 to-slate-900/80 text-white rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden transition-all border border-indigo-500/20`}>
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <i className="fa-solid fa-scale-balanced text-[15rem]"></i>
                    </div>
                    <h3 className="text-3xl font-black mb-8 flex items-center">
                      <i className="fa-solid fa-wand-magic-sparkles text-amber-400 mr-4"></i>
                      {t.auditPlan}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {auditResult.recomendacoesGerais.map((rec, i) => (
                        <div key={i} className="flex items-start bg-white/5 p-6 rounded-3xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all group">
                          <i className="fa-solid fa-check-circle text-green-400 mt-1 mr-4 shrink-0 group-hover:scale-125 transition-transform"></i>
                          <span className="text-slate-200 text-base leading-relaxed font-medium">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Hooks */}
              {activeTab === 'hooks' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black">{t.hooksTitle}</h3>
                    <button 
                      onClick={() => copyToClipboard(hooks.map(h => h.text).join('\n'))}
                      className="text-indigo-400 hover:text-indigo-300 font-black text-sm bg-white/5 px-6 py-3 rounded-2xl transition-all border border-white/10"
                    >
                      <i className="fa-solid fa-copy mr-2"></i> {t.copyAll}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hooks.map((hook, i) => (
                      <div key={i} className={`${themeConfig.card} border border-white/10 rounded-3xl p-6 shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-2 transition-all relative group`}>
                        <button 
                          onClick={() => copyToClipboard(hook.text)}
                          className="absolute top-6 right-6 text-white/20 group-hover:text-indigo-400 transition-colors"
                        >
                          <i className="fa-solid fa-copy"></i>
                        </button>
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase mb-4 shadow-sm ${
                          hook.category === 'dor' ? 'bg-red-500/20 text-red-400' :
                          hook.category === 'desejo' ? 'bg-green-500/20 text-green-400' :
                          'bg-indigo-500/20 text-indigo-400'
                        }`}>
                          {(t.hookLabels as any)[hook.category] || hook.category}
                        </span>
                        <p className={`font-black text-lg leading-tight ${themeConfig.text}`}>"{hook.text}"</p>
                      </div>
                    ))}
                    {hooks.length === 0 && (
                      <div className="col-span-full py-32 text-center opacity-20">
                        <i className="fa-solid fa-magnet text-8xl mb-6"></i>
                        <p className="text-xl font-bold">{t.hooksPlaceholder}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Scripts */}
              {activeTab === 'scripts' && (
                <div className="space-y-8 animate-fadeIn">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-2xl font-black">{t.scriptsTitle}</h3>
                  </div>
                  {scripts.map((script, i) => (
                    <ScriptCard 
                      key={i} 
                      script={script} 
                      index={i + 1} 
                      onCopy={() => {
                        const text = `TÍTULO: ${script.titulo}\nHOOK: ${script.hook}\nCONTEÚDO: ${script.conteudoPrincipal}\nCTA: ${script.cta}`;
                        copyToClipboard(text);
                      }} 
                      onEdit={(field, val) => updateScriptField(i, field, val)}
                      theme={themeConfig} 
                      t={t} 
                    />
                  ))}
                  {scripts.length === 0 && (
                    <div className="py-32 text-center opacity-20">
                      <i className="fa-solid fa-clapperboard text-8xl mb-6"></i>
                      <p className="text-xl font-bold">{t.scriptsPlaceholder}</p>
                    </div>
                  )}
                  {scripts.length > 0 && (
                    <button 
                      onClick={loadMoreScripts}
                      className={`w-full py-6 border-2 border-dashed border-white/10 opacity-40 hover:opacity-100 rounded-[2rem] font-black transition-all hover:bg-white/5`}
                    >
                      <i className="fa-solid fa-plus-circle mr-3"></i> {t.scriptsLoadMore}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center z-[200]">
          <div className={`${themeConfig.card} p-12 rounded-[3rem] shadow-2xl text-center max-w-sm w-full animate-fadeIn border border-white/10`}>
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <i className="fa-solid fa-scale-balanced fa-beat text-5xl text-indigo-400"></i>
              </div>
              <div className="absolute inset-0 w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
            </div>
            <h2 className="text-3xl font-black mb-4 text-white">{t.processing}</h2>
            <p className="opacity-60 font-medium text-lg leading-relaxed text-indigo-100">
              {activeTab === 'audit' ? t.processingAudit : t.processingContent}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface AuditCardProps {
  title: string;
  status: string;
  analysis: string;
  suggestion: string;
  onCopy: () => void;
  onEdit: (val: string) => void;
  theme: any;
  t: any;
}

const AuditCard: React.FC<AuditCardProps> = ({ title, status, analysis, suggestion, onCopy, onEdit, theme, t }) => {
  const isPositive = status.toLowerCase().includes('bom') || status.toLowerCase().includes('ok') || status.toLowerCase().includes('ótimo') || status.toLowerCase().includes('good') || status.toLowerCase().includes('great');
  
  return (
    <div className={`${theme.card} rounded-[2.5rem] p-10 border border-white/10 shadow-xl hover:shadow-indigo-500/10 transition-all group overflow-hidden relative`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      <div className="flex justify-between items-start mb-8 relative z-10">
        <h4 className={`font-black ${theme.text} text-2xl tracking-tight leading-none`}>{title}</h4>
        <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${
          isPositive ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
        }`}>
          {status}
        </span>
      </div>
      <div className="space-y-8 relative z-10">
        <div>
          <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] block mb-3">{t.diagnosis}</span>
          <p className={`${theme.text} opacity-80 text-lg leading-relaxed font-medium`}>{analysis}</p>
        </div>
        <div className={`bg-white/5 rounded-3xl p-8 border border-white/10 relative transition-all group-hover:bg-white/10`}>
          <button 
            onClick={onCopy}
            className="absolute top-6 right-6 text-white/20 hover:text-indigo-400 transition-all z-20"
          >
            <i className="fa-solid fa-copy text-xl"></i>
          </button>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-4">
            <i className="fa-solid fa-wand-magic-sparkles mr-3"></i>
            {t.suggestion}
          </span>
          <textarea 
            className={`w-full bg-transparent font-black italic text-xl leading-snug outline-none border-none resize-none ${theme.text}`}
            value={suggestion}
            onChange={(e) => onEdit(e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
};

interface ScriptCardProps {
  script: ReelScript;
  index: number;
  onCopy: () => void;
  onEdit: (field: keyof ReelScript, val: string) => void;
  theme: any;
  t: any;
}

const ScriptCard: React.FC<ScriptCardProps> = ({ script, index, onCopy, onEdit, theme, t }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${theme.card} border border-white/10 rounded-[2.5rem] shadow-xl overflow-hidden transition-all group`}>
      <div 
        className={`p-8 cursor-pointer flex justify-between items-center hover:bg-white/5 transition-all ${expanded ? 'bg-white/5' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <div className={`bg-gradient-to-br from-indigo-600 to-indigo-800 text-white w-14 h-14 rounded-3xl flex items-center justify-center font-black mr-6 shadow-2xl group-hover:rotate-12 transition-all`}>
            {index}
          </div>
          <div>
            <h4 className={`font-black ${theme.text} text-xl leading-tight`}>{script.titulo}</h4>
            <p className="opacity-40 text-[10px] font-black uppercase tracking-[0.2em] mt-2">{script.visaoGeral}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
           <button 
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            className="opacity-20 hover:opacity-100 hover:text-indigo-400 transition-all scale-125"
          >
            <i className="fa-solid fa-copy"></i>
          </button>
          <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} opacity-20 text-xl`}></i>
        </div>
      </div>
      
      {expanded && (
        <div className={`p-10 border-t border-white/5 animate-fadeIn space-y-10`}>
          <div className="grid grid-cols-1 gap-10">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="bg-red-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">{t.scriptLabels.hook}</span>
                <span className="opacity-40 text-[10px] font-black uppercase tracking-widest">{t.scriptLabels.time}</span>
              </div>
              <textarea 
                className={`${theme.text} w-full bg-transparent font-black text-3xl leading-tight border-l-8 border-red-500 pl-6 drop-shadow-sm outline-none resize-none`}
                value={script.hook}
                onChange={(e) => onEdit('hook', e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="bg-slate-700 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">{t.scriptLabels.dev}</span>
              </div>
              <textarea 
                className={`${theme.text} opacity-90 leading-relaxed text-xl bg-white/5 p-8 rounded-[2rem] border border-white/5 font-medium italic w-full outline-none resize-none`}
                value={script.conteudoPrincipal}
                onChange={(e) => onEdit('conteudoPrincipal', e.target.value)}
                rows={5}
              />
            </div>

            <div className="bg-gradient-to-r from-indigo-600 to-indigo-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden transform rotate-1">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <i className="fa-solid fa-megaphone text-7xl"></i>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <i className="fa-solid fa-comment-dots text-amber-400"></i>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">{t.scriptLabels.cta}</span>
              </div>
              <textarea 
                className="w-full bg-transparent text-3xl font-black italic outline-none border-none resize-none text-white"
                value={script.cta}
                onChange={(e) => onEdit('cta', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
