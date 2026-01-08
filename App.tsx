
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { analyzeBio, generateHooks, generateReelsScripts, generateAuthorityPosts } from './geminiService';
import { BioAuditResult, Hook, ReelScript, AuthorityPost } from './types';
import { translations } from './translations';

type Theme = 'white' | 'black' | 'purple' | 'blue' | 'pink' | 'yellow' | 'gray';
type Lang = 'pt' | 'en';
type FontStyle = 'Inter' | 'Playfair Display' | 'Montserrat' | 'Poppins' | 'Raleway';

interface LoadingState {
  active: boolean;
  type: 'audit' | 'hooks' | 'scripts' | 'authority' | 'none';
  messageIndex: number;
}

interface Metrics {
  audits: number;
  hooks: number;
  scripts: number;
  authority: number;
}

const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('pt');
  const [theme, setTheme] = useState<Theme>('black');
  const [font, setFont] = useState<FontStyle>('Inter');
  
  const [bgImage, setBgImage] = useState<string>('https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=2070&auto=format&fit=crop');
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [isNicheEnabled, setIsNicheEnabled] = useState(true);
  const [niche, setNiche] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ active: false, type: 'none', messageIndex: 0 });
  const [auditResult, setAuditResult] = useState<BioAuditResult | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [scripts, setScripts] = useState<ReelScript[]>([]);
  const [authorityPosts, setAuthorityPosts] = useState<AuthorityPost[]>([]);
  const [activeTab, setActiveTab] = useState<'audit' | 'hooks' | 'scripts' | 'authority'>('audit');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<Metrics>(() => {
    const saved = localStorage.getItem('legal-bio-metrics-v2');
    return saved ? JSON.parse(saved) : { audits: 0, hooks: 0, scripts: 0, authority: 0 };
  });

  const t = useMemo(() => translations[lang], [lang]);

  useEffect(() => {
    localStorage.setItem('legal-bio-metrics-v2', JSON.stringify(metrics));
    const savedBg = localStorage.getItem('legal-bio-custom-bg');
    if (savedBg && savedBg.startsWith('data:image')) {
      setBgImage(savedBg);
    }
  }, [metrics]);

  const incrementMetric = (key: keyof Metrics, amount: number = 1) => {
    setMetrics(prev => ({ ...prev, [key]: prev[key] + amount }));
  };

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); 

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio Context bloqueado ou indisponível.");
    }
  };

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setBgImage(result);
        try {
          localStorage.setItem('legal-bio-custom-bg', result);
        } catch (err) {
          console.warn("Falha ao salvar no localStorage (imagem muito grande), mas funcionará nesta sessão.");
        }
      }
    };
    reader.onerror = () => alert("Erro ao ler o arquivo de imagem.");
    reader.readAsDataURL(file);
    
    if (bgInputRef.current) bgInputRef.current.value = "";
  };

  useEffect(() => {
    let interval: any;
    if (loading.active) {
      interval = setInterval(() => {
        setLoading(prev => ({
          ...prev,
          messageIndex: (prev.messageIndex + 1) % 4
        }));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading.active]);

  const currentLoadingMessage = useMemo(() => {
    if (loading.type === 'none') return t.processing;
    const steps = t.processingSteps[loading.type] as string[];
    return steps[loading.messageIndex] || t.processing;
  }, [loading.type, loading.messageIndex, t]);

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

  const handleOpenKey = async () => {
    if ((window as any).aistudio) await (window as any).aistudio.openSelectKey();
  };

  const handleError = async (error: any) => {
    console.error("Erro na chamada da API:", error);
    const msg = (error?.message || String(error)).toLowerCase();
    
    if (msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted")) {
      if (window.confirm(t.errorQuota)) {
        await handleOpenKey();
      }
    } else {
      alert(t.errorGeneric + "\n\n" + (error?.message || String(error)).substring(0, 150));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopySuccess(t.copied);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const scrollToResults = () => {
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const runAnalysis = async () => {
    if (isNicheEnabled && !niche) return alert(t.errorNiche);
    if (!image && !instagramHandle) return alert(t.errorSource);
    setLoading({ active: true, type: 'audit', messageIndex: 0 });
    try {
      const result = await analyzeBio(isNicheEnabled ? niche : null, image, instagramHandle, lang);
      setAuditResult(result);
      setHooks([]); setScripts([]); setAuthorityPosts([]);
      setActiveTab('audit');
      incrementMetric('audits');
      playSuccessSound(); 
      scrollToResults();
    } catch (error: any) {
      handleError(error);
    } finally {
      setLoading({ active: false, type: 'none', messageIndex: 0 });
    }
  };

  const handleTabSwitch = async (tab: 'audit' | 'hooks' | 'scripts' | 'authority') => {
    setActiveTab(tab);
    const targetNiche = niche || 'Direito';
    
    if (tab === 'hooks' && hooks.length === 0) {
      setLoading({ active: true, type: 'hooks', messageIndex: 0 });
      try {
        const h = await generateHooks(targetNiche, auditResult, lang);
        setHooks(h);
        incrementMetric('hooks', h.length);
        playSuccessSound();
      } catch (error) {
        handleError(error);
      }
      finally { setLoading({ active: false, type: 'none', messageIndex: 0 }); }
    } else if (tab === 'scripts' && scripts.length === 0) {
      setLoading({ active: true, type: 'scripts', messageIndex: 0 });
      try {
        const s = await generateReelsScripts(targetNiche, auditResult, lang);
        setScripts(s);
        incrementMetric('scripts', s.length);
        playSuccessSound();
      } catch (error) {
        handleError(error);
      }
      finally { setLoading({ active: false, type: 'none', messageIndex: 0 }); }
    } else if (tab === 'authority' && authorityPosts.length === 0) {
      setLoading({ active: true, type: 'authority', messageIndex: 0 });
      try {
        const a = await generateAuthorityPosts(targetNiche, auditResult, lang);
        setAuthorityPosts(a);
        incrementMetric('authority', a.length);
        playSuccessSound();
      } catch (error) {
        handleError(error);
      }
      finally { setLoading({ active: false, type: 'none', messageIndex: 0 }); }
    }
    scrollToResults();
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${themeConfig.bg} ${themeConfig.text}`} style={{ fontFamily: font }}>
      
      <div className="custom-app-bg" style={{ backgroundImage: `url(${bgImage})` }}></div>

      <div className="app-content-wrapper min-h-screen pb-20">
        {copySuccess && (
          <div className="fixed top-4 right-4 z-[100] bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce font-bold">
            <i className="fa-solid fa-check mr-2"></i> {copySuccess}
          </div>
        )}

        <div className={`${themeConfig.header} backdrop-blur-md text-white px-4 py-3 flex flex-wrap justify-between items-center text-xs font-bold border-b border-white/10 gap-4 shadow-xl relative z-50`}>
          <div className="flex items-center gap-6">
            <div className="flex bg-white/10 rounded-lg p-1">
              <button onClick={() => setLang('pt')} className={`px-2 py-1 rounded ${lang === 'pt' ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/5'}`}>PT</button>
              <button onClick={() => setLang('en')} className={`px-2 py-1 rounded ${lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'hover:bg-white/5'}`}>EN</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="opacity-40">{t.selectFont}:</span>
              <select value={font} onChange={(e) => setFont(e.target.value as FontStyle)} className="bg-transparent border-none outline-none cursor-pointer font-bold">
                {['Inter', 'Playfair Display', 'Montserrat', 'Poppins', 'Raleway'].map(f => <option key={f} value={f} className="text-slate-900">{f}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <input type="file" ref={bgInputRef} onChange={handleBgChange} className="hidden" accept="image/*" />
            <button onClick={() => bgInputRef.current?.click()} className="group flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/30 rounded-xl border border-indigo-500/20 transition-all">
              <i className="fa-solid fa-image text-indigo-400 group-hover:scale-110"></i>
              <span className="uppercase tracking-wider">Mudar Fundo</span>
            </button>
            <button onClick={handleOpenKey} className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/20 transition-all">
              <i className="fa-solid fa-key text-amber-400"></i>
              <span className="uppercase tracking-wider">API Key</span>
            </button>
            <div className="flex items-center gap-1.5 ml-2">
              {(['white', 'black', 'purple', 'blue', 'pink', 'yellow', 'gray'] as Theme[]).map(th => (
                <button key={th} onClick={() => setTheme(th)} className={`w-5 h-5 rounded-full border-2 border-white/20 ${theme === th ? 'scale-125 border-white ring-2 ring-white/30 shadow-lg' : 'hover:scale-110'} bg-${th === 'black' ? 'slate-900' : th === 'white' ? 'white' : th + '-600'}`} />
              ))}
            </div>
          </div>
        </div>

        <header className="py-24 px-4 text-center">
          <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter drop-shadow-2xl">
            <i className="fa-solid fa-scale-balanced mr-4 text-amber-400 scale-animate"></i> {t.title}
          </h1>
          <p className="opacity-80 text-xl font-light max-w-2xl mx-auto leading-relaxed">{t.subtitle}</p>

          <div className="max-w-5xl mx-auto mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
            {[
              { key: 'audits', tab: 'audit', color: 'text-indigo-400', label: t.statsAudits, icon: 'fa-magnifying-glass' },
              { key: 'hooks', tab: 'hooks', color: 'text-amber-400', label: t.statsHooks, icon: 'fa-wand-magic-sparkles' },
              { key: 'authority', tab: 'authority', color: 'text-purple-400', label: t.statsAuthority, icon: 'fa-shield-halved' },
              { key: 'scripts', tab: 'scripts', color: 'text-emerald-400', label: t.statsScripts, icon: 'fa-clapperboard' }
            ].map(m => (
              <button 
                key={m.key}
                disabled={metrics[m.key as keyof Metrics] === 0}
                onClick={() => handleTabSwitch(m.tab as any)}
                className={`${themeConfig.card} p-5 rounded-3xl border border-white/5 backdrop-blur-md card-hover text-center group transition-all ${metrics[m.key as keyof Metrics] === 0 ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <i className={`fa-solid ${m.icon} ${m.color} text-xs mb-2 opacity-50 group-hover:scale-110 transition-transform`}></i>
                <span className="text-[10px] font-black uppercase opacity-50 block mb-1 tracking-widest">{m.label}</span>
                <span className={`text-3xl font-black ${m.color} tabular-nums block drop-shadow-sm`}>{metrics[m.key as keyof Metrics]}</span>
              </button>
            ))}
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4">
          <section className={`${themeConfig.card} rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl border border-white/10 p-12 mb-20 transform -mt-10 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <i className="fa-solid fa-scale-balanced text-9xl"></i>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{t.nicheLabel}</label>
                  <button onClick={() => setIsNicheEnabled(!isNicheEnabled)} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none ${isNicheEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isNicheEnabled ? 'translate-x-6 shadow-md' : 'translate-x-1'}`} />
                  </button>
                </div>
                <input type="text" disabled={!isNicheEnabled} placeholder={t.nichePlaceholder} className={`w-full px-6 py-5 rounded-2xl ${themeConfig.input} border border-white/10 outline-none text-lg transition-all focus:ring-2 focus:ring-indigo-500/50 ${!isNicheEnabled ? 'opacity-20 cursor-not-allowed grayscale' : 'opacity-100'}`} value={niche} onChange={(e) => setNiche(e.target.value)} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{t.urlLabel}</label>
                <input type="text" placeholder={t.urlPlaceholder} className={`w-full px-6 py-5 rounded-2xl ${themeConfig.input} border border-white/10 outline-none text-lg focus:ring-2 focus:ring-indigo-500/50`} value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{t.uploadLabel}</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className={`flex items-center justify-center h-[68px] w-full px-6 py-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${image ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-white/5 border-white/10 hover:border-white/30'}`}>
                  <i className={`fa-solid ${image ? 'fa-circle-check text-green-400' : 'fa-camera-retro'} mr-3 text-xl`}></i>
                  <span className="font-bold text-sm truncate uppercase tracking-wider">{image ? t.uploadSuccess : t.uploadPlaceholder}</span>
                </label>
              </div>
            </div>
            <div className="mt-14 text-center">
              <button onClick={runAnalysis} disabled={loading.active} className="group relative px-24 py-7 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl font-black text-2xl shadow-[0_15px_40px_-10px_rgba(99,102,241,0.5)] hover:scale-[1.03] active:scale-95 transition-all duration-300 overflow-hidden">
                 <span className="relative z-10 flex items-center justify-center">
                    {loading.active && loading.type === 'audit' ? <i className="fa-solid fa-circle-notch fa-spin mr-3"></i> : <i className="fa-solid fa-bolt-lightning mr-3 text-amber-300 animate-pulse"></i>}
                    {t.analyzeBtn}
                 </span>
                 <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              </button>
            </div>
          </section>

          {auditResult && (
            <div id="results-section" className="space-y-12 animate-fadeIn pt-10">
              <div className={`relative flex p-2.5 rounded-[2rem] flex-wrap overflow-hidden transition-all duration-500 shadow-2xl ${theme === 'white' ? 'bg-slate-200' : 'bg-white/5 backdrop-blur-3xl border border-white/10'}`}>
                {[
                  { id: 'audit', label: t.tabAudit, color: 'hover:text-white', activeColor: 'text-white bg-white/10' },
                  { id: 'hooks', label: t.tabHooks, color: 'hover:text-amber-400', activeColor: 'text-amber-400 bg-amber-400/10' },
                  { id: 'authority', label: t.tabAuthority, color: 'hover:text-purple-400', activeColor: 'text-purple-400 bg-purple-400/10' },
                  { id: 'scripts', label: t.tabScripts, color: 'hover:text-emerald-400', activeColor: 'text-emerald-400 bg-emerald-400/10' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => handleTabSwitch(tab.id as any)} 
                    className={`relative z-10 flex-1 min-w-[140px] py-5 px-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 transform ${activeTab === tab.id ? `${tab.activeColor} scale-100 shadow-inner` : `opacity-40 ${tab.color} hover:opacity-100`}`}
                  >
                    {tab.label}
                    {tab.id === 'hooks' && hooks.length === 0 && auditResult && <i className="fa-solid fa-wand-magic-sparkles ml-2 text-xs opacity-50 group-hover:opacity-100 transition-opacity"></i>}
                    {tab.id === 'authority' && authorityPosts.length === 0 && auditResult && <i className="fa-solid fa-wand-magic-sparkles ml-2 text-xs opacity-50 group-hover:opacity-100 transition-opacity"></i>}
                    {tab.id === 'scripts' && scripts.length === 0 && auditResult && <i className="fa-solid fa-wand-magic-sparkles ml-2 text-xs opacity-50 group-hover:opacity-100 transition-opacity"></i>}
                    {activeTab === tab.id && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-current rounded-full animate-bounce shadow-lg"></span>}
                  </button>
                ))}
              </div>

              {activeTab === 'audit' && (
                <div className="animate-fadeIn py-6">
                   <h3 className="text-sm font-black uppercase tracking-[0.3em] mb-10 text-center opacity-30">{t.nextSteps}</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <button onClick={() => handleTabSwitch('hooks')} className="group relative p-10 rounded-[2.5rem] bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 transition-all text-center card-hover overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/30"></div>
                        <i className="fa-solid fa-wand-magic-sparkles text-4xl mb-5 text-amber-500 group-hover:rotate-12 transition-transform"></i>
                        <h4 className="font-black text-xl block mb-2">{t.genHooks}</h4>
                      </button>
                      <button onClick={() => handleTabSwitch('authority')} className="group relative p-10 rounded-[2.5rem] bg-purple-500/5 border border-purple-500/15 hover:bg-purple-500/10 transition-all text-center card-hover overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-purple-500/30"></div>
                        <i className="fa-solid fa-shield-halved text-4xl mb-5 text-purple-500 group-hover:scale-110 transition-transform"></i>
                        <h4 className="font-black text-xl block mb-2">{t.genAuthority}</h4>
                      </button>
                      <button onClick={() => handleTabSwitch('scripts')} className="group relative p-10 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition-all text-center card-hover overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30"></div>
                        <i className="fa-solid fa-clapperboard text-4xl mb-5 text-emerald-500 group-hover:translate-x-1 transition-transform"></i>
                        <h4 className="font-black text-xl block mb-2">{t.genScripts}</h4>
                      </button>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-20">
                {activeTab === 'audit' && auditResult && (
                  <>
                    <AuditCard index={0} title="Nome de Exibição" data={auditResult.nome} onCopy={() => copyToClipboard(auditResult.nome.sugestao)} theme={themeConfig} t={t} />
                    <AuditCard index={1} title="Linha de Valor" data={auditResult.primeiraLinha} onCopy={() => copyToClipboard(auditResult.primeiraLinha.sugestao)} theme={themeConfig} t={t} />
                    <AuditCard index={2} title="Autoridade Técnica" data={auditResult.segundaLinha} onCopy={() => copyToClipboard(auditResult.segundaLinha.sugestao)} theme={themeConfig} t={t} />
                    <AuditCard index={3} title={t.socialProof} data={auditResult.terceiraLinha} onCopy={() => copyToClipboard(auditResult.terceiraLinha.sugestao)} theme={themeConfig} t={t} />
                    <AuditCard index={4} title={t.cta} data={auditResult.quartaLinha} onCopy={() => copyToClipboard(auditResult.quartaLinha.sugestao)} theme={themeConfig} t={t} />
                    
                    {auditResult.recomendacoesGerais && auditResult.recomendacoesGerais.length > 0 && (
                      <div className={`md:col-span-2 animate-slideUp ${themeConfig.card} p-12 rounded-[3rem] border border-white/10 card-hover`} style={{ animationDelay: `${5 * 0.1}s` }}>
                        <h4 className="font-black text-2xl tracking-tighter mb-6">{t.generalRecommendations}</h4>
                        <ul className="space-y-4 list-disc list-inside opacity-80 pl-2">
                          {auditResult.recomendacoesGerais.map((rec, i) => <li key={i} className="leading-relaxed">{rec}</li>)}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'hooks' && hooks.map((h, i) => (
                  <div key={i} onClick={() => copyToClipboard(h.text)} className={`animate-slideUp ${themeConfig.card} p-10 rounded-[2.5rem] border border-white/5 cursor-pointer card-hover group relative overflow-hidden`} style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/40 group-hover:w-2 transition-all"></div>
                    <span className="text-[10px] font-black text-amber-500 uppercase mb-3 block tracking-widest">{h.category}</span>
                    <p className="font-bold text-2xl leading-tight">"{h.text}"</p>
                    <i className="fa-solid fa-copy absolute bottom-8 right-8 opacity-0 group-hover:opacity-40 transition-opacity"></i>
                  </div>
                ))}

                {activeTab === 'authority' && authorityPosts.map((a, i) => (
                  <div key={i} className={`animate-slideUp ${themeConfig.card} p-12 rounded-[3rem] border border-white/5 card-hover relative overflow-hidden`} style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <i className="fa-solid fa-shield-halved text-6xl"></i>
                    </div>
                    <span className="bg-purple-600/15 text-purple-400 px-5 py-2 rounded-full text-[10px] font-black uppercase mb-6 inline-block tracking-widest">{a.objetivo}</span>
                    <h4 className="text-2xl font-black mb-5 tracking-tight">{a.titulo}</h4>
                    <p className="opacity-70 text-base leading-relaxed mb-8">{a.conteudo}</p>
                    <button onClick={() => copyToClipboard(`${a.titulo}\n\n${a.conteudo}`)} className="text-purple-400 font-black text-sm flex items-center hover:translate-x-2 transition-transform">
                      <i className="fa-solid fa-copy mr-2"></i>{t.copyBtn} CONTEÚDO
                    </button>
                  </div>
                ))}

                {activeTab === 'scripts' && scripts.map((s, i) => (
                  <div key={i} className={`animate-slideUp ${themeConfig.card} p-12 rounded-[3rem] border border-white/5 md:col-span-2 card-hover shadow-2xl overflow-hidden`} style={{ animationDelay: `${i * 0.12}s` }}>
                    <div className="flex justify-between items-start mb-10">
                      <h4 className="text-3xl font-black tracking-tighter">{s.titulo}</h4>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 mb-10">
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/5 relative">
                        <strong className="text-emerald-400 block mb-3 uppercase tracking-tighter text-xs">GANCHO (HOOK)</strong> 
                        <p className="leading-relaxed opacity-90">{s.hook}</p>
                      </div>
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
                        <strong className="text-emerald-400 block mb-3 uppercase tracking-tighter text-xs">CONTEÚDO</strong> 
                        <p className="leading-relaxed opacity-90">{s.conteudoPrincipal}</p>
                      </div>
                      <div className="bg-white/5 p-8 rounded-3xl border border-white/5">
                        <strong className="text-emerald-400 block mb-3 uppercase tracking-tighter text-xs">AÇÃO (CTA)</strong> 
                        <p className="leading-relaxed opacity-90">{s.cta}</p>
                      </div>
                    </div>
                    <button onClick={() => copyToClipboard(`${s.titulo}\n\nHOOK: ${s.hook}\n\nDEV: ${s.conteudoPrincipal}\n\nCTA: ${s.cta}`)} className="w-full py-5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-black rounded-2xl transition-all flex items-center justify-center gap-3 border border-emerald-500/10">
                      <i className="fa-solid fa-copy"></i> COPIAR ROTEIRO COMPLETO
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {loading.active && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center z-[200] animate-fadeIn">
          <div className="relative w-28 h-28 mb-12">
             <div className="absolute inset-0 border-4 border-indigo-500/5 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
             <div className="absolute inset-4 border-4 border-b-amber-400 rounded-full animate-spin-slow"></div>
          </div>
          <h2 className="text-4xl font-black text-white uppercase tracking-[0.4em] mb-4 text-center">{t.processing}</h2>
          <div className="h-10 overflow-hidden text-center">
             <p className="text-indigo-400 font-bold animate-fadeIn text-xl tracking-wide" key={currentLoadingMessage}>{currentLoadingMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const AuditCard: React.FC<any> = ({ title, data, onCopy, theme, t, index }) => {
  if (!data) {
    return null;
  }
  
  return (
    <div className={`animate-slideUp ${theme.card} p-12 rounded-[3rem] border border-white/10 card-hover transition-all relative group`} style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="flex justify-between items-center mb-8">
        <h4 className="font-black text-2xl tracking-tighter">{title}</h4>
        <span className="bg-indigo-600/20 text-indigo-400 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-600/10">{data.status}</span>
      </div>
      <div className="space-y-8">
        <p className="opacity-60 text-sm leading-relaxed">{data.analise}</p>
        <div className="bg-gradient-to-br from-white/5 to-transparent p-8 rounded-3xl relative border border-white/5 group-hover:border-indigo-500/20 transition-colors">
          <button onClick={onCopy} className="absolute top-6 right-6 text-white/20 hover:text-indigo-400 transition-all hover:scale-125"><i className="fa-solid fa-copy"></i></button>
          <span className="text-[10px] font-black text-indigo-400 block mb-3 uppercase tracking-[0.2em]">{t.suggestion}</span>
          <p className="font-bold italic text-xl leading-tight opacity-90 tracking-tight">"{data.sugestao}"</p>
        </div>
      </div>
    </div>
  );
};

export default App;
