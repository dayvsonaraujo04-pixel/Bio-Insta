
import React, { useState, useMemo } from 'react';
import { analyzeBio, generateHooks, generateReelsScripts } from './geminiService';
import { BioAuditResult, Hook, ReelScript } from './types';
import { translations } from './translations';

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

  const handleError = (error: any) => {
    console.error("Erro na operação:", error);
    const msg = error?.message || String(error);
    if (msg.includes("429")) {
      alert("Limite de uso da API atingido. Por favor, aguarde um minuto e tente novamente.");
    } else {
      alert(t.errorGeneric + " Detalhes: " + msg.substring(0, 100));
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

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopySuccess(t.copied);
    setTimeout(() => setCopySuccess(null), 2000);
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
      const result = await analyzeBio(isNicheEnabled ? niche : null, image, instagramHandle, lang);
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
      setHooks(result);
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
      const result = await generateReelsScripts(finalNiche, lang);
      setScripts(result);
      setActiveTab('scripts');
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen pb-20 transition-all duration-500 ${themeConfig.bg} ${themeConfig.text}`} style={{ fontFamily: font }}>
      {copySuccess && (
        <div className="fixed top-4 right-4 z-[100] bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce font-bold">
          <i className="fa-solid fa-check mr-2"></i> {copySuccess}
        </div>
      )}

      <div className={`${themeConfig.header} backdrop-blur-md text-white px-4 py-3 flex flex-wrap justify-between items-center text-xs font-bold border-b border-white/10 gap-4`}>
        <div className="flex items-center gap-6">
          <div className="flex bg-white/10 rounded-lg p-1">
            <button onClick={() => setLang('pt')} className={`px-2 py-1 rounded transition-colors ${lang === 'pt' ? 'bg-white text-slate-900' : 'hover:bg-white/10'}`}>PT</button>
            <button onClick={() => setLang('en')} className={`px-2 py-1 rounded transition-colors ${lang === 'en' ? 'bg-white text-slate-900' : 'hover:bg-white/10'}`}>EN</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-60">{t.selectFont}:</span>
            <select value={font} onChange={(e) => setFont(e.target.value as FontStyle)} className="bg-white/10 border-none rounded px-2 py-1 outline-none text-white cursor-pointer">
              {['Inter', 'Playfair Display', 'Montserrat', 'Poppins', 'Raleway'].map(f => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(['white', 'black', 'purple', 'blue', 'pink', 'yellow', 'gray'] as Theme[]).map(th => (
            <button key={th} onClick={() => setTheme(th)} className={`w-6 h-6 rounded-full border-2 border-white/20 transition-transform ${theme === th ? 'scale-125 border-white ring-2 ring-white/30' : ''} ${th === 'white' ? 'bg-white' : th === 'black' ? 'bg-slate-900' : th === 'purple' ? 'bg-purple-600' : th === 'blue' ? 'bg-blue-600' : th === 'pink' ? 'bg-pink-500' : th === 'yellow' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
          ))}
        </div>
      </div>

      <header className="py-16 px-4 mb-12 text-center">
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter drop-shadow-2xl">
          <i className="fa-solid fa-scale-balanced mr-4 text-amber-400 animate-pulse"></i>
          {t.title}
        </h1>
        <p className="opacity-90 text-xl font-light max-w-2xl mx-auto">{t.subtitle}</p>
      </header>

      <main className="max-w-6xl mx-auto px-4 relative z-20">
        <section className={`${themeConfig.card} rounded-3xl shadow-2xl backdrop-blur-md border border-white/10 p-10 mb-16 transform -mt-16`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">{t.nicheLabel}</label>
                <button onClick={() => setIsNicheEnabled(!isNicheEnabled)} className={`w-8 h-4 rounded-full relative transition-colors ${isNicheEnabled ? 'bg-green-500' : 'bg-red-500'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isNicheEnabled ? 'left-4.5' : 'left-0.5'}`} />
                </button>
              </div>
              <input type="text" disabled={!isNicheEnabled} placeholder={t.nichePlaceholder} className={`w-full px-5 py-4 rounded-2xl ${themeConfig.input} border border-white/5 outline-none text-lg ${!isNicheEnabled ? 'opacity-30 cursor-not-allowed' : ''}`} value={niche} onChange={(e) => setNiche(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest opacity-60">{t.urlLabel}</label>
              <input type="text" placeholder={t.urlPlaceholder} className={`w-full px-5 py-4 rounded-2xl ${themeConfig.input} border border-white/5 outline-none text-lg`} value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest opacity-60">{t.uploadLabel}</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className={`flex items-center justify-center h-[58px] w-full px-5 py-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${image ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/20 text-slate-400'}`}>
                <i className={`fa-solid ${image ? 'fa-image' : 'fa-cloud-arrow-up'} mr-3`}></i>
                <span className="font-bold text-sm truncate">{image ? t.uploadSuccess : t.uploadPlaceholder}</span>
              </label>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center">
            <button onClick={runAnalysis} disabled={loading} className={`px-16 py-5 rounded-2xl font-black text-xl text-white shadow-2xl transition-all flex items-center justify-center min-w-[300px] ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-indigo-800 hover:scale-105 active:scale-95'}`}>
              {loading ? <i className="fa-solid fa-circle-notch fa-spin mr-3"></i> : <i className="fa-solid fa-bolt-lightning mr-3 text-amber-400"></i>}
              {t.analyzeBtn}
            </button>
          </div>
        </section>

        {auditResult && (
          <div className="space-y-12 animate-fadeIn">
            <div className="flex flex-wrap justify-center gap-6">
              <button onClick={loadMoreHooks} className="flex items-center px-8 py-4 bg-amber-500 text-slate-900 rounded-2xl font-black shadow-xl hover:-translate-y-1 transition-all"><i className="fa-solid fa-fire mr-3"></i> {t.genHooks}</button>
              <button onClick={loadMoreScripts} className="flex items-center px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:-translate-y-1 transition-all"><i className="fa-solid fa-video mr-3"></i> {t.genScripts}</button>
            </div>

            <div className={`flex p-2 rounded-3xl ${theme === 'white' ? 'bg-slate-200' : 'bg-white/5 backdrop-blur-xl border border-white/10'}`}>
              <button onClick={() => setActiveTab('audit')} className={`flex-1 py-4 px-6 rounded-2xl font-black text-sm transition-all ${activeTab === 'audit' ? `${themeConfig.card} shadow-lg` : 'opacity-40'}`}>{t.tabAudit}</button>
              <button onClick={() => setActiveTab('hooks')} className={`flex-1 py-4 px-6 rounded-2xl font-black text-sm transition-all ${activeTab === 'hooks' ? `${themeConfig.card} shadow-lg text-amber-500` : 'opacity-40'}`}>{t.tabHooks}</button>
              <button onClick={() => setActiveTab('scripts')} className={`flex-1 py-4 px-6 rounded-2xl font-black text-sm transition-all ${activeTab === 'scripts' ? `${themeConfig.card} shadow-lg text-indigo-400` : 'opacity-40'}`}>{t.tabScripts}</button>
            </div>

            <div className="min-h-[400px]">
              {activeTab === 'audit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <AuditCard title="Nome Estratégico" data={auditResult.nome} onCopy={() => copyToClipboard(auditResult.nome.sugestao)} theme={themeConfig} t={t} />
                  <AuditCard title="Linha 1: Valor" data={auditResult.primeiraLinha} onCopy={() => copyToClipboard(auditResult.primeiraLinha.sugestao)} theme={themeConfig} t={t} />
                  <AuditCard title="Linha 2: Diferencial" data={auditResult.segundaLinha} onCopy={() => copyToClipboard(auditResult.segundaLinha.sugestao)} theme={themeConfig} t={t} />
                  <AuditCard title="Linha 3: Prova Social" data={auditResult.terceiraLinha} onCopy={() => copyToClipboard(auditResult.terceiraLinha.sugestao)} theme={themeConfig} t={t} />
                  <AuditCard title="Linha 4: CTA" data={auditResult.quartaLinha} onCopy={() => copyToClipboard(auditResult.quartaLinha.sugestao)} theme={themeConfig} t={t} />
                  <div className="md:col-span-2 bg-gradient-to-br from-indigo-900/80 to-slate-900/80 p-10 rounded-3xl border border-indigo-500/20">
                    <h3 className="text-2xl font-black mb-6 flex items-center"><i className="fa-solid fa-wand-sparkles text-amber-400 mr-3"></i>Plano de Conversão</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {auditResult.recomendacoesGerais.map((rec, i) => (
                        <div key={i} className="flex items-center bg-white/5 p-4 rounded-xl border border-white/10"><i className="fa-solid fa-check text-green-400 mr-3"></i>{rec}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'hooks' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {hooks.map((h, i) => (
                    <div key={i} onClick={() => copyToClipboard(h.text)} className={`${themeConfig.card} p-6 rounded-2xl border border-white/10 cursor-pointer hover:scale-105 transition-transform`}>
                      <span className="text-[10px] font-black uppercase text-indigo-400">{h.category}</span>
                      <p className="font-bold text-lg mt-2">"{h.text}"</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'scripts' && (
                <div className="space-y-6">
                  {scripts.map((s, i) => (
                    <div key={i} className={`${themeConfig.card} p-8 rounded-3xl border border-white/10`}>
                      <h4 className="text-xl font-black mb-4">{s.titulo}</h4>
                      <div className="space-y-4 opacity-80 text-sm">
                        <p><strong>HOOK:</strong> {s.hook}</p>
                        <p><strong>CORPO:</strong> {s.conteudoPrincipal}</p>
                        <p><strong>CTA:</strong> {s.cta}</p>
                      </div>
                      <button onClick={() => copyToClipboard(`${s.titulo}\n${s.hook}\n${s.conteudoPrincipal}\n${s.cta}`)} className="mt-4 text-indigo-400 font-bold flex items-center"><i className="fa-solid fa-copy mr-2"></i>Copiar Completo</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {loading && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-[200]">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">{t.processing}</h2>
        </div>
      )}
    </div>
  );
};

const AuditCard: React.FC<any> = ({ title, data, onCopy, theme, t }) => (
  <div className={`${theme.card} p-8 rounded-3xl border border-white/10 relative overflow-hidden group`}>
    <div className="flex justify-between items-center mb-6">
      <h4 className="font-black text-xl">{title}</h4>
      <span className="bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{data.status}</span>
    </div>
    <div className="space-y-4">
      <p className="opacity-70 text-sm leading-relaxed">{data.analise}</p>
      <div className="bg-white/5 p-4 rounded-xl relative border border-white/5 group-hover:bg-white/10 transition-colors">
        <button onClick={onCopy} className="absolute top-2 right-2 text-white/20 hover:text-indigo-400"><i className="fa-solid fa-copy"></i></button>
        <span className="text-[10px] font-black text-indigo-400 block mb-1">SUGESTÃO</span>
        <p className="font-bold italic text-md">"{data.sugestao}"</p>
      </div>
    </div>
  </div>
);

export default App;
