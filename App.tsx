
import React, { useState, useMemo, useEffect } from 'react';
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
  }, [metrics]);

  const incrementMetric = (key: keyof Metrics, amount: number = 1) => {
    setMetrics(prev => ({ ...prev, [key]: prev[key] + amount }));
  };

  // Função para alerta sonoro de sucesso
  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio Context não suportado ou bloqueado pelo navegador.");
    }
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
    console.error("Erro:", error);
    const msg = error?.message?.toLowerCase() || String(error).toLowerCase();
    if (msg.includes("429") || msg.includes("quota")) {
      if (window.confirm("Limite atingido. Conectar sua chave API agora?")) await handleOpenKey();
    } else {
      alert(t.errorGeneric + " " + (error?.message || String(error)).substring(0, 100));
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
      playSuccessSound(); // Alerta sonoro automático
      scrollToResults();
    } catch (error) {
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
        playSuccessSound(); // Alerta sonoro automático
      } catch (error) { handleError(error); }
      finally { setLoading({ active: false, type: 'none', messageIndex: 0 }); }
    } else if (tab === 'scripts' && scripts.length === 0) {
      setLoading({ active: true, type: 'scripts', messageIndex: 0 });
      try {
        const s = await generateReelsScripts(targetNiche, auditResult, lang);
        setScripts(s);
        incrementMetric('scripts', s.length);
        playSuccessSound(); // Alerta sonoro automático
      } catch (error) { handleError(error); }
      finally { setLoading({ active: false, type: 'none', messageIndex: 0 }); }
    } else if (tab === 'authority' && authorityPosts.length === 0) {
      setLoading({ active: true, type: 'authority', messageIndex: 0 });
      try {
        const a = await generateAuthorityPosts(targetNiche, auditResult, lang);
        setAuthorityPosts(a);
        incrementMetric('authority', a.length);
        playSuccessSound(); // Alerta sonoro automático
      } catch (error) { handleError(error); }
      finally { setLoading({ active: false, type: 'none', messageIndex: 0 }); }
    }
    scrollToResults();
  };

  return (
    <div className={`min-h-screen pb-20 transition-all duration-500 ${themeConfig.bg} ${themeConfig.text}`} style={{ fontFamily: font }}>
      {copySuccess && (
        <div className="fixed top-4 right-4 z-[100] bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce font-bold">
          <i className="fa-solid fa-check mr-2"></i> {copySuccess}
        </div>
      )}

      {/* Settings Bar */}
      <div className={`${themeConfig.header} backdrop-blur-md text-white px-4 py-3 flex flex-wrap justify-between items-center text-xs font-bold border-b border-white/10 gap-4`}>
        <div className="flex items-center gap-6">
          <div className="flex bg-white/10 rounded-lg p-1">
            <button onClick={() => setLang('pt')} className={`px-2 py-1 rounded ${lang === 'pt' ? 'bg-white text-slate-900' : ''}`}>PT</button>
            <button onClick={() => setLang('en')} className={`px-2 py-1 rounded ${lang === 'en' ? 'bg-white text-slate-900' : ''}`}>EN</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-40">{t.selectFont}:</span>
            <select value={font} onChange={(e) => setFont(e.target.value as FontStyle)} className="bg-transparent border-none outline-none cursor-pointer">
              {['Inter', 'Playfair Display', 'Montserrat', 'Poppins', 'Raleway'].map(f => <option key={f} value={f} className="text-slate-900">{f}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleOpenKey} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10">
            <i className="fa-solid fa-key text-[10px] text-amber-400"></i>
            <span>API Key</span>
          </button>
          <div className="flex items-center gap-2">
            {(['white', 'black', 'purple', 'blue', 'pink', 'yellow', 'gray'] as Theme[]).map(th => (
              <button key={th} onClick={() => setTheme(th)} className={`w-6 h-6 rounded-full border-2 border-white/20 ${theme === th ? 'scale-125 border-white ring-2 ring-white/30' : ''} bg-${th === 'black' ? 'slate-900' : th === 'white' ? 'white' : th + '-600'}`} />
            ))}
          </div>
        </div>
      </div>

      <header className="py-20 px-4 text-center">
        <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter drop-shadow-2xl">
          <i className="fa-solid fa-scale-balanced mr-4 text-amber-400"></i> {t.title}
        </h1>
        <p className="opacity-80 text-xl font-light max-w-2xl mx-auto">{t.subtitle}</p>

        <div className="max-w-5xl mx-auto mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 px-4 animate-fadeIn">
          {[
            { key: 'audits', tab: 'audit', color: 'text-indigo-400', label: t.statsAudits, action: 'Ver Auditoria' },
            { key: 'hooks', tab: 'hooks', color: 'text-amber-400', label: t.statsHooks, action: 'Ver Ganchos' },
            { key: 'authority', tab: 'authority', color: 'text-purple-400', label: t.statsAuthority, action: 'Ver Posts' },
            { key: 'scripts', tab: 'scripts', color: 'text-emerald-400', label: t.statsScripts, action: 'Ver Roteiros' }
          ].map(m => (
            <button 
              key={m.key}
              disabled={metrics[m.key as keyof Metrics] === 0}
              onClick={() => handleTabSwitch(m.tab as any)}
              className={`${themeConfig.card} p-4 rounded-3xl border border-white/5 backdrop-blur-sm card-hover text-center transition-all ${metrics[m.key as keyof Metrics] === 0 ? 'opacity-50 grayscale' : 'cursor-pointer hover:border-white/20'}`}
            >
              <span className="text-[10px] font-black uppercase opacity-40 block mb-1">{m.label}</span>
              <span className={`text-2xl font-black ${m.color} tabular-nums block`}>{metrics[m.key as keyof Metrics]}</span>
              {metrics[m.key as keyof Metrics] > 0 && <span className="text-[8px] font-bold opacity-30 uppercase mt-1">{m.action}</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">
        <section className={`${themeConfig.card} rounded-[3rem] shadow-2xl backdrop-blur-md border border-white/10 p-12 mb-16 transform -mt-10`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.nicheLabel}</label>
                <button onClick={() => setIsNicheEnabled(!isNicheEnabled)} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${isNicheEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isNicheEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <input type="text" disabled={!isNicheEnabled} placeholder={t.nichePlaceholder} className={`w-full px-6 py-5 rounded-2xl ${themeConfig.input} border border-white/5 outline-none text-lg transition-all ${!isNicheEnabled ? 'opacity-30 cursor-not-allowed grayscale' : 'opacity-100'}`} value={niche} onChange={(e) => setNiche(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.urlLabel}</label>
              <input type="text" placeholder={t.urlPlaceholder} className={`w-full px-6 py-5 rounded-2xl ${themeConfig.input} border border-white/5 outline-none text-lg`} value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.uploadLabel}</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className={`flex items-center justify-center h-[68px] w-full px-5 py-4 rounded-2xl border-2 border-dashed cursor-pointer ${image ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/20'}`}>
                <i className={`fa-solid ${image ? 'fa-image' : 'fa-cloud-arrow-up'} mr-3`}></i>
                <span className="font-bold text-sm truncate">{image ? t.uploadSuccess : t.uploadPlaceholder}</span>
              </label>
            </div>
          </div>
          <div className="mt-12 text-center">
            <button onClick={runAnalysis} disabled={loading.active} className="px-20 py-6 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-2xl font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">
              {loading.active && loading.type === 'audit' ? <i className="fa-solid fa-circle-notch fa-spin mr-3"></i> : <i className="fa-solid fa-bolt-lightning mr-3 text-amber-400"></i>}
              {t.analyzeBtn}
            </button>
          </div>
        </section>

        {auditResult && (
          <div id="results-section" className="space-y-12 animate-fadeIn pt-8">
            {/* Tab Navigation with Enhanced Emphasis and Animation */}
            <div className={`relative flex p-2 rounded-3xl flex-wrap overflow-hidden transition-all duration-300 ${theme === 'white' ? 'bg-slate-200' : 'bg-white/5 backdrop-blur-2xl border border-white/10'}`}>
              {[
                { id: 'audit', label: t.tabAudit, color: 'hover:text-white', activeColor: 'text-white' },
                { id: 'hooks', label: t.tabHooks, color: 'hover:text-amber-400', activeColor: 'text-amber-400' },
                { id: 'authority', label: t.tabAuthority, color: 'hover:text-purple-400', activeColor: 'text-purple-400' },
                { id: 'scripts', label: t.tabScripts, color: 'hover:text-emerald-400', activeColor: 'text-emerald-400' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id as any)} 
                  className={`relative z-10 flex-1 min-w-[120px] py-5 px-6 rounded-2xl font-black text-sm uppercase tracking-[0.15em] transition-all duration-500 transform ${activeTab === tab.id ? `${tab.activeColor} scale-105 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]` : `opacity-30 ${tab.color} hover:opacity-100`}`}
                >
                  {activeTab === tab.id && (
                    <span className="absolute inset-0 bg-white/10 rounded-2xl animate-fadeIn blur-sm"></span>
                  )}
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-current rounded-full animate-bounce"></span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'audit' && (
              <div className="animate-fadeIn py-4">
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-8 text-center opacity-40">{t.nextSteps}</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button onClick={() => handleTabSwitch('hooks')} className="group p-8 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-center">
                      <i className="fa-solid fa-wand-magic-sparkles text-3xl mb-4 text-amber-500 group-hover:scale-110 transition-transform"></i>
                      <h4 className="font-black text-lg block mb-2">{t.genHooks}</h4>
                      <p className="text-xs opacity-60">Ganchos baseados na sua nova Bio.</p>
                    </button>
                    <button onClick={() => handleTabSwitch('authority')} className="group p-8 rounded-[2rem] bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all text-center">
                      <i className="fa-solid fa-shield-halved text-3xl mb-4 text-purple-500 group-hover:scale-110 transition-transform"></i>
                      <h4 className="font-black text-lg block mb-2">{t.genAuthority}</h4>
                      <p className="text-xs opacity-60">Posts para elevar seu posicionamento.</p>
                    </button>
                    <button onClick={() => handleTabSwitch('scripts')} className="group p-8 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-center">
                      <i className="fa-solid fa-clapperboard text-3xl mb-4 text-emerald-500 group-hover:scale-110 transition-transform"></i>
                      <h4 className="font-black text-lg block mb-2">{t.genScripts}</h4>
                      <p className="text-xs opacity-60">Roteiros prontos para gravar.</p>
                    </button>
                 </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
              {activeTab === 'audit' && (
                <>
                  <AuditCard index={0} title="Nome do Perfil" data={auditResult.nome} onCopy={() => copyToClipboard(auditResult.nome.sugestao)} theme={themeConfig} t={t} />
                  <AuditCard index={1} title="Linha de Valor" data={auditResult.primeiraLinha} onCopy={() => copyToClipboard(auditResult.primeiraLinha.sugestao)} theme={themeConfig} t={t} />
                  <AuditCard index={2} title="Autoridade" data={auditResult.segundaLinha} onCopy={() => copyToClipboard(auditResult.segundaLinha.sugestao)} theme={themeConfig} t={t} />
                  <AuditCard index={3} title="Prova Social" data={auditResult.terceiraLinha} onCopy={() => copyToClipboard(auditResult.terceiraLinha.sugestao)} theme={themeConfig} t={t} />
                </>
              )}

              {activeTab === 'hooks' && hooks.map((h, i) => (
                <div key={i} onClick={() => copyToClipboard(h.text)} className={`animate-slideUp ${themeConfig.card} p-8 rounded-[2rem] border border-white/5 cursor-pointer card-hover transition-colors`} style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="text-[10px] font-black text-amber-500 uppercase mb-2 block">{h.category}</span>
                  <p className="font-bold text-xl leading-snug">"{h.text}"</p>
                </div>
              ))}

              {activeTab === 'authority' && authorityPosts.map((a, i) => (
                <div key={i} className={`animate-slideUp ${themeConfig.card} p-10 rounded-[2.5rem] border border-white/5 card-hover transition-all`} style={{ animationDelay: `${i * 0.1}s` }}>
                  <span className="bg-purple-600/10 text-purple-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase mb-4 inline-block">{a.objetivo}</span>
                  <h4 className="text-xl font-black mb-4">{a.titulo}</h4>
                  <p className="opacity-70 text-sm leading-relaxed mb-6">{a.conteudo}</p>
                  <button onClick={() => copyToClipboard(`${a.titulo}\n\n${a.conteudo}`)} className="text-purple-400 font-bold text-sm flex items-center hover:text-purple-300">
                    <i className="fa-solid fa-copy mr-2"></i>{t.copyBtn} Post
                  </button>
                </div>
              ))}

              {activeTab === 'scripts' && scripts.map((s, i) => (
                <div key={i} className={`animate-slideUp ${themeConfig.card} p-10 rounded-[2.5rem] border border-white/5 md:col-span-2 card-hover transition-all`} style={{ animationDelay: `${i * 0.15}s` }}>
                  <h4 className="text-2xl font-black mb-6">{s.titulo}</h4>
                  <div className="grid md:grid-cols-3 gap-6 opacity-80 text-sm">
                    <div className="bg-white/5 p-6 rounded-2xl"><strong className="text-emerald-400 block mb-2">HOOK</strong> {s.hook}</div>
                    <div className="bg-white/5 p-6 rounded-2xl"><strong className="text-emerald-400 block mb-2">DEVELOPMENT</strong> {s.conteudoPrincipal}</div>
                    <div className="bg-white/5 p-6 rounded-2xl"><strong className="text-emerald-400 block mb-2">CTA</strong> {s.cta}</div>
                  </div>
                  <button onClick={() => copyToClipboard(`${s.titulo}\n${s.hook}\n${s.conteudoPrincipal}\n${s.cta}`)} className="mt-8 text-emerald-400 font-bold flex items-center hover:text-emerald-300 transition-colors">
                    <i className="fa-solid fa-copy mr-2"></i>Copiar Roteiro Completo
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {loading.active && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center z-[200]">
          <div className="relative w-24 h-24 mb-10">
             <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
             <div className="absolute inset-4 border-4 border-b-amber-500 rounded-full animate-spin-slow"></div>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-2">{t.processing}</h2>
          <div className="h-8 overflow-hidden">
             <p className="text-indigo-400 font-medium text-center animate-fadeIn" key={currentLoadingMessage}>{currentLoadingMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const AuditCard: React.FC<any> = ({ title, data, onCopy, theme, t, index }) => (
  <div className={`animate-slideUp ${theme.card} p-10 rounded-[2.5rem] border border-white/5 card-hover transition-all`} style={{ animationDelay: `${index * 0.1}s` }}>
    <div className="flex justify-between items-center mb-6">
      <h4 className="font-black text-2xl tracking-tight">{title}</h4>
      <span className="bg-indigo-600/10 text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">{data.status}</span>
    </div>
    <div className="space-y-6">
      <p className="opacity-60 text-sm leading-relaxed">{data.analise}</p>
      <div className="bg-white/5 p-6 rounded-2xl relative border border-white/5">
        <button onClick={onCopy} className="absolute top-4 right-4 text-white/20 hover:text-indigo-400 transition-colors"><i className="fa-solid fa-copy"></i></button>
        <span className="text-[10px] font-black text-indigo-400 block mb-2 uppercase tracking-widest">Sugestão VIP</span>
        <p className="font-bold italic text-lg leading-tight">"{data.sugestao}"</p>
      </div>
    </div>
  </div>
);

export default App;
