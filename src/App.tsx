import { useState, useEffect, useRef } from 'react';
import { 
  Scissors, 
  MapPin, 
  Clock, 
  Users, 
  Shield, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Globe, 
  User, 
  Trash2, 
  Plus, 
  Check, 
  Play,
  HelpCircle, 
  Smartphone, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  Instagram, 
  Facebook, 
  ArrowLeft,
  X,
  CreditCard,
  Wifi,
  FileText,
  Key,
  Share,
  Settings,
  Save,
  QrCode,
  Volume2,
  VolumeX,
  Tv,
  ExternalLink,
  Copy,
  MessageSquare,
  Send,
  AlertTriangle,
  Download
} from 'lucide-react';
import { 
  translations, 
  Barber, 
  Service, 
  QueueTicket, 
  BarbershopSettings, 
  AppState 
} from './types';
import { EmbeddedStripeCheckout } from './components/EmbeddedStripeCheckout';

const monthsList = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

const isToday = (dateString?: string) => {
  if (!dateString) return false;
  const ticketDate = new Date(dateString);
  const today = new Date();
  return (
    ticketDate.getDate() === today.getDate() &&
    ticketDate.getMonth() === today.getMonth() &&
    ticketDate.getFullYear() === today.getFullYear()
  );
};

// ========================================================
// 📺 TV/MONITOR PAINEL VIEW (FULL-SCREEN DE ATENDIMENTOS)
// ========================================================
interface TvMonitorViewProps {
  syncState: AppState | null;
  loading: boolean;
  language: 'pt-BR' | 'en-GB';
  t: any;
  onCloseTv: () => void;
}

function TvMonitorView({ syncState, loading, language, onCloseTv }: TvMonitorViewProps) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeAnnouncement, setActiveAnnouncement] = useState<QueueTicket | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  
  const prevTicketIdRef = useRef<string | null>(null);

  // Live Digital Clock updating every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter & classify tickets
  const waitingTickets = (syncState?.tickets || [])
    .filter(t => t.status === 'AGUARDANDO' && isToday(t.createdAt))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const emAtendimento = (syncState?.tickets || [])
    .filter(t => (t.status === 'EM_ATENDIMENTO' || t.status === 'CHAMADO') && isToday(t.createdAt))
    .sort((a, b) => {
      const timeA = a.calledAt ? new Date(a.calledAt).getTime() : 0;
      const timeB = b.calledAt ? new Date(b.calledAt).getTime() : 0;
      return timeB - timeA;
    });

  const currentTicket = emAtendimento[0] || null;

  // Sound chime function using native Web Audio API
  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      // Tone 1: E5 (659.25Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime); 
      gain1.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.5);

      // Tone 2: A5 (880.00Hz) after 0.22 seconds
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime); 
        gain2.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.6);
      }, 220);
    } catch (e) {
      console.warn('Som bloqueado ou não suportado:', e);
    }
  };

  // Listen for newly called ticket triggers
  useEffect(() => {
    if (currentTicket) {
      // If we already had a loaded ticket and the ID changes, call the alarm
      if (prevTicketIdRef.current !== null && prevTicketIdRef.current !== currentTicket.id) {
        setActiveAnnouncement(currentTicket);
        if (soundEnabled) {
          // Play chime disabled per user request: "RETIRAR A SOM CHAMANDO PELA PROXIMO"
          // playChime();
        }
        // Dismiss full-screen alert overlay after 8 seconds
        const timer = setTimeout(() => {
          setActiveAnnouncement(null);
        }, 8000);
        return () => clearTimeout(timer);
      }
      prevTicketIdRef.current = currentTicket.id;
    } else {
      prevTicketIdRef.current = null;
    }
  }, [currentTicket?.id, soundEnabled]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center text-[var(--brand-color)] font-mono gap-4">
        <Scissors className="w-12 h-12 animate-spin" />
        <span className="uppercase text-xs tracking-widest font-bold">CARREGANDO PAINEL DA TV...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#07090E] text-white flex flex-col p-6 font-sans relative overflow-hidden select-none">
      
      {/* BACKGROUND DECORATIVE EFFECTS */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--brand-color)]/5 rounded-full blur-[150px] -z-10 animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[150px] -z-10 pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-4">
          {syncState?.settings.logoUrl ? (
            <div className="w-16 h-16 rounded-2xl bg-[#101622] p-2 flex items-center justify-center border border-white/10 shrink-0">
              <img src={syncState.settings.logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#101622] flex items-center justify-center border border-white/10 text-[var(--brand-color)] font-black tracking-wider shrink-0">
              <Scissors className="w-8 h-8" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-widest uppercase font-mono text-white">
              {syncState?.settings.name || 'BARBEARIA'}
            </h1>
            <p className="text-[10px] text-[var(--brand-color)] font-black uppercase tracking-widest font-mono">
              PAINEL DE ATENDINMENTO EM TEMPO REAL
            </p>
          </div>
        </div>

        {/* TIME & LIVE METADATA */}
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-mono">HORA LOCAL</p>
            <p className="text-2xl font-mono font-black text-white tracking-wider">{currentTime}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sound Toggle Button */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                // Also trigger a chime so the browser registers user gesture and unblocks audio!
                if (!soundEnabled) {
                  setTimeout(playChime, 100);
                }
              }}
              className={`p-3 rounded-2xl transition-all duration-200 border cursor-pointer ${
                soundEnabled 
                  ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)] border-[var(--brand-color)]/20' 
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
              }`}
              title={soundEnabled ? 'Silenciar avisos sonoros' : 'Ativar avisos sonoros'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Manual Back Button */}
            <button
              onClick={onCloseTv}
              className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              title="Voltar ao Painel Administrativo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* CURRENT CALLED TICKET PANEL (65%) */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-[#101622]/60 border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-4 shrink-0">
            <span className="text-[10px] bg-[var(--brand-color)]/10 border border-[var(--brand-color)]/20 text-[var(--brand-color)] font-mono px-3 py-1.5 rounded-full font-black uppercase tracking-widest">
              ATENDENDO AGORA
            </span>
          </div>

          <div className="my-auto text-center py-6">
            {currentTicket ? (
              <div className="space-y-6">
                <div>
                  <span className="text-[11px] text-gray-400 uppercase tracking-widest font-black font-mono">
                    NÚMERO DA SENHA
                  </span>
                  <h2 className="text-8xl md:text-[11rem] font-mono font-black text-[var(--brand-color)] tracking-tight leading-none filter drop-shadow-[0_0_20px_rgba(0,227,150,0.2)] animate-pulse">
                    {currentTicket.number}
                  </h2>
                </div>

                <div className="space-y-2 max-w-2xl mx-auto">
                  <span className="text-[11px] text-gray-500 uppercase tracking-widest font-black font-mono">
                    CLIENTE CHAMADO
                  </span>
                  <h3 className="text-4xl md:text-6xl font-black tracking-wide text-white uppercase truncate">
                    {currentTicket.name}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-4">
                  <div className="bg-[#080B11]/80 border border-white/5 rounded-2xl p-4 text-center">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block font-mono">BARBEIRO DESIGNADO</span>
                    <span className="text-base font-extrabold text-white uppercase block mt-1 tracking-wider">{currentTicket.barberName}</span>
                  </div>
                  <div className="bg-[#080B11]/80 border border-white/5 rounded-2xl p-4 text-center">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block font-mono">SERVIÇO SELECIONADO</span>
                    <span className="text-base font-extrabold text-[var(--brand-color)] uppercase block mt-1 tracking-wider">{currentTicket.serviceName}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-16">
                <Scissors className="w-16 h-16 text-gray-600 mx-auto animate-bounce" />
                <h3 className="text-2xl font-mono font-black text-gray-500 uppercase tracking-widest">Nenhuma senha ativa</h3>
                <p className="text-xs text-gray-600 uppercase tracking-wide font-mono">Os barbeiros cadastrados aparecerão aqui conforme as senhas forem chamadas.</p>
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 text-xs font-mono">
            <span className="uppercase text-[10px] font-bold tracking-wider">ACOMPANHE SUAS SENHAS ONLINE</span>
            <span className="uppercase text-[10px] font-bold tracking-wider text-rose-500">MANTENHA ESTA TELA ATIVA NA TV</span>
          </div>
        </div>

        {/* SEQUENCE QUEUE LIST PANEL (35%) */}
        <div className="lg:col-span-4 flex flex-col bg-[#101622]/40 border border-white/5 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-black font-mono tracking-wider text-white uppercase">PRÓXIMOS DA FILA</h3>
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mt-0.5">ORDEM DE ATENDIMENTO</p>
            </div>
            <div className="bg-[var(--brand-color)]/10 border border-[var(--brand-color)]/20 px-3 py-1 rounded-full shrink-0">
              <span className="text-xs font-bold font-mono text-[var(--brand-color)] uppercase tracking-widest">
                {waitingTickets.length} ESPERANDO
              </span>
            </div>
          </div>

          {/* LIST CONTAINER */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[60vh] pr-1">
            {waitingTickets.length > 0 ? (
              waitingTickets.slice(0, 7).map((tkt, i) => (
                <div 
                  key={tkt.id} 
                  className={`flex items-center justify-between p-4 rounded-2xl border transition duration-150 ${
                    i === 0 
                      ? 'bg-[var(--brand-color)]/5 border-[var(--brand-color)]/20' 
                      : 'bg-[#080B11]/60 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg font-black font-mono text-[var(--brand-color)] bg-[#07090E] px-3 py-1.5 rounded-xl border border-white/5">
                      {tkt.number}
                    </span>
                    <div className="min-w-0">
                      {/* ONLY SHOW NAME AS PER REQUEST */}
                      <span className="text-base font-black text-white uppercase tracking-wide truncate block">
                        {tkt.name}
                      </span>
                      <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mt-0.5">
                        Barbeiro: {tkt.barberName}
                      </span>
                    </div>
                  </div>

                  {i === 0 && (
                    <span className="text-[8px] font-mono font-black border border-[var(--brand-color)]/30 bg-[var(--brand-color)]/20 text-[var(--brand-color)] px-2 py-1 rounded uppercase tracking-widest">
                      PRÓXIMO
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-12">
                <Users className="w-8 h-8 text-gray-600" />
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest font-black">FILA VAZIA ATÉ O MOMENTO</span>
              </div>
            )}

            {waitingTickets.length > 7 && (
              <div className="text-center py-2 bg-white/5 rounded-xl">
                <span className="text-[9px] text-gray-400 font-mono uppercase font-bold tracking-widest">
                  + {waitingTickets.length - 7} OUTROS CLIENTES AGUARDANDO
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🔮 FULL-SCREEN OVERLAY CALL ALARM ANNOUNCEMENT ON DEMAND  */}
      {/* ======================================================== */}
      {activeAnnouncement && (
        <div className="fixed inset-0 bg-[#07090E] flex flex-col items-center justify-center p-8 z-[9999] animate-fade-in border-8 border-[var(--brand-color)] md:border-[16px] transition-all">
          {/* FLASHING / GLOWING RING EFFECT */}
          <div className="absolute inset-0 bg-[#101622]/50 animate-pulse pointer-events-none" />
          
          <div className="max-w-4xl w-full text-center space-y-8 z-10">
            <div className="animate-bounce">
              <span className="bg-[var(--brand-color)] text-[#07090E] text-sm md:text-lg font-mono font-black px-6 py-2.5 rounded-full uppercase tracking-widest select-none shadow-[0_0_40px_rgba(0,227,150,0.5)]">
                🔊 PROXIMO DA FILA CHAMADO!
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs md:text-sm text-gray-400 uppercase tracking-widest font-black font-mono">
                SIGA PARA O ATENDIMENTO
              </span>
              <h2 className="text-[7rem] md:text-[14rem] font-mono font-black text-[var(--brand-color)] tracking-tight leading-none filter drop-shadow-[0_0_50px_rgba(0,227,150,0.4)]">
                {activeAnnouncement.number}
              </h2>
            </div>

            <div className="space-y-4">
              <span className="text-xs md:text-sm text-gray-500 uppercase tracking-widest font-black font-mono block">
                NOME DO CLIENTE
              </span>
              <h3 className="text-5xl md:text-8xl font-black tracking-widest text-white uppercase truncate">
                {activeAnnouncement.name}
              </h3>
            </div>

            <div className="border-t border-white/10 pt-8 max-w-xl mx-auto grid grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] text-gray-500 font-mono block uppercase tracking-widest">BARBEIRO</span>
                <span className="text-xl md:text-2xl font-bold font-mono text-white uppercase block mt-1 tracking-wider">{activeAnnouncement.barberName}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-mono block uppercase tracking-widest">SERVIÇO</span>
                <span className="text-xl md:text-2xl font-bold font-mono text-[var(--brand-color)] uppercase block mt-1 tracking-wider">{activeAnnouncement.serviceName}</span>
              </div>
            </div>
            
            <div className="pt-6">
              <button 
                onClick={() => setActiveAnnouncement(null)}
                className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white px-5 py-2.5 rounded-xl border border-white/5 hover:border-white/20 text-xs font-mono uppercase tracking-widest font-bold transition cursor-pointer"
              >
                OCULTAR ALERTA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER NOTICE */}
      <div className="text-center mt-6 text-gray-600 font-mono text-[9px] uppercase tracking-widest">
        Painel interativo sincronizado • desenvolvido com foco em displays de recepção e TVs.
      </div>
    </div>
  );
}

export default function App() {
  const getActiveShopId = () => {
    const p = new URLSearchParams(window.location.search);
    let id = p.get('shop') || p.get('shopId');
    if (!id) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && parts[0] !== 'master' && parts[0] !== 'api' && parts[0] !== 'index.html' && parts[0] !== 'sw.js') {
        id = parts[0];
      }
    }
    return (id || 'matriz').trim().toLowerCase();
  };

  const activeShopId = getActiveShopId();

  // Local/Offline state fallback
  const getLocalFallbackState = (): AppState => {
    const cached = localStorage.getItem('cached_app_state');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.settings && parsed.barbers && parsed.services && parsed.tickets) {
          return parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return {
      settings: {
        name: "Barbearia Local (Offline)",
        address: "Rua do Fallback, 123",
        instagram: "",
        facebook: "",
        logoUrl: "",
        thankYouMessage: "Obrigado por utilizar o sistema local offline!",
        announcementDuration: 5,
        systemTestEnabled: false,
        systemTestPassword: "TESTE",
        colorPalette: "emerald",
        backgroundTheme: "default",
        sendInstagram: false,
        sendFacebook: false,
        servicePrice: 35.0,
        salonLatitude: 38.7223,
        salonLongitude: -9.1393
      },
      barbers: [
        { id: 'barber-1', name: 'BARBEIRO 1', active: true },
        { id: 'barber-2', name: 'NOVO BARBEIRO', active: true }
      ],
      services: [
        { id: 'srv-1', name: 'CORTE', price: 35.0, duration: 30, type: 'adult' },
        { id: 'srv-2', name: 'CORTE KIDS', price: 25.0, duration: 25, type: 'kids' }
      ],
      tickets: []
    };
  };

  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [localDbState, setLocalDbState] = useState<AppState>(() => getLocalFallbackState());

  const localDbStateRef = useRef<AppState>(localDbState);
  useEffect(() => {
    localDbStateRef.current = localDbState;
  }, [localDbState]);

  const fetchWithTimeout = async (resource: string, options: any = {}): Promise<Response> => {
    const { timeout = 10000, ...rest } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await window.fetch(resource, {
        ...rest,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const handleLocalMockApi = async (url: string, options?: RequestInit): Promise<Response> => {
    const method = options?.method || 'GET';
    const bodyStr = options?.body ? String(options.body) : '';
    let body: any = {};
    if (bodyStr) {
      try {
        body = JSON.parse(bodyStr);
      } catch (e) {
        // ignore
      }
    }

    const currentState = { ...localDbStateRef.current };
    let responseData: any = { success: true };

    console.log(`[Offline LocalStorage DB] ${method} request to ${url}`, body);

    if (url.includes('/api/state')) {
      responseData = currentState;
    } else if (url.includes('/api/tickets/next')) {
      const waiting = currentState.tickets.filter(t => t.status === 'AGUARDANDO');
      if (waiting.length > 0) {
        const nextTkt = waiting[0];
        nextTkt.status = 'CHAMADO';
        nextTkt.calledAt = new Date().toISOString();
        responseData = { success: true, ticket: nextTkt };
      } else {
        responseData = { success: false, error: 'Nenhum cliente na fila de espera.' };
      }
    } else if (url.includes('/api/tickets') && url.includes('/cancel')) {
      const parts = url.split('/');
      const id = parts[parts.indexOf('tickets') + 1];
      const tkt = currentState.tickets.find(t => t.id === id);
      if (tkt) {
        tkt.status = 'CANCELADO';
      }
    } else if (url.includes('/api/tickets') && url.includes('/status')) {
      const parts = url.split('/');
      const id = parts[parts.indexOf('tickets') + 1];
      const tkt = currentState.tickets.find(t => t.id === id);
      if (tkt) {
        tkt.status = body.status || tkt.status;
        if (body.status === 'CHAMADO') {
          tkt.calledAt = new Date().toISOString();
        } else if (body.status === 'FINALIZADO') {
          tkt.completedAt = new Date().toISOString();
        }
        if (body.barberId) tkt.barberId = body.barberId;
        if (body.barberName) tkt.barberName = body.barberName;
      }
    } else if (url.includes('/api/tickets') && url.includes('/messages')) {
      const parts = url.split('/');
      const id = parts[parts.indexOf('tickets') + 1];
      const tkt = currentState.tickets.find(t => t.id === id);
      if (tkt) {
        if (!tkt.messages) tkt.messages = [];
        const newMsg = {
          id: 'msg-' + Date.now(),
          sender: body.sender || 'client',
          text: body.text || '',
          timestamp: new Date().toISOString()
        };
        tkt.messages.push(newMsg);
        responseData = { success: true, message: newMsg };
      }
    } else if (url.includes('/api/tickets') && url.includes('/checkin')) {
      const parts = url.split('/');
      const id = parts[parts.indexOf('tickets') + 1];
      const tkt = currentState.tickets.find(t => t.id === id);
      if (tkt) {
        tkt.checkedIn = true;
        tkt.checkedInAt = new Date().toISOString();
      }
    } else if (url.includes('/api/tickets/reset')) {
      currentState.tickets = [];
    } else if (url.includes('/api/tickets')) {
      if (method === 'POST') {
        const numVal = currentState.tickets.length + 1;
        const numberStr = `#${String(numVal).padStart(3, '0')}`;
        const newTicket: any = {
          id: 'tkt-' + Date.now(),
          number: numberStr,
          name: body.name || 'Cliente',
          adultsCount: body.adultsCount || 1,
          kidsCount: body.kidsCount || 0,
          serviceId: body.serviceId || '',
          serviceName: currentState.services.find(s => s.id === body.serviceId)?.name || 'Serviço',
          barberId: body.preferredBarberId || '',
          barberName: currentState.barbers.find(b => b.id === body.preferredBarberId)?.name || 'Qualquer Barbeiro',
          status: 'AGUARDANDO',
          createdAt: new Date().toISOString(),
          price: body.price || 35.0,
          estimatedTime: body.estimatedTime || 30,
          accepted_terms: body.acceptedTerms ? true : false,
          latitude: body.latitude || null,
          longitude: body.longitude || null,
          distanceToSalon: body.distanceToSalon || null,
          checkedIn: false
        };
        currentState.tickets.push(newTicket);
        responseData = { success: true, ticket: newTicket };
      }
    } else if (url.includes('/api/barbers')) {
      if (method === 'POST') {
        const existingIdx = currentState.barbers.findIndex(b => b.id === body.id);
        if (existingIdx >= 0) {
          currentState.barbers[existingIdx] = { ...currentState.barbers[existingIdx], ...body };
        } else {
          currentState.barbers.push({
            id: body.id || 'barber-' + Date.now(),
            name: body.name || 'Novo Barbeiro',
            active: body.active !== undefined ? !!body.active : true
          });
        }
      } else if (method === 'DELETE' && url.match(/\/barbers\/[^\/]+$/)) {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        currentState.barbers = currentState.barbers.filter(b => b.id !== id);
      }
    } else if (url.includes('/api/services')) {
      if (method === 'POST') {
        const existingIdx = currentState.services.findIndex(s => s.id === body.id);
        if (existingIdx >= 0) {
          currentState.services[existingIdx] = { ...currentState.services[existingIdx], ...body };
        } else {
          currentState.services.push({
            id: body.id || 'srv-' + Date.now(),
            name: body.name || 'Novo Serviço',
            price: Number(body.price) || 35.0,
            duration: Number(body.duration) || 30,
            type: body.type || 'adult'
          });
        }
      } else if (method === 'DELETE' && url.match(/\/services\/[^\/]+$/)) {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        currentState.services = currentState.services.filter(s => s.id !== id);
      }
    } else if (url.includes('/api/settings')) {
      currentState.settings = { ...currentState.settings, ...body };
    } else if (url.includes('/api/master/login')) {
      responseData = { success: true, token: 'mock-master-token' };
    } else if (url.includes('/api/license/validate')) {
      responseData = { success: true, valid: true };
    }

    // Save back to localStorage and update state
    localStorage.setItem('cached_app_state', JSON.stringify(currentState));
    setLocalDbState(currentState);
    
    // Sincronizar o estado visual imediatamente
    setSyncState(currentState);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  // Shadow global fetch to automatically inject active tenant shopId parameters
  const fetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    const urlString = url.toString();
    
    // Override with simulated offline response if in offline fallback mode
    if (isOfflineMode && urlString.startsWith('/api/')) {
      return handleLocalMockApi(urlString, options);
    }

    if (urlString.startsWith('/api/')) {
      const activeShop = getActiveShopId();
      const separator = urlString.includes('?') ? '&' : '?';
      const finalUrl = `${urlString}${separator}shopId=${activeShop}`;
      
      try {
        // Run with a 10.0s timeout to tolerate cold starts
        const response = await fetchWithTimeout(finalUrl, { ...options, timeout: 10000 });
        if (!response.ok && urlString.includes('/api/state')) {
          console.warn("⚠️ API state request failed, falling back to LocalStorage.");
          setIsOfflineMode(true);
          return handleLocalMockApi(urlString, options);
        }
        return response;
      } catch (err) {
        console.warn("⚠️ Fetch to backend timed out or failed. Falling back to LocalStorage DB.", err);
        setIsOfflineMode(true);
        return handleLocalMockApi(urlString, options);
      }
    }
    return window.fetch(url, options);
  };

  // Check if opening the TV Monitor view
  const [isTvView, setIsTvView] = useState<boolean>(() => {
    return new URLSearchParams(window.location.search).get('view') === 'tv';
  });

  // Navigation: 'client' | 'barber' | 'master'
  const [currentNamespace, setCurrentNamespace] = useState<'client' | 'barber' | 'master'>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') || params.get('role') || params.get('pane') || params.get('access');
    if (!viewParam) return 'client';
    
    const viewLower = viewParam.toLowerCase();
    if (['master', 'licenciamento', 'license', 'licenca', 'admin-master', 'mestre'].includes(viewLower)) {
      return 'master';
    }
    if (['barber', 'barbeiro', 'painel', 'painel-barbeiro', 'admin'].includes(viewLower)) {
      return 'barber';
    }
    return 'client';
  });
  const [language, setLanguage] = useState<'pt-BR' | 'en-GB'>('pt-BR');
  const t = translations[language];

  // Global Syncing state
  const [syncState, setSyncState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client Specific State
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [clientScreen, setClientScreen] = useState<'welcome' | 'create' | 'tracking'>('welcome');
  const [clientName, setClientName] = useState<string>('');
  const [adultsCount, setAdultsCount] = useState<number>(1);
  const [kidsCount, setKidsCount] = useState<number>(0);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedAdultServices, setSelectedAdultServices] = useState<string[]>([]);
  const [selectedKidsServices, setSelectedKidsServices] = useState<string[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(() => {
    return localStorage.getItem('barber_active_ticket_id') || null;
  });
  const [isConfirmingCancel, setIsConfirmingCancel] = useState<boolean>(false);
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
  const [stripeTicketData, setStripeTicketData] = useState<any | null>(null);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [termsChecked, setTermsChecked] = useState<boolean>(false);
  const [confirmNoShow, setConfirmNoShow] = useState<boolean>(false);

  // States for next-in-line timestamp and chat messaging
  const [nextInLineTime, setNextInLineTime] = useState<number | null>(() => {
    const stored = localStorage.getItem('next_in_line_timestamp');
    return stored ? parseInt(stored, 10) : null;
  });
  const [clientMessageInput, setClientMessageInput] = useState<string>('');
  const [callAcknowledged, setCallAcknowledged] = useState<boolean>(() => {
    const activeId = localStorage.getItem('barber_active_ticket_id') || null;
    if (!activeId) return false;
    return localStorage.getItem(`call_ack_${activeId}`) === 'true';
  });

  useEffect(() => {
    if (activeTicketId) {
      const isAck = localStorage.getItem(`call_ack_${activeTicketId}`) === 'true';
      setCallAcknowledged(isAck);
    } else {
      setCallAcknowledged(false);
    }
  }, [activeTicketId]);
  const [showClientChat, setShowClientChat] = useState<boolean>(false);
  const [activeChatTicketId, setActiveChatTicketId] = useState<string | null>(null);
  const [barberMessageInput, setBarberMessageInput] = useState<string>('');

  // Handle Stripe redirect URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('payment_success');
    const ticketId = params.get('ticket_id');
    const cancel = params.get('payment_cancel');

    if (success === 'true' && ticketId) {
      setActiveTicketId(ticketId);
      localStorage.setItem('barber_active_ticket_id', ticketId);
      setClientScreen('tracking');
      
      // Clean query parameters from URL using history representation
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (cancel === 'true') {
      alert(language === 'pt-BR'
        ? 'Pagamento cancelado ou não concluído. Seu agendamento não foi gerado.'
        : 'Payment canceled or incomplete. Your assignment was not created.');
      
      // Clean query parameters
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [language]);

  // Resize selected adult services array when adultsCount changes
  useEffect(() => {
    if (!syncState) return;
    const defaultSvc = syncState.services.find(s => s.type === 'adult') || syncState.services[0];
    const defaultId = defaultSvc ? defaultSvc.id : '';
    setSelectedAdultServices(prev => {
      const next = [...prev];
      if (next.length < adultsCount) {
        while (next.length < adultsCount) {
          next.push(defaultId);
        }
      } else if (next.length > adultsCount) {
        return next.slice(0, adultsCount);
      }
      return next;
    });
  }, [adultsCount, syncState]);

  // Resize selected kids services array when kidsCount changes
  useEffect(() => {
    if (!syncState) return;
    const defaultSvc = syncState.services.find(s => s.type === 'kids') || syncState.services[0];
    const defaultId = defaultSvc ? defaultSvc.id : '';
    setSelectedKidsServices(prev => {
      const next = [...prev];
      if (next.length < kidsCount) {
        while (next.length < kidsCount) {
          next.push(defaultId);
        }
      } else if (next.length > kidsCount) {
        return next.slice(0, kidsCount);
      }
      return next;
    });
  }, [kidsCount, syncState]);

  // PWA Install Prompt events
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSHint, setShowIOSHint] = useState<boolean>(false);
  const [showPwaHelpModal, setShowPwaHelpModal] = useState<boolean>(false);
  const [pwaActiveTab, setPwaActiveTab] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    // Listen for Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect if iOS (iPhone/iPad)
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if not already running standalone as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    setIsIOS(isIosDevice);
    setPwaActiveTab(isIosDevice ? 'ios' : 'android');
    if (isIosDevice && !isStandalone) {
      setShowInstallBtn(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (isIOS) {
      setShowPwaHelpModal(true);
      return;
    }
    if (!deferredPrompt) {
      setShowPwaHelpModal(true);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // State ticker to force re-render every 10 seconds so dynamic wait times update live
  const [ticker, setTicker] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Barber Specific State
  const [barberScreen, setBarberScreen] = useState<'login' | 'dashboard' | 'settings'>('login');
  const [monthlyCodeInput, setMonthlyCodeInput] = useState<string>('');
  const [licensingMonth, setLicensingMonth] = useState<number>(() => {
    return new Date().getMonth() + 1;
  });
  const [licensingYear, setLicensingYear] = useState<number>(() => {
    return new Date().getFullYear();
  });
  const [isAuthenticatedBarber, setIsAuthenticatedBarber] = useState<boolean>(() => {
    return localStorage.getItem('barber_is_auth') === 'true';
  });
  const [selectedDashboardBarberId, setSelectedDashboardBarberId] = useState<string>('');
  const [showFaturamento, setShowFaturamento] = useState<boolean>(false);

  // Settings local additions (temporary before clicking SAVE ALL)
  const [settingsForm, setSettingsForm] = useState<BarbershopSettings | null>(null);
  const [localBarbers, setLocalBarbers] = useState<Barber[]>([]);
  const [localServices, setLocalServices] = useState<Service[]>([]);
  const [newBarberName, setNewBarberName] = useState<string>('');
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServicePrice, setNewServicePrice] = useState<string>('');
  const [newServiceDuration, setNewServiceDuration] = useState<string>('');
  const [newServiceType, setNewServiceType] = useState<'adult' | 'kids'>('adult');

  // Master Specific State
  const [masterScreen, setMasterScreen] = useState<'login' | 'setup' | 'forgot_password' | 'reset_password' | 'dashboard'>(() => {
    return localStorage.getItem('master_is_auth') === 'true' ? 'dashboard' : 'login';
  });
  const [masterUsernameInput, setMasterUsernameInput] = useState<string>('');
  const [masterPasswordInput, setMasterPasswordInput] = useState<string>('');
  const [masterEmailInput, setMasterEmailInput] = useState<string>('');
  const [masterNewPasswordInput, setMasterNewPasswordInput] = useState<string>('');
  const [masterNewPasswordConfirmInput, setMasterNewPasswordConfirmInput] = useState<string>('');
  const [masterForgotPasswordEmailInput, setMasterForgotPasswordEmailInput] = useState<string>('');
  const [simulatedResetLink, setSimulatedResetLink] = useState<string | null>(null);
  const [resetTokenFromUrl, setResetTokenFromUrl] = useState<string | null>(null);

  const [isAuthenticatedMaster, setIsAuthenticatedMaster] = useState<boolean>(() => {
    return localStorage.getItem('master_is_auth') === 'true';
  });
  const [licenses, setLicenses] = useState<Array<{ monthLabel: string; code: string; isCurrent: boolean }>>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showAllLicensesList, setShowAllLicensesList] = useState<boolean>(false);
  const [revealedLicenses, setRevealedLicenses] = useState<Record<number, boolean>>({});
  const [isResetConfirming, setIsResetConfirming] = useState<boolean>(false);
  
  // Real-time trial system state hooks for master dashboard
  const [masterTrialEnabled, setMasterTrialEnabled] = useState<boolean>(false);
  const [masterTrialStartDate, setMasterTrialStartDate] = useState<string>('');
  const [masterTrialDuration, setMasterTrialDuration] = useState<number>(7);
  const [masterTrialPassword, setMasterTrialPassword] = useState<string>('TESTE123');
  const [showTrialSettings, setShowTrialSettings] = useState<boolean>(false);
  const [selectedTrialShopId, setSelectedTrialShopId] = useState<string>('default');
  const hasInitializedMasterSettings = useRef(false);

  // States for changing Master credentials
  const [showMasterCredsForm, setShowMasterCredsForm] = useState<boolean>(false);
  const [masterNewEmail, setMasterNewEmail] = useState<string>('');
  const [masterNewPassword, setMasterNewPassword] = useState<string>('');
  const [masterNewPasswordConfirm, setMasterNewPasswordConfirm] = useState<string>('');
  const [masterCredsMsg, setMasterCredsMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // SaaS Tenant Multi-Tenant State Configuration
  const [masterTab, setMasterTab] = useState<'licenses' | 'tenants'>('licenses');
  const [superShops, setSuperShops] = useState<Array<{ 
    id: string; 
    name: string; 
    active: boolean; 
    createdAt: string; 
    barbersCount: number; 
    ticketsCount: number; 
    servicesCount: number; 
    customDomain?: string; 
    monthlyLicenseKeys?: Record<string, string>;
    systemTestEnabled?: boolean;
    systemTestStartDate?: string;
    systemTestDurationDays?: number;
    systemTestPassword?: string;
  }>>([]);
  const [newShopId, setNewShopId] = useState<string>('');
  const [newShopName, setNewShopName] = useState<string>('');
  const [superMsg, setSuperMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Synchronize trial states when selected trial shop changes
  useEffect(() => {
    if (selectedTrialShopId) {
      const shop = superShops.find(s => s.id === selectedTrialShopId);
      if (shop) {
        setMasterTrialEnabled(shop.systemTestEnabled ?? false);
        setMasterTrialStartDate(shop.systemTestStartDate ?? '');
        setMasterTrialDuration(shop.systemTestDurationDays ?? 7);
        setMasterTrialPassword(shop.systemTestPassword ?? 'TESTE123');
      } else if (selectedTrialShopId === 'default' && syncState?.settings) {
        setMasterTrialEnabled(syncState.settings.systemTestEnabled ?? false);
        setMasterTrialStartDate(syncState.settings.systemTestStartDate ?? '');
        setMasterTrialDuration(syncState.settings.systemTestDurationDays ?? 7);
        setMasterTrialPassword(syncState.settings.systemTestPassword ?? 'TESTE123');
      }
    }
  }, [selectedTrialShopId, superShops, syncState]);

  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [editingCustomDomain, setEditingCustomDomain] = useState<string>('');
  const [editingTrialEnabled, setEditingTrialEnabled] = useState<boolean>(false);
  const [editingTrialStartDate, setEditingTrialStartDate] = useState<string>('');
  const [editingTrialDuration, setEditingTrialDuration] = useState<number>(7);
  const [editingTrialPassword, setEditingTrialPassword] = useState<string>('TESTE123');
  const [expandedKeysShopId, setExpandedKeysShopId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchShops = async () => {
    try {
      const res = await window.fetch('/api/super/shops');
      const data = await res.json();
      if (data.success) {
        setSuperShops(data.shops || []);
      }
    } catch (err) {
      console.error("Erro ao carregar barbearias SaaS:", err);
    }
  };

  const handleCreateShop = async () => {
    setSuperMsg(null);
    if (!newShopId.trim() || !newShopName.trim()) {
      setSuperMsg({ type: 'error', text: 'Preencha o identificador (slug) e o nome.' });
      return;
    }
    const cleanId = newShopId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanId) {
      setSuperMsg({ type: 'error', text: 'Identificador inválido.' });
      return;
    }
    try {
      const res = await window.fetch('/api/super/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanId, name: newShopName })
      });
      const data = await res.json();
      if (data.success) {
        setSuperMsg({ type: 'success', text: `Barbearia "${newShopName}" cadastrada com sucesso!` });
        setNewShopId('');
        setNewShopName('');
        fetchShops();
      } else {
        setSuperMsg({ type: 'error', text: data.error || 'Erro ao cadastrar barbearia.' });
      }
    } catch (err) {
      console.error("Erro handleCreateShop:", err);
      setSuperMsg({ type: 'error', text: 'Erro de conexão com o servidor.' });
    }
  };

  const handleToggleShopActive = async (id: string, currentActive: boolean) => {
    setSuperMsg(null);
    try {
      const res = await window.fetch(`/api/super/shops/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive })
      });
      const data = await res.json();
      if (data.success) {
        fetchShops();
      } else {
        setSuperMsg({ type: 'error', text: data.error || 'Erro ao alterar status.' });
      }
    } catch (err) {
      console.error("Erro handleToggleShopActive:", err);
      setSuperMsg({ type: 'error', text: 'Erro de conexão.' });
    }
  };

  const handleDeleteShop = async (id: string, name: string) => {
    if (id === 'matriz' || id === 'default') {
      alert("A barbearia matriz original não pode ser deletada.");
      return;
    }
    const confirmed = window.confirm(`Atenção! Tem certeza de que deseja DELETAR permanentemente a barbearia "${name}"? Todos os atendimentos, barbeiros e dados de configurações dela serão excluídos!`);
    if (!confirmed) return;

    setSuperMsg(null);
    try {
      const res = await window.fetch(`/api/super/shops/${id}/delete`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setSuperMsg({ type: 'success', text: `Barbearia "${name}" excluída com sucesso!` });
        fetchShops();
      } else {
        setSuperMsg({ type: 'error', text: data.error || 'Erro ao deletar barbearia.' });
      }
    } catch (err) {
      setSuperMsg({ type: 'error', text: 'Erro de conexão com o servidor.' });
    }
  };

  const handleUpdateShop = async (
    id: string, 
    name: string, 
    customDomain: string,
    trialEnabled?: boolean,
    trialStartDate?: string,
    trialDurationDays?: number,
    trialPassword?: string
  ) => {
    setSuperMsg(null);
    try {
      const res = await window.fetch(`/api/super/shops/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name.trim(), 
          customDomain: customDomain ? customDomain.trim().toLowerCase() : null,
          systemTestEnabled: trialEnabled,
          systemTestStartDate: trialStartDate,
          systemTestDurationDays: trialDurationDays,
          systemTestPassword: trialPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuperMsg({ type: 'success', text: `Dados da barbearia atualizados com sucesso!` });
        alert(`Sucesso: Os dados da barbearia "${name}" (incluindo domínio e período de teste) foram salvos com sucesso!`);
        setEditingShopId(null);
        fetchShops();
      } else {
        setSuperMsg({ type: 'error', text: data.error || 'Erro ao atualizar dados.' });
        alert(`Erro ao atualizar: ${data.error || 'Erro desconhecido.'}`);
      }
    } catch (err) {
      setSuperMsg({ type: 'error', text: 'Erro de conexão com o servidor.' });
      alert('Erro de conexão ao salvar os dados no servidor.');
    }
  };

  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [newlyCalledTicket, setNewlyCalledTicket] = useState<QueueTicket | null>(null);
  const [adminAnnouncementSeconds, setAdminAnnouncementSeconds] = useState<number>(5);
  const [adminAnnouncementProgress, setAdminAnnouncementProgress] = useState<number>(100);

  // Automatic timer to dismiss Newly Called Ticket modal on the Admin panel
  useEffect(() => {
    if (newlyCalledTicket) {
      const totalSeconds = syncState?.settings.announcementDuration ?? 5;
      setAdminAnnouncementSeconds(totalSeconds);
      setAdminAnnouncementProgress(100);

      const startTime = Date.now();
      const endTime = startTime + (totalSeconds * 1000);

      const interval = setInterval(() => {
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) {
          setNewlyCalledTicket(null);
          clearInterval(interval);
        } else {
          setAdminAnnouncementSeconds(Math.ceil(diff / 1000));
          setAdminAnnouncementProgress(Math.max(0, (diff / (totalSeconds * 1000)) * 100));
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [newlyCalledTicket, syncState?.settings.announcementDuration]);

  // Refs to prevent state capture in fetchState background polling (stale closures)
  const selectedBarberIdRef = useRef(selectedBarberId);
  const selectedDashboardBarberIdRef = useRef(selectedDashboardBarberId);
  const settingsFormRef = useRef(settingsForm);
  const barberScreenRef = useRef(barberScreen);
  const selectedServiceIdRef = useRef(selectedServiceId);
  const selectedAdultServicesRef = useRef(selectedAdultServices);
  const selectedKidsServicesRef = useRef(selectedKidsServices);

  useEffect(() => {
    selectedBarberIdRef.current = selectedBarberId;
  }, [selectedBarberId]);

  useEffect(() => {
    selectedDashboardBarberIdRef.current = selectedDashboardBarberId;
  }, [selectedDashboardBarberId]);

  useEffect(() => {
    settingsFormRef.current = settingsForm;
  }, [settingsForm]);

  useEffect(() => {
    barberScreenRef.current = barberScreen;
  }, [barberScreen]);

  useEffect(() => {
    selectedServiceIdRef.current = selectedServiceId;
  }, [selectedServiceId]);

  useEffect(() => {
    selectedAdultServicesRef.current = selectedAdultServices;
  }, [selectedAdultServices]);

  useEffect(() => {
    selectedKidsServicesRef.current = selectedKidsServices;
  }, [selectedKidsServices]);

  // Synchronize master trial states on server update
  useEffect(() => {
    if (syncState?.settings && !hasInitializedMasterSettings.current) {
      setMasterTrialEnabled(syncState.settings.systemTestEnabled ?? false);
      setMasterTrialStartDate(syncState.settings.systemTestStartDate ?? '');
      setMasterTrialDuration(syncState.settings.systemTestDurationDays ?? 7);
      setMasterTrialPassword(syncState.settings.systemTestPassword ?? 'TESTE123');
      hasInitializedMasterSettings.current = true;
    }
  }, [syncState]);

  // Monitor Trial expiry and enforce dynamic logout lockouts
  useEffect(() => {
    if (isAuthenticatedBarber && syncState?.settings) {
      const loginCodeUpper = (localStorage.getItem('barber_login_code') || '').trim().toUpperCase();
      const testPasswordUpper = (syncState.settings.systemTestPassword || 'TESTE123').trim().toUpperCase();

      if (loginCodeUpper === testPasswordUpper) {
        // Logged in with a trial code! Validate trial sanity now
        const trialObj = getTrialState(
          syncState.settings.systemTestEnabled,
          syncState.settings.systemTestStartDate,
          syncState.settings.systemTestDurationDays
        );

        if (!syncState.settings.systemTestEnabled) {
          alert('🚫 Período de teste grátis desativado pela administração! Painel bloqueado. Digite a senha mensal corrente.');
          setIsAuthenticatedBarber(false);
          localStorage.removeItem('barber_is_auth');
          localStorage.removeItem('barber_login_code');
          setBarberScreen('login');
        } else if (trialObj.isExpired) {
          alert('🚨 Seu período de teste grátis expirou! O painel administrativo do barbeiro foi bloqueado de forma definitiva.\n\nPor favor, digite a senha correspondente ao mês corrente para continuar utilizando o sistema.');
          setIsAuthenticatedBarber(false);
          localStorage.removeItem('barber_is_auth');
          localStorage.removeItem('barber_login_code');
          setBarberScreen('login');
        }
      }
    }
  }, [isAuthenticatedBarber, syncState]);

  const getLocalCodeForDate = (date: Date) => {
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return `CORTE${m.toString().padStart(2, '0')}${y.toString().slice(-2)}${m % 10}`;
  };

  const getTrialState = (enabled: boolean | undefined, startDateStr: string | undefined, durationDays: number | undefined) => {
    if (!enabled || !startDateStr || !durationDays) {
      return { isActive: false, isWarningDay: false, isExpired: false, daysRemaining: 0 };
    }

    const parts = startDateStr.split('-');
    if (parts.length !== 3) {
      return { isActive: false, isWarningDay: false, isExpired: false, daysRemaining: 0 };
    }
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const startDate = new Date(year, month, day, 0, 0, 0, 0);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    const diffTime = today.getTime() - startDate.getTime();
    const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (elapsedDays < 0) {
      return { isActive: false, isWarningDay: false, isExpired: false, daysRemaining: 0 };
    }
    
    const remaining = durationDays - elapsedDays;
    
    if (remaining > 0) {
      return {
        isActive: true,
        isWarningDay: false,
        isExpired: false,
        daysRemaining: remaining
      };
    } else if (remaining === 0) {
      return {
        isActive: false,
        isWarningDay: true,
        isExpired: false,
        daysRemaining: 0
      };
    } else {
      return {
        isActive: false,
        isWarningDay: false,
        isExpired: true,
        daysRemaining: 0
      };
    }
  };

  // Fetch full state from server
  const fetchState = async () => {
    try {
      const response = await fetch('/api/state');
      if (!response.ok) throw new Error('Falha ao conectar com o servidor');
      const data: AppState = await response.json();
      setSyncState(data);
      
      // Auto select barber if none selected or if current selection is no longer valid
      if (data.barbers.length > 0) {
        const currentSelectedId = selectedBarberIdRef.current;
        const currentSelectedDashboardId = selectedDashboardBarberIdRef.current;

        const barberExists = data.barbers.some(b => b.id === currentSelectedId);
        if (!currentSelectedId || !barberExists) {
          setSelectedBarberId(data.barbers[0].id);
        }

        const dashboardBarberExists = data.barbers.some(b => b.id === currentSelectedDashboardId);
        if (!currentSelectedDashboardId || !dashboardBarberExists) {
          setSelectedDashboardBarberId(data.barbers[0].id);
        }
      }
      
      // Sync form fields if first load or when not actively editing settings
      if (!settingsFormRef.current || barberScreenRef.current !== 'settings') {
        setSettingsForm(data.settings);
      }
      setLocalBarbers(data.barbers);
      setLocalServices(data.services);
      if (data.services.length > 0) {
        const currentSelectedServiceId = selectedServiceIdRef.current;
        const serviceExists = data.services.some(s => s.id === currentSelectedServiceId);
        if (!currentSelectedServiceId || !serviceExists) {
          setSelectedServiceId(data.services[0].id);
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro de conexão Wi-Fi/4G. Tentando reconectar...');
      setLoading(false);
    }
  };

  const handleToggleOnlineOffline = async () => {
    if (!syncState) return;
    const currentOnline = syncState.settings.isOnline !== false;
    const updatedSettings = { ...syncState.settings, isOnline: !currentOnline };
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (response.ok) {
        await fetchState();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Erro ao alterar estado da loja');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao alterar estado da loja');
    }
  };

  // Poll state every 2.5 seconds
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2500);
    return () => clearInterval(interval);
  }, []);

  // Check for recovery token on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetTokenFromUrl(token);
      setCurrentNamespace('master');
      setMasterScreen('reset_password');
    }
  }, []);

  // Sync active tracking screen with state
  useEffect(() => {
    if (activeTicketId && syncState) {
      const myTicket = syncState.tickets.find(t => t.id === activeTicketId);
      if (myTicket) {
        setClientScreen('tracking');
      } else {
        // If my ticket was reset/purged on server side
        setActiveTicketId(null);
        localStorage.removeItem('barber_active_ticket_id');
        setClientScreen('welcome');
      }
    }
  }, [activeTicketId, syncState]);

  // Reset confirmation state when leaving or changing screen
  useEffect(() => {
    setIsConfirmingCancel(false);
  }, [clientScreen]);

  // Keep selectedBarberId synced to an active barber if the current one goes OFFLINE (OFF)
  useEffect(() => {
    if (syncState && syncState.barbers.length > 0) {
      const activeBarbers = syncState.barbers.filter(b => b.active);
      if (activeBarbers.length > 0) {
        const currentIsActive = activeBarbers.some(b => b.id === selectedBarberId);
        if (!currentIsActive) {
          setSelectedBarberId(activeBarbers[0].id);
        }
      }
    }
  }, [syncState, selectedBarberId]);

  // Custom double beep chime for new chat messages
  const playChatBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      const frequencies = [880, 1046.5];
      frequencies.forEach((freq, idx) => {
        const start = now + idx * 0.12;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + 0.11);
      });
    } catch (e) {
      console.warn('Som de chat bloqueado:', e);
    }
  };

  // Chat beep alerts for the Barber Panel when in ?view=barber or similar
  const prevClientMsgsHashRef = useRef<string>('');
  useEffect(() => {
    if (currentNamespace !== 'barber' || !syncState?.tickets) return;

    // Get all chat messages of clients for active tickets of the selected dashboard barber
    const activeTkts = syncState.tickets.filter(
      t => t.barberId === selectedDashboardBarberId && isToday(t.createdAt)
    );

    // Create a serialized signature of all client messages to check if there are any new ones
    let clientMsgsSig = '';
    activeTkts.forEach(t => {
      if (t.messages) {
        t.messages.forEach(m => {
          if (m.sender === 'client') {
            clientMsgsSig += `${t.id}_${m.timestamp || ''}_${m.text}|`;
          }
        });
      }
    });

    if (prevClientMsgsHashRef.current !== '') {
      // Check if we have a message that is new
      if (clientMsgsSig !== prevClientMsgsHashRef.current && clientMsgsSig.length > prevClientMsgsHashRef.current.length) {
        // Play the custom double beep chat sound
        playChatBeep();
      }
    }
    prevClientMsgsHashRef.current = clientMsgsSig;
  }, [syncState?.tickets, selectedDashboardBarberId, currentNamespace]);

  // Request browser notification permissions on the tracking screen
  useEffect(() => {
    if (clientScreen === 'tracking' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [clientScreen]);

  // Voice announcement, browser notifications, vibrations and custom beep alerts (client panel only)
  useEffect(() => {
    if (currentNamespace !== 'client') return; // strictly disable client-alerts sounds from polluting barber/TV views
    if (!activeTicketId || !syncState) return;
    const myTicket = syncState.tickets.find(t => t.id === activeTicketId);
    if (!myTicket) return;

    // Helper to speak localized phrases
    const speakAlert = (text: string) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'pt-BR' ? 'pt-BR' : 'en-GB';
        utterance.rate = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(language === 'pt-BR' ? 'pt' : 'en'));
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      }
    };

    // Helper for synth pager beeper sounds
    const playPagerBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = audioCtx.currentTime;
        for (let i = 0; i < 2; i++) {
          const start = now + i * 0.4;
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1250, start);
          gainNode.gain.setValueAtTime(0, start);
          gainNode.gain.linearRampToValueAtTime(0.25, start + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.start(start);
          osc.stop(start + 0.3);
        }
      } catch (e) {
        console.warn('Audio feedback blocked by mobile browser interaction rules.', e);
      }
    };

    // Helper to perform browser system notification and hardware vibration
    const triggerSystemAlert = (title: string, body: string, vibrate = false) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            vibrate: vibrate ? [300, 150, 300, 150, 300] : undefined
          } as any);
        } catch (e) {
          console.warn('Browser background Notification failed:', e);
        }
      }
      if (vibrate && 'vibrate' in navigator) {
        try {
          navigator.vibrate([300, 150, 300, 150, 300]);
        } catch (e) {
          console.warn('Vibration blocked by browser rules:', e);
        }
      }
    };

    if (myTicket.status === 'AGUARDANDO') {
      const queue = syncState.tickets
        .filter(t => t.barberId === myTicket.barberId && (t.status === 'AGUARDANDO' || t.status === 'EM_ATENDIMENTO' || t.status === 'CHAMADO'))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const index = queue.findIndex(t => t.id === activeTicketId);
      
      if (index === 2) {
        const flagKey = `alert2_${activeTicketId}`;
        if (localStorage.getItem(flagKey) !== 'true') {
          playPagerBeep();
          const pPhrase = language === 'pt-BR' 
            ? `Atenção ${myTicket.name.split(' ')[0]}: restam apenas duas pessoas à sua frente para o barbeiro ${myTicket.barberName}!` 
            : `Attention ${myTicket.name.split(' ')[0]}: only two people left ahead of you for barber ${myTicket.barberName}!`;
          speakAlert(pPhrase);
          triggerSystemAlert(
            language === 'pt-BR' ? '🚨 Restam 2 Senhas!' : '🚨 2 Slots Left!',
            language === 'pt-BR' 
              ? `Faltam apenas 2 pessoas à sua frente para o barbeiro ${myTicket.barberName}.` 
              : `Only 2 people left in front of you for barber ${myTicket.barberName}.`,
            false
          );
          localStorage.setItem(flagKey, 'true');
        }
      } else if (index === 1) {
        const flagKey = `alert1_${activeTicketId}`;
        if (localStorage.getItem(flagKey) !== 'true') {
          playPagerBeep();
          const pPhrase = language === 'pt-BR' 
            ? `Prepare-se ${myTicket.name.split(' ')[0]}: resta apenas uma pessoa à sua frente para o barbeiro ${myTicket.barberName}!`
            : `Prepare yourself ${myTicket.name.split(' ')[0]}: only one person left ahead of you for barber ${myTicket.barberName}!`;
          speakAlert(pPhrase);
          triggerSystemAlert(
            language === 'pt-BR' ? '⚠️ Resta 1 Senha!' : '⚠️ Last Slot Ahead!',
            language === 'pt-BR' 
              ? `Falta apenas 1 pessoa à sua frente para o barbeiro ${myTicket.barberName}. Prepare-se!` 
              : `Only 1 person left ahead of you for barber ${myTicket.barberName}. Prepare yourself!`,
            false
          );
          localStorage.setItem(flagKey, 'true');
        }
      }
    } else if (myTicket.status === 'EM_ATENDIMENTO' || myTicket.status === 'CHAMADO') {
      const flagKey = `alert_turn_${activeTicketId}`;
      if (localStorage.getItem(flagKey) !== 'true') {
        const pPhrase = language === 'pt-BR'
          ? `Sua vez chegou, ${myTicket.name.split(' ')[0]}! Por favor dirija-se à cadeira do barbeiro ${myTicket.barberName}.`
          : `It is your turn, ${myTicket.name.split(' ')[0]}! Please proceed to barber ${myTicket.barberName}'s customer chair.`;
        
        speakAlert(pPhrase);
        setTimeout(() => speakAlert(pPhrase), 5000); // repeat callback
        triggerSystemAlert(
          language === 'pt-BR' ? '🎉 SUA VEZ CHEGOU!' : '🎉 IT IS YOUR TURN!',
          language === 'pt-BR' 
            ? `Por favor, dirija-se à cadeira do barbeiro ${myTicket.barberName}!` 
            : `Please proceed to barber ${myTicket.barberName}'s chair now!`,
          true // VIBRATE DEVICE!
        );
        localStorage.setItem(flagKey, 'true');
      }

      // Repeated alarm loop until callAcknowledged is true
      if (!callAcknowledged) {
        playPagerBeep();
        const alarmInterval = setInterval(() => {
          playPagerBeep();
          if ('vibrate' in navigator) {
            try {
              navigator.vibrate([350, 150, 350]);
            } catch (err) {
              console.warn('Vibration blocked:', err);
            }
          }
          triggerSystemAlert(
            language === 'pt-BR' ? '🚨 SUA VEZ CHEGOU! 🚨' : '🚨 IT IS YOUR TURN! 🚨',
            language === 'pt-BR'
              ? `Dirija-se imediatamente à cadeira do barbeiro ${myTicket.barberName}!`
              : `Proceed immediately to barber ${myTicket.barberName}'s chair!`,
            true
          );
        }, 2200);

        return () => clearInterval(alarmInterval);
      }
    }
  }, [activeTicketId, syncState, language, currentNamespace, callAcknowledged]);

  // Handle Client Request Ticket (Save)
  const handleRequestTicket = async () => {
    if (!clientName.trim()) {
      alert(language === 'pt-BR' ? 'Por favor, digite seu nome.' : 'Please enter your name.');
      return;
    }

    if (adultsCount === 0 && kidsCount === 0) {
      alert(language === 'pt-BR' 
        ? 'Por favor, selecione pelo menos 1 pessoa (Adulto ou Criança).' 
        : 'Please select at least 1 person (Adult or Child).');
      return;
    }

    if (!selectedBarberId) {
      alert(language === 'pt-BR' 
        ? 'Por favor, selecione o barbeiro de preferência.' 
        : 'Please select your preferred barber.');
      return;
    }

    if (adultsCount > 0) {
      for (let i = 0; i < adultsCount; i++) {
        if (!selectedAdultServices[i]) {
          alert(language === 'pt-BR' 
            ? 'Por favor, selecione o serviço para todos os adultos.' 
            : 'Please select a service for all adults.');
          return;
        }
      }
    }

    if (kidsCount > 0) {
      for (let i = 0; i < kidsCount; i++) {
        if (!selectedKidsServices[i]) {
          alert(language === 'pt-BR' 
            ? 'Por favor, selecione o serviço para todas as crianças.' 
            : 'Please select a service for all children.');
          return;
        }
      }
    }

    const isOnlinePaymentEnabled = !!((syncState?.settings?.stripePublishableKey && syncState.settings.stripePublishableKey.trim() !== '') || (syncState?.settings?.stripeSecretKey && syncState.settings.stripeSecretKey.trim() !== ''));

    if (isOnlinePaymentEnabled) {
      try {
        const payRes = await fetch('/api/payment/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: clientName,
            adultsCount,
            kidsCount,
            serviceId: selectedServiceId,
            barberId: selectedBarberId,
            selectedAdultServices,
            selectedKidsServices,
            accepted_terms: true
          })
        });

        if (!payRes.ok) {
          const errData = await payRes.json();
          throw new Error(errData.error || 'Erro ao inicializar pagamento');
        }

        const payData = await payRes.json();
        if (payData.success && payData.clientSecret) {
          setStripeClientSecret(payData.clientSecret);
          setStripePublishableKey(payData.publishableKey || syncState?.settings?.stripePublishableKey || '');
          setStripeTicketData(payData.ticketData);
          return;
        } else {
          throw new Error('Chave/Segredo de checkout inválido');
        }
      } catch (payErr: any) {
        alert(language === 'pt-BR' 
          ? `Erro de pagamento: ${payErr.message || 'Não foi possível iniciar o Stripe Checkout.'}` 
          : `Payment error: ${payErr.message || 'Could not start Stripe Checkout.'}`);
        return;
      }
    }

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName,
          adultsCount,
          kidsCount,
          serviceId: selectedServiceId,
          barberId: selectedBarberId,
          selectedAdultServices,
          selectedKidsServices,
          accepted_terms: true
        })
      });

      if (!res.ok) throw new Error('Erro ao gerar senha');
      const data = await res.json();
      
      if (data.success && data.ticket) {
        if (data.state) {
          setSyncState(data.state);
        }
        setActiveTicketId(data.ticket.id);
        localStorage.setItem('barber_active_ticket_id', data.ticket.id);
        setClientScreen('tracking');
        // Reset inputs
        setClientName('');
        setAdultsCount(1);
        setKidsCount(0);
      }
    } catch (err) {
      alert('Erro ao solicitar senha no servidor, verifique seu sinal Wi-Fi/4G.');
    }
  };

  // Handle Client Cancel Ticket
  const handleCancelTicket = async () => {
    if (!activeTicketId) return;

    try {
      const res = await fetch(`/api/tickets/${activeTicketId}/cancel`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setSyncState(data.state);
        }
        setActiveTicketId(null);
        localStorage.removeItem('barber_active_ticket_id');
        setClientScreen('welcome');
        setIsConfirmingCancel(false);
      }
    } catch (err) {
      alert(language === 'pt-BR' ? 'Erro ao cancelar senha.' : 'Error cancelling ticket.');
    }
  };

  // Handle Barber Login
  const handleBarberLogin = async () => {
    if (!monthlyCodeInput) {
      alert('Por favor, digite o código de acesso.');
      return;
    }

    const inputUpper = monthlyCodeInput.trim().toUpperCase();

    try {
      // 1. Validate on the server side (supports both monthly and trial code)
      const res = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: monthlyCodeInput,
          month: licensingMonth,
          year: licensingYear
        })
      });
      const data = await res.json();

      if (data.valid) {
        setIsAuthenticatedBarber(true);
        localStorage.setItem('barber_is_auth', 'true');
        localStorage.setItem('barber_login_code', inputUpper);
        setBarberScreen('dashboard');

        // Check if unlocked due to trial to alert the user
        const trialObj = getTrialState(
          syncState?.settings.systemTestEnabled,
          syncState?.settings.systemTestStartDate,
          syncState?.settings.systemTestDurationDays
        );
        const testPassword = (syncState?.settings.systemTestPassword || 'TESTE123').trim().toUpperCase();

        if (inputUpper === testPassword && syncState?.settings.systemTestEnabled) {
          if (trialObj.isWarningDay) {
            alert('⚠️ ATENÇÃO: Seu período de teste grátis expirou hoje! O painel será bloqueado amanhã de forma definitiva.');
          } else {
            alert(`Acesso de Teste Liberado! Restam ${trialObj.daysRemaining} dias de teste grátis.`);
          }
        }
      } else {
        alert('Código de acesso inválido ou expirado para este período. Verifique com a administração.');
      }
    } catch (err) {
      alert('Erro de conexão ao validar o código.');
    }
  };

  // Handle Doctor/Master Login
  const handleMasterLogin = async () => {
    if (!masterUsernameInput.trim() || !masterPasswordInput.trim()) {
      alert('Por favor, digite o usuário/e-mail mestre e a senha.');
      return;
    }
    try {
      const res = await fetch('/api/master/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: masterUsernameInput, password: masterPasswordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.isFirstAccessDone === false) {
          // Mandatory redirection for First Access Setup!
          setIsAuthenticatedMaster(false);
          setMasterScreen('setup');
          alert('Primeiro acesso detectado! Você deve obrigatoriamente cadastrar seu e-mail pessoal e uma nova senha definitiva.');
        } else {
          setIsAuthenticatedMaster(true);
          localStorage.setItem('master_is_auth', 'true');
          setMasterScreen('dashboard');
          fetchLicenses();
          fetchState();
        }
      } else {
        alert(data.error || 'Erro ao realizar login.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao servidor ao realizar login.');
    }
  };

  // Handle Master First Access Setup
  const handleMasterSetup = async () => {
    const emailStr = masterEmailInput.trim();
    const passStr = masterNewPasswordInput.trim();
    const passConfirmStr = masterNewPasswordConfirmInput.trim();

    if (!emailStr) {
      alert('Por favor, informe o seu e-mail pessoal.');
      return;
    }
    if (!passStr) {
      alert('Por favor, informe a nova senha definitiva.');
      return;
    }
    if (passStr.length < 6) {
      alert('A nova senha definitiva deve possuir pelo menos 6 caracteres.');
      return;
    }
    if (passStr !== passConfirmStr) {
      alert('As senhas digitadas não coincidem.');
      return;
    }

    try {
      const res = await fetch('/api/master/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailStr, password: passStr })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Configurações salvas com sucesso! Seus dados de primeiro acesso foram atualizados de forma criptografada no banco de dados. Agora você pode gerenciar o sistema.');
        setIsAuthenticatedMaster(true);
        localStorage.setItem('master_is_auth', 'true');
        setMasterScreen('dashboard');
        fetchLicenses();
        fetchState();
      } else {
        alert(data.error || 'Erro ao salvar configurações.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao realizar configuração.');
    }
  };

  // Handle Master Forgot Password
  const handleMasterForgotPassword = async () => {
    const emailStr = masterForgotPasswordEmailInput.trim();
    if (!emailStr) {
      alert('Por favor, insira o seu e-mail cadastrado.');
      return;
    }
    try {
      const res = await fetch('/api/master/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailStr })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'E-mail de redefinição enviado!');
        if (data.simulatedLink) {
          setSimulatedResetLink(data.simulatedLink);
        }
      } else {
        alert(data.error || 'Erro ao solicitar a recuperação de senha.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao se conectar para recuperar senha.');
    }
  };

  // Handle Master Reset Password with Token
  const handleMasterResetPassword = async () => {
    const passStr = masterNewPasswordInput.trim();
    const passConfirmStr = masterNewPasswordConfirmInput.trim();

    if (!passStr) {
      alert('Por favor, informe a nova senha.');
      return;
    }
    if (passStr.length < 6) {
      alert('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }
    if (passStr !== passConfirmStr) {
      alert('As senhas digitadas não coincidem.');
      return;
    }

    try {
      const res = await fetch('/api/master/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetTokenFromUrl, password: passStr })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'Senha redefinida com sucesso!');
        // Clear token states and query param from URL
        setResetTokenFromUrl(null);
        setSimulatedResetLink(null);
        setMasterNewPasswordInput('');
        setMasterNewPasswordConfirmInput('');
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?view=master";
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        setMasterScreen('login');
      } else {
        alert(data.error || 'Erro ao redefinir a senha.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao se conectar para redefinir a senha.');
    }
  };

  const fetchLicenses = async () => {
    try {
      const res = await fetch('/api/licenses');
      const list = await res.json();
      setLicenses(list);
      fetchShops();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTrialSettings = async () => {
    try {
      const res = await fetch(`/api/super/shops/${selectedTrialShopId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemTestEnabled: masterTrialEnabled,
          systemTestStartDate: masterTrialStartDate,
          systemTestDurationDays: masterTrialDuration,
          systemTestPassword: masterTrialPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Configurações de teste para a barbearia salvas com sucesso!');
        fetchShops();
        await fetchState();
      } else {
        alert(`Erro ao salvar: ${data.error}`);
      }
    } catch (err) {
      alert('Erro ao salvar as configurações de teste.');
    }
  };

  const handleChangeMasterCredentials = async () => {
    setMasterCredsMsg(null);
    if (!masterNewEmail.trim() && !masterNewPassword.trim()) {
      setMasterCredsMsg({ type: 'error', text: 'Preencha pelo menos o e-mail ou a nova senha.' });
      return;
    }
    if (masterNewPassword.trim() && masterNewPassword !== masterNewPasswordConfirm) {
      setMasterCredsMsg({ type: 'error', text: 'As senhas digitadas não coincidem!' });
      return;
    }

    try {
      const res = await window.fetch('/api/master/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail: masterNewEmail.trim() || undefined,
          newPassword: masterNewPassword.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setMasterCredsMsg({ type: 'success', text: 'Credenciais master atualizadas com sucesso!' });
        setMasterNewEmail('');
        setMasterNewPassword('');
        setMasterNewPasswordConfirm('');
      } else {
        setMasterCredsMsg({ type: 'error', text: data.error || 'Erro ao atualizar credenciais.' });
      }
    } catch (err) {
      setMasterCredsMsg({ type: 'error', text: 'Erro de conexão com o servidor.' });
    }
  };

  const hasUnreadMessagesForBarber = (barberId: string): boolean => {
    if (!syncState?.tickets) return false;
    const activeTickets = syncState.tickets.filter(
      t => t.barberId === barberId && (t.status === 'AGUARDANDO' || t.status === 'EM_ATENDIMENTO') && isToday(t.createdAt)
    );
    for (const t of activeTickets) {
      if (t.messages && t.messages.length > 0) {
        const lastMsg = t.messages[t.messages.length - 1];
        if (lastMsg.sender === 'client') {
          return true;
        }
      }
    }
    return false;
  };

  useEffect(() => {
    if (isAuthenticatedMaster) {
      fetchLicenses();
      fetchShops();
    }
  }, [isAuthenticatedMaster]);

  // Barber Panel actions
  const handleChamarProximo = async (barberId: string) => {
    try {
      const res = await fetch('/api/tickets/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId })
      });
      const data = await res.json();
      if (data.success) {
        fetchState();
        if (data.ticket) {
          setNewlyCalledTicket(data.ticket);
        }
      } else {
        alert(data.message || 'Nenhum cliente na fila.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinalizarAtendimento = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINALIZADO' })
      });
      if (res.ok) {
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNaoCompareceuAtendimento = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'NAO_COMPARECEU' })
      });
      if (res.ok) {
        setConfirmNoShow(false);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIniciarAtendimento = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'EM_ATENDIMENTO' })
      });
      if (res.ok) {
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetGeral = async () => {
    if (!isResetConfirming) {
      setIsResetConfirming(true);
      // Automatically cancel confirm request if inactive for 4 seconds
      setTimeout(() => {
        setIsResetConfirming(false);
      }, 4000);
      return;
    }
    
    try {
      const res = await fetch('/api/tickets/reset', { method: 'POST' });
      if (res.ok) {
        setIsResetConfirming(false);
        fetchState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Item to settings - Write directly to server so it is immediately persisted
  const handleAddLocalBarber = async () => {
    if (!newBarberName.trim()) return;
    const item: Barber = {
      id: 'barber-' + Math.random().toString(36).substring(2, 9),
      name: newBarberName.toUpperCase(),
      active: true
    };
    try {
      await fetch('/api/barbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      setNewBarberName('');
      await fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveLocalBarber = async (id: string) => {
    try {
      await fetch(`/api/barbers/${id}`, { method: 'DELETE' });
      await fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLocalService = async () => {
    if (!newServiceName.trim() || !newServicePrice) return;
    const item: Service = {
      id: 'srv-' + Math.random().toString(36).substring(2, 9),
      name: newServiceName.toUpperCase(),
      price: parseFloat(newServicePrice),
      duration: parseInt(newServiceDuration || '30'),
      type: newServiceType
    };
    try {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDuration('');
      await fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveLocalService = async (id: string) => {
    try {
      await fetch(`/api/services/${id}`, { method: 'DELETE' });
      await fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  // Save Settings out to Server
  const handleSaveAllSettings = async () => {
    if (!settingsForm) return;

    try {
      // 1. Save Settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      });

      alert('Configurações salvas com sucesso!');
      await fetchState();
      setBarberScreen('dashboard');
    } catch (err) {
      alert('Erro ao salvar configurações.');
    }
  };

  // Helper calculation for Clock time waiting (dynamically counting down as real time elapses)
  const getWaitingTimeDetails = (barberId: string, currentTicketId: string | null) => {
    if (!syncState) return { countAhead: 0, waitTimeMin: 0, clockTimeStr: '--:--' };
    
    const ticketsForBarber = syncState.tickets
      .filter(t => t.barberId === barberId && (t.status === 'AGUARDANDO' || t.status === 'EM_ATENDIMENTO'))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let countAhead = 0;
    let finalWaitTimeMin = 0;

    // Find the active ticket being served, if any
    const activeTicket = ticketsForBarber.find(t => t.status === 'EM_ATENDIMENTO');
    let activeRemainingMin = 0;
    if (activeTicket) {
      const startTimeRef = activeTicket.calledAt || activeTicket.createdAt;
      const elapsedMin = Math.floor((Date.now() - new Date(startTimeRef).getTime()) / 60000);
      activeRemainingMin = Math.max(1, activeTicket.estimatedTime - elapsedMin);
    }

    for (const tkt of ticketsForBarber) {
      if (currentTicketId && tkt.id === currentTicketId) {
        break; // Stop before our own ticket
      }

      if (tkt.status === 'EM_ATENDIMENTO') {
        finalWaitTimeMin += activeRemainingMin;
      } else if (tkt.status === 'AGUARDANDO') {
        finalWaitTimeMin += tkt.estimatedTime;
        countAhead++;
      }
    }

    // Overwrite wait time if you are next in line (countAhead === 0)
    // "E O BARBEIRO TINHA 0 AGUARDANDO CLIENTE JA VAI SER ATENDIDO E VAI APARECER PARA ELE TEMPO DE 5 MINUTOS"
    const myTicket = currentTicketId ? syncState.tickets.find(t => t.id === currentTicketId) : null;
    if (countAhead === 0 && myTicket && myTicket.status === 'AGUARDANDO') {
      finalWaitTimeMin = 5;
    }

    if (finalWaitTimeMin <= 0) {
      finalWaitTimeMin = 5;
    }

    const now = new Date();
    const futureDate = new Date(now.getTime() + finalWaitTimeMin * 60000);
    const clockTimeStr = futureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      countAhead,
      waitTimeMin: finalWaitTimeMin,
      clockTimeStr
    };
  };

  // Quick info if tracking a ticket
  const myTicketObj = syncState?.tickets.find(t => t.id === activeTicketId);
  const myBarberId = myTicketObj ? myTicketObj.barberId : selectedBarberId;
  const { countAhead, waitTimeMin, clockTimeStr } = getWaitingTimeDetails(myBarberId, activeTicketId);

  const getCurrentTicketNum = (): string => {
    if (!syncState || !myBarberId) return '---';

    // Filter tickets of today for this barber
    const todaysTicks = [...syncState.tickets]
      .filter(t => t.barberId === myBarberId && isToday(t.createdAt))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // 1. Is there any ticket currently being served (EM_ATENDIMENTO) or called (CHAMADO)?
    const active = todaysTicks.find(t => t.status === 'EM_ATENDIMENTO' || t.status === 'CHAMADO');
    if (active) {
      return active.number;
    }

    // 2. If not, what about the last completed (FINALIZADO) ticket?
    const finished = todaysTicks.filter(t => t.status === 'FINALIZADO');
    if (finished.length > 0) {
      return finished[finished.length - 1].number;
    }

    // Default when no tickets have been called/served/finished today
    return '---';
  };

  // Background timer to tick current timestamp for real-time countdowns
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(Date.now());
  useEffect(() => {
    if (clientScreen === 'tracking' && myTicketObj && myTicketObj.status === 'AGUARDANDO') {
      const interval = setInterval(() => {
        setCurrentTimestamp(Date.now());
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [clientScreen, myTicketObj?.id, myTicketObj?.status]);

  // Handle setting when the client became first in line (countAhead === 0)
  useEffect(() => {
    if (myTicketObj && myTicketObj.status === 'AGUARDANDO' && countAhead === 0) {
      if (!nextInLineTime) {
        const now = Date.now();
        setNextInLineTime(now);
        localStorage.setItem('next_in_line_timestamp', now.toString());
      }
    } else {
      if (nextInLineTime) {
        setNextInLineTime(null);
        localStorage.removeItem('next_in_line_timestamp');
      }
    }
  }, [myTicketObj?.id, myTicketObj?.status, countAhead, nextInLineTime]);

  // Stats calculate for dashboard
  const getFaturamentoDoDia = (barberId: string) => {
    if (!syncState) return 0;
    return syncState.tickets
      .filter(t => t.barberId === barberId && t.status === 'FINALIZADO' && isToday(t.createdAt))
      .reduce((sum, t) => sum + t.price, 0);
  };

  const getTotalClientesAtendidos = () => {
    if (!syncState) return 0;
    return syncState.tickets.filter(t => t.status === 'FINALIZADO' && isToday(t.createdAt)).length;
  };

  if (isTvView) {
    return (
      <TvMonitorView 
        syncState={syncState} 
        loading={loading} 
        language={language} 
        t={t} 
        onCloseTv={() => setIsTvView(false)} 
      />
    );
  }

  const showToolbar = (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true' || params.get('dev') === 'true' || params.get('toolbar') === 'true';
  })();

  return (
    <div id="app-root" className="min-h-screen text-white flex flex-col font-sans selection:bg-[var(--brand-color)] selection:text-[#07090E]" style={{ backgroundColor: 'var(--bg-color)' }}>
      <style>{`
        :root {
          --brand-color: ${
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'blue' ? '#3B82F6' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'violet' ? '#8B5CF6' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'amber' ? '#F59E0B' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'rose' ? '#EC4899' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'cyan' ? '#06B6D4' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'orange' ? '#FF6B00' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'red' ? '#EF4444' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'lime' ? '#84CC16' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'fuchsia' ? '#D946EF' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'gold' ? '#EAB308' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'teal' ? '#14B8A6' :
            '#00E396'
          };
          --brand-hover: ${
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'blue' ? '#1D4ED8' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'violet' ? '#6D28D9' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'amber' ? '#D97706' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'rose' ? '#BE185D' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'cyan' ? '#0891B2' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'orange' ? '#C2410C' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'red' ? '#DC2626' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'lime' ? '#65A30D' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'fuchsia' ? '#C026D3' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'gold' ? '#CA8A04' :
            (settingsForm?.colorPalette || syncState?.settings?.colorPalette) === 'teal' ? '#0D9488' :
            '#00c581'
          };
          --bg-color: #07090E;
          --card-bg-rgb: ${
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'black' ? '22, 22, 22' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'slate' ? '30, 41, 59' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'wood' ? '38, 27, 24' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'burgundy' ? '43, 18, 23' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'navy' ? '19, 31, 58' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'forest' ? '12, 46, 32' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'abyssal' ? '30, 18, 59' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'espresso' ? '41, 27, 20' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'graphite' ? '41, 41, 48' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'petrol' ? '16, 43, 48' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'midnight' ? '10, 22, 48' :
            '16, 22, 34'
          };
          --card-bg-color: rgb(var(--card-bg-rgb));
          --card-bg-hover-rgb: ${
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'black' ? '34, 34, 34' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'slate' ? '51, 65, 85' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'wood' ? '59, 40, 36' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'burgundy' ? '66, 29, 36' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'navy' ? '32, 47, 84' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'forest' ? '20, 71, 50' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'abyssal' ? '47, 31, 84' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'espresso' ? '61, 41, 30' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'graphite' ? '59, 59, 69' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'petrol' ? '26, 65, 74' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'midnight' ? '18, 36, 78' :
            '21, 32, 51'
          };
          --card-bg-hover: rgb(var(--card-bg-hover-rgb));
          
          --page-inner-bg-rgb: ${
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'black' ? '10, 10, 10' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'slate' ? '15, 23, 42' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'wood' ? '22, 15, 13' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'burgundy' ? '26, 9, 12' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'navy' ? '10, 17, 33' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'forest' ? '6, 26, 18' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'abyssal' ? '17, 10, 36' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'espresso' ? '25, 16, 12' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'graphite' ? '29, 29, 34' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'petrol' ? '10, 28, 32' :
            (settingsForm?.backgroundTheme || syncState?.settings?.backgroundTheme) === 'midnight' ? '5, 11, 27' :
            '8, 11, 17'
          };
          --page-inner-bg: rgb(var(--page-inner-bg-rgb));
        }

        /* Override bg-[#101622] */
        .bg-\\[\\#101622\\] {
          background-color: var(--card-bg-color) !important;
        }
        .bg-\\[\\#101622\\]\\/40 {
          background-color: rgba(var(--card-bg-rgb), 0.4) !important;
        }
        .bg-\\[\\#101622\\]\\/20 {
          background-color: rgba(var(--card-bg-rgb), 0.2) !important;
        }
        .bg-\\[\\#101622\\]\\/50 {
          background-color: rgba(var(--card-bg-rgb), 0.5) !important;
        }

        /* Override hover bg-[#152033] */
        .hover\\:bg-\\[\\#152033\\]:hover {
          background-color: var(--card-bg-hover) !important;
        }

        /* Override bg-[#080B11] (except root iframe layouts that need dark outer) */
        #app-root .bg-\\[\\#080B11\\] {
          background-color: var(--page-inner-bg) !important;
        }
        #app-root .bg-\\[\\#080B11\\]\\/40 {
          background-color: rgba(var(--page-inner-bg-rgb), 0.4) !important;
        }
        #app-root .bg-\\[\\#080B11\\]\\/50 {
          background-color: rgba(var(--page-inner-bg-rgb), 0.5) !important;
        }
        #app-root .bg-\\[\\#080B11\\]\\/60 {
          background-color: rgba(var(--page-inner-bg-rgb), 0.6) !important;
        }
      `}</style>
      
      {/* 🚀 QUICK TEST TOOLBAR FOR TESTING THE MULTI-DEVICE VIEW IN THE IFRAME */}
      {showToolbar && (
        <div className="bg-[#101524] border-b border-[#1E293B] px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-50 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--brand-color)] animate-pulse"></span>
            <span className="font-mono text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
              {syncState?.settings.name || 'JCHFDKJLSK'} - LIVE SERVER (WIFI / 4G)
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#0F172A] p-0.5 rounded-lg border border-white/5">
            <button 
              id="view-client-btn"
              onClick={() => setCurrentNamespace('client')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                currentNamespace === 'client' 
                  ? 'bg-[var(--brand-color)] text-[#07090E] font-bold shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              📱 CLIENTE PORTAL
            </button>
            <button 
              id="view-barber-btn"
              onClick={() => setCurrentNamespace('barber')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                currentNamespace === 'barber' 
                  ? 'bg-[var(--brand-color)] text-[#07090E] font-bold shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              💈 BARBEIRO PAINEL
            </button>
            <button 
              id="view-master-btn"
              onClick={() => {
                hasInitializedMasterSettings.current = false;
                setCurrentNamespace('master');
              }}
              className={`px-3 py-1 rounded-md transition font-medium ${
                currentNamespace === 'master' 
                  ? 'bg-[var(--brand-color)] text-[#07090E] font-bold shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              🔑 LICENCIAMENTO
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-[var(--brand-color)]" />
              <span className="text-gray-400 font-mono text-[10px]">PORT: 3000</span>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#07090E] gap-3 text-sm text-[var(--brand-color)]">
          <Scissors className="w-8 h-8 animate-spin" />
          <span>{t.loading}</span>
        </div>
      )}

      {!loading && (
        <div className="flex-1 flex flex-col">
          
          {/* ========================================================= */}
          {/* 📱 CLIENT VIEW                                            */}
          {/* ========================================================= */}
          {currentNamespace === 'client' && (
            <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-4 py-6 bg-[#080B11] shadow-2xl relative min-h-[85vh]">
              
              {/* Language + Header Switcher */}
              <div className="flex flex-col items-center justify-center mb-8 border-b border-white/5 pb-5">
                <div className="flex items-center gap-6">
                  <button 
                     onClick={() => setLanguage('pt-BR')}
                     className={`transition duration-150 transform active:scale-95 cursor-pointer rounded-lg overflow-hidden border ${
                       language === 'pt-BR' 
                         ? 'border-[var(--brand-color)] scale-110 shadow-lg shadow-[var(--brand-color)]/10 ring-2 ring-[var(--brand-color)]/20' 
                         : 'border-white/5 opacity-40 hover:opacity-85'
                     }`}
                  >
                    <img 
                      src="https://flagcdn.com/w160/br.png" 
                      alt="Português" 
                      className="w-11 h-7 object-cover animate-pulse hover:animate-none" 
                      referrerPolicy="no-referrer"
                    />
                  </button>
                  <button 
                     onClick={() => setLanguage('en-GB')}
                     className={`transition duration-150 transform active:scale-95 cursor-pointer rounded-lg overflow-hidden border ${
                       language === 'en-GB' 
                         ? 'border-[var(--brand-color)] scale-110 shadow-lg shadow-[var(--brand-color)]/10 ring-2 ring-[var(--brand-color)]/20' 
                         : 'border-white/5 opacity-40 hover:opacity-85'
                     }`}
                  >
                    <img 
                      src="https://flagcdn.com/w160/gb.png" 
                      alt="English" 
                      className="w-11 h-7 object-cover animate-pulse hover:animate-none" 
                      referrerPolicy="no-referrer"
                    />
                  </button>
                </div>
              </div>

              {/* WELCOME SCREEN (IMAGE 6) */}
              {clientScreen === 'welcome' && (
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Brand header */}
                    <div className="flex flex-col items-center text-center mt-4 mb-8">
                      <div className="w-24 h-24 rounded-full border-2 border-[var(--brand-color)]/40 p-1 bg-[#101622] overflow-hidden shadow-lg shadow-[var(--brand-color)]/10 mb-4 flex items-center justify-center">
                        {syncState?.settings.logoUrl ? (
                          <img 
                            src={syncState.settings.logoUrl} 
                            alt="Logo" 
                            className="w-full h-full object-cover rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Scissors className="w-10 h-10 text-[var(--brand-color)]" />
                        )}
                      </div>
                      <h1 className="text-3xl font-extrabold tracking-wider text-white font-mono">
                        {syncState?.settings.name || 'JCHFDKJLSK'}
                      </h1>
                      <div className="flex items-center gap-1 text-gray-400 text-xs mt-2 uppercase font-mono max-w-[280px]">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{syncState?.settings.address || 'RUA EXEMPLO, 123 - CENTRO'}</span>
                      </div>
                    </div>

                    {/* Fila ao Vivo Card */}
                    <div className="bg-[#101622] rounded-2xl p-5 border border-white/5 space-y-4 shadow-xl">
                      <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-color)] uppercase tracking-widest font-mono">
                        <Clock className="w-4 h-4" />
                        <span>{t.liveQueue}</span>
                      </div>

                      {/* Filter by barber */}
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-gray-500 font-mono tracking-wider">
                          {t.filterByBarber}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {syncState?.barbers.filter(b => b.active).map(barber => {
                            const isSelected = selectedBarberId === barber.id;
                            return (
                              <button
                                key={barber.id}
                                type="button"
                                onClick={() => setSelectedBarberId(barber.id)}
                                className={`px-3 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition duration-150 cursor-pointer text-center ${
                                  isSelected
                                    ? 'bg-[#080B11] border-[var(--brand-color)] text-[var(--brand-color)] shadow-md shadow-[var(--brand-color)]/5'
                                    : 'bg-[#080B11]/40 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                                }`}
                              >
                                {barber.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {/* Waiting */}
                        <div className="bg-[#080B11] rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">
                            {t.waiting}
                          </span>
                          <span className="text-3xl font-black text-[var(--brand-color)] mt-1 font-mono">
                            {syncState?.tickets.filter(t => t.barberId === selectedBarberId && t.status === 'AGUARDANDO' && isToday(t.createdAt)).length || 0}
                          </span>
                        </div>
                        {/* Avg Time */}
                        <div className="bg-[#080B11] rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider font-mono">
                            {t.avgTime}
                          </span>
                          <span className="text-xl font-bold text-white mt-2 font-mono">
                            ~{getWaitingTimeDetails(selectedBarberId, null).waitTimeMin} <span className="text-xs text-gray-400">MIN</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PEGAR MINHA SENHA or OFFLINE banner */}
                  <div className="mt-8 space-y-4">
                    {syncState?.settings.isOnline === false ? (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-center rounded-2xl p-6 space-y-3 font-sans">
                        <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                          <AlertTriangle className="w-6 h-6 stroke-[2]" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-red-400 font-bold uppercase tracking-wider font-mono text-xs">
                            {language === 'pt-BR' ? 'AGENDAMENTOS TEMPORARIAMENTE INDISPONÍVEIS' : 'BOOKINGS TEMPORARILY SUSPENDED'}
                          </h4>
                          <p className="text-[11px] text-gray-400 leading-relaxed max-w-xs mx-auto font-mono uppercase">
                            {language === 'pt-BR' 
                              ? 'A barbearia encontra-se temporariamente Offline para novos agendamentos.'
                              : 'This barbershop is currently offline for new bookings.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setClientScreen('create')}
                        className="w-full bg-[var(--brand-color)] text-[#07090E] rounded-2xl py-4.5 px-6 font-bold uppercase tracking-wider hover:bg-[var(--brand-hover)] transition shadow-lg shadow-[var(--brand-color)]/20 flex items-center justify-center gap-2 cursor-pointer font-mono"
                      >
                        <Scissors className="w-5 h-5 shrink-0 rotate-90" />
                        <span>{t.getTicket}</span>
                      </button>
                    )}

                    {/* Dynamic PWA Mobile App Installation Panel */}
                    {showInstallBtn && (
                      <div className="p-4 rounded-xl bg-[#0F172A] border border-white/5 flex flex-col items-center gap-3 text-center shadow-lg">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-color)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-color)]"></span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">
                            {language === 'pt-BR' ? 'Disponível como Aplicativo!' : 'Web App Available!'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-300 leading-tight">
                          {language === 'pt-BR' 
                            ? 'Instale agora na tela do seu celular para acesso ultra rápido sem navegador.' 
                            : 'Install on your home screen for instant wait-time tracking.'}
                        </p>
                        <button
                          onClick={handleInstallApp}
                          className="w-full bg-[#07090E] hover:bg-white/5 border border-[var(--brand-color)]/30 hover:border-[var(--brand-color)] text-[var(--brand-color)] rounded-xl py-3 px-4 font-black uppercase text-[10px] tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer font-mono"
                        >
                          <Smartphone className="w-4 h-4 shrink-0 text-[var(--brand-color)]" />
                          <span>{language === 'pt-BR' ? 'INSTALAR EM 1 CLIQUE' : 'INSTALL IN 1-CLICK'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECOND SCREEN: GENERATE PASSWORD (IMAGE 7) */}
              {clientScreen === 'create' && (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setClientScreen('welcome')}
                        className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/5 transition"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h2 className="text-lg font-bold tracking-wider font-mono uppercase">
                        {language === 'pt-BR' ? 'SOLICITAR NOVA SENHA' : 'REQUEST TICKET'}
                      </h2>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[var(--brand-color)] font-mono tracking-wider">
                          {t.fullName}
                        </label>
                        <input 
                          type="text" 
                          placeholder={t.enterName}
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="w-full bg-[#101622] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--brand-color)] transition font-medium text-white placeholder-gray-600 uppercase font-mono"
                        />
                      </div>

                      {/* Quantities */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-[var(--brand-color)] font-mono tracking-wider">
                            {t.adults}
                          </label>
                          <select 
                            value={adultsCount}
                            onChange={(e) => setAdultsCount(parseInt(e.target.value))}
                            className="w-full bg-[#101622] border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--brand-color)] transition font-medium text-white"
                          >
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold text-[var(--brand-color)] font-mono tracking-wider">
                            {t.kids}
                          </label>
                          <select 
                            value={kidsCount}
                            onChange={(e) => setKidsCount(parseInt(e.target.value))}
                            className="w-full bg-[#101622] border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--brand-color)] transition font-medium text-white"
                          >
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                          </select>
                        </div>
                      </div>

                      {/* Services Selection cards (Per Adult) */}
                      {adultsCount > 0 && Array.from({ length: adultsCount }).map((_, index) => (
                        <div key={`adult-${index}`} className="space-y-2 bg-[#101622]/20 border border-white/5 rounded-2xl p-4">
                          <span className="text-[10px] uppercase font-bold text-gray-500 font-mono tracking-wider block">
                            {adultsCount === 1 
                              ? (language === 'pt-BR' ? 'SERVIÇO ADULTO' : 'ADULT SERVICE')
                              : (language === 'pt-BR' ? `SERVIÇO - ADULTO ${index + 1}` : `SERVICE - ADULT ${index + 1}`)
                            }
                          </span>
                          <div className="space-y-2">
                            {syncState?.services.filter(s => s.type === 'adult').map(srv => {
                              const isSelected = selectedAdultServices[index] === srv.id;
                              return (
                                <div 
                                  key={srv.id}
                                  onClick={() => {
                                    setSelectedAdultServices(prev => {
                                      const next = [...prev];
                                      next[index] = srv.id;
                                      return next;
                                    });
                                    if (index === 0) {
                                      setSelectedServiceId(srv.id);
                                    }
                                  }}
                                  className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                                    isSelected 
                                      ? 'bg-[#101622] border-[var(--brand-color)]' 
                                      : 'bg-[#101622]/50 border-white/5 hover:border-white/10'
                                  }`}
                                >
                                  <div>
                                    <h4 className="text-sm font-bold tracking-wider text-white font-mono">{srv.name}</h4>
                                    <span className="text-[11px] text-gray-400 font-mono mt-1 block">£{srv.price.toFixed(2)} • {srv.duration} min</span>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                    isSelected ? 'border-[var(--brand-color)] bg-[var(--brand-color)]' : 'border-gray-600'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 text-[#07090E] stroke-[3]" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Services Selection for Kids */}
                      {kidsCount > 0 && Array.from({ length: kidsCount }).map((_, index) => (
                        <div key={`kid-${index}`} className="space-y-2 bg-[#101622]/20 border border-white/5 rounded-2xl p-4">
                          <span className="text-[10px] uppercase font-bold text-gray-500 font-mono tracking-wider block">
                            {kidsCount === 1 
                              ? (language === 'pt-BR' ? 'SERVIÇO INFANTIL' : 'CHILDREN SERVICE')
                              : (language === 'pt-BR' ? `SERVIÇO - CRIANÇA ${index + 1}` : `SERVICE - CHILD ${index + 1}`)
                            }
                          </span>
                          <div className="space-y-2">
                            {syncState?.services.filter(s => s.type === 'kids').map(srv => {
                              const isSelected = selectedKidsServices[index] === srv.id;
                              return (
                                <div 
                                  key={srv.id}
                                  onClick={() => {
                                    setSelectedKidsServices(prev => {
                                      const next = [...prev];
                                      next[index] = srv.id;
                                      return next;
                                    });
                                    if (adultsCount === 0 && index === 0) {
                                      setSelectedServiceId(srv.id);
                                    }
                                  }}
                                  className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                                    isSelected 
                                      ? 'bg-[#101622] border-[var(--brand-color)]' 
                                      : 'bg-[#101622]/50 border-white/5 hover:border-white/10'
                                  }`}
                                >
                                  <div>
                                    <h4 className="text-sm font-bold tracking-wider text-white font-mono">{srv.name}</h4>
                                    <span className="text-[11px] text-gray-400 font-mono mt-1 block">£{srv.price.toFixed(2)} • {srv.duration} min</span>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                    isSelected ? 'border-[var(--brand-color)] bg-[var(--brand-color)]' : 'border-gray-600'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 text-[#07090E] stroke-[3]" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Barber of preference */}
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-[var(--brand-color)] font-mono tracking-wider">
                          {t.preferredBarber} *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {syncState?.barbers.filter(b => b.active).map(barber => {
                            const isSelected = selectedBarberId === barber.id;
                            return (
                              <button
                                key={barber.id}
                                type="button"
                                onClick={() => setSelectedBarberId(barber.id)}
                                className={`px-3 py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition duration-150 cursor-pointer text-center ${
                                  isSelected
                                    ? 'bg-[#101622] border-[var(--brand-color)] text-[var(--brand-color)] shadow-md shadow-[var(--brand-color)]/10'
                                    : 'bg-[#101622]/40 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                }`}
                              >
                                {barber.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Estimativas Summary */}
                      <div className="bg-[#101622] rounded-xl p-4 border border-white/5 flex items-center justify-between mt-2 shadow-inner">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block font-mono">
                            {t.estimatedTotal}
                          </span>
                          <span className="text-xs text-[var(--brand-color)] font-mono mt-0.5 block uppercase tracking-wide">
                            ~{(() => {
                              let totalMinutes = 0;
                              if (adultsCount > 0) {
                                selectedAdultServices.forEach(sId => {
                                  const srv = syncState?.services.find(s => s.id === sId);
                                  totalMinutes += srv ? srv.duration : 30;
                                });
                              }
                              if (kidsCount > 0) {
                                selectedKidsServices.forEach(sId => {
                                  const srv = syncState?.services.find(s => s.id === sId);
                                  totalMinutes += srv ? srv.duration : 20;
                                });
                              }
                              if (adultsCount === 0 && kidsCount === 0) {
                                const srv = syncState?.services.find(s => s.id === selectedServiceId);
                                totalMinutes += srv ? srv.duration : 30;
                              }
                              return totalMinutes;
                            })()} {t.minutes}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black font-mono text-white">
                            £{(() => {
                              let totalPrice = 0.00;
                              if (adultsCount > 0) {
                                selectedAdultServices.forEach(sId => {
                                  const srv = syncState?.services.find(s => s.id === sId);
                                  totalPrice += srv ? srv.price : 35.00;
                                });
                              }
                              if (kidsCount > 0) {
                                selectedKidsServices.forEach(sId => {
                                  const srv = syncState?.services.find(s => s.id === sId);
                                  totalPrice += srv ? srv.price : 25.00;
                                });
                              }
                              if (adultsCount === 0 && kidsCount === 0) {
                                const srv = syncState?.services.find(s => s.id === selectedServiceId);
                                totalPrice += srv ? srv.price : 35.00;
                              }
                              return totalPrice.toFixed(2);
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Rich Prepayment details if Stripe is enabled */}
                      {!!((syncState?.settings?.stripePublishableKey && syncState.settings.stripePublishableKey.trim() !== '') || (syncState?.settings?.stripeSecretKey && syncState.settings.stripeSecretKey.trim() !== '')) && (
                        <div className="mt-4 bg-[#101622]/40 rounded-xl p-3.5 border border-dashed border-white/10 font-mono text-left space-y-2">
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {language === 'pt-BR' ? 'FLUXO DE PAGAMENTO INTEGRADO' : 'INTEGRATED PAYMENT WORKFLOW'}
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>{language === 'pt-BR' ? 'Taxa de Reserva / Sinal (Pagar Agora)' : 'Reservation / Deposit (Pay Now)'}:</span>
                            <span className="text-emerald-400 font-bold">
                              £{(() => {
                                let totalPrice = 0.00;
                                if (adultsCount > 0) {
                                  selectedAdultServices.forEach(sId => {
                                    const srv = syncState?.services.find(s => s.id === sId);
                                    totalPrice += srv ? srv.price : 35.00;
                                  });
                                }
                                if (kidsCount > 0) {
                                  selectedKidsServices.forEach(sId => {
                                    const srv = syncState?.services.find(s => s.id === sId);
                                    totalPrice += srv ? srv.price : 25.00;
                                  });
                                }
                                if (adultsCount === 0 && kidsCount === 0) {
                                  const srv = syncState?.services.find(s => s.id === selectedServiceId);
                                  totalPrice += srv ? srv.price : 35.00;
                                }
                                const configuredSinal = Number(syncState?.settings?.servicePrice) || 10.0;
                                return Math.min(totalPrice, configuredSinal).toFixed(2);
                              })()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>{language === 'pt-BR' ? 'Valor Restante (Pagar na Barbearia)' : 'Remaining Balance (Pay on Site)'}:</span>
                            <span className="text-[var(--brand-color)] font-bold">
                              £{(() => {
                                let totalPrice = 0.00;
                                if (adultsCount > 0) {
                                  selectedAdultServices.forEach(sId => {
                                    const srv = syncState?.services.find(s => s.id === sId);
                                    totalPrice += srv ? srv.price : 35.00;
                                  });
                                }
                                if (kidsCount > 0) {
                                  selectedKidsServices.forEach(sId => {
                                    const srv = syncState?.services.find(s => s.id === sId);
                                    totalPrice += srv ? srv.price : 25.00;
                                  });
                                }
                                if (adultsCount === 0 && kidsCount === 0) {
                                  const srv = syncState?.services.find(s => s.id === selectedServiceId);
                                  totalPrice += srv ? srv.price : 35.00;
                                }
                                const configuredSinal = Number(syncState?.settings?.servicePrice) || 10.0;
                                const prepaid = Math.min(totalPrice, configuredSinal);
                                return Math.max(0, totalPrice - prepaid).toFixed(2);
                              })()}
                            </span>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* SALVAR Button */}
                  <div className="mt-8">
                    <button
                      onClick={() => {
                        if (!clientName.trim()) {
                          alert(language === 'pt-BR' ? 'Por favor, digite seu nome.' : 'Please enter your name.');
                          return;
                        }

                        if (adultsCount === 0 && kidsCount === 0) {
                          alert(language === 'pt-BR' 
                            ? 'Por favor, selecione pelo menos 1 pessoa (Adulto ou Criança).' 
                            : 'Please select at least 1 person (Adult or Child).');
                          return;
                        }

                        if (!selectedBarberId) {
                          alert(language === 'pt-BR' 
                            ? 'Por favor, selecione o barbeiro de preferência.' 
                            : 'Please select your preferred barber.');
                          return;
                        }

                        if (adultsCount > 0) {
                          for (let i = 0; i < adultsCount; i++) {
                            if (!selectedAdultServices[i]) {
                              alert(language === 'pt-BR' 
                                ? 'Por favor, selecione o serviço para todos os adultos.' 
                                : 'Please select a service for all adults.');
                              return;
                            }
                          }
                        }

                        if (kidsCount > 0) {
                          for (let i = 0; i < kidsCount; i++) {
                            if (!selectedKidsServices[i]) {
                              alert(language === 'pt-BR' 
                                ? 'Por favor, selecione o serviço para todas as crianças.' 
                                : 'Please select a service for all children.');
                              return;
                            }
                          }
                        }

                        // Open Terms Acceptance modal
                        setTermsChecked(false);
                        setShowTermsModal(true);
                      }}
                      className="w-full bg-[var(--brand-color)] text-[#07090E] rounded-2xl py-4.5 px-6 font-bold uppercase tracking-wider hover:bg-[var(--brand-hover)] transition shadow-lg shadow-[var(--brand-color)]/20 text-center cursor-pointer font-mono"
                    >
                      {t.save}
                    </button>
                  </div>
                </div>
              )}

              {/* TRACKING PATH / ESTIMATION VIEW (IMAGE 8) */}
              {clientScreen === 'tracking' && myTicketObj && (
                <div className="flex-1 flex flex-col justify-between relative">
                  {/* FULL SCREEN REPEATED SOUND CALL ALARM POPUP */}
                  {(!callAcknowledged && (myTicketObj.status === 'CHAMADO' || myTicketObj.status === 'EM_ATENDIMENTO')) && (
                    <div className="fixed inset-0 bg-[#07090E]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center select-none">
                      <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-color)]/5 to-transparent pointer-events-none" />
                      
                      <div className="space-y-6 max-w-md w-full p-4">
                        {/* Huge pulsing bell or scissors icon */}
                        <div className="w-28 h-28 bg-[var(--brand-color)]/10 text-[var(--brand-color)] rounded-full flex items-center justify-center mx-auto border-4 border-[var(--brand-color)] shadow-2xl shadow-[var(--brand-color)]/40 animate-pulse">
                          <Scissors className="w-14 h-14 stroke-[2.5]" />
                        </div>

                        <div className="space-y-2">
                          <span className="bg-[var(--brand-color)]/20 text-[var(--brand-color)] border border-[var(--brand-color)]/30 px-5 py-1.5 rounded-full text-xs font-black uppercase font-mono tracking-widest inline-block animate-bounce">
                            {language === 'pt-BR' ? '📢 É A SUA VEZ!' : '📢 IT IS YOUR TURN!'}
                          </span>
                          <h2 className="text-4xl font-black uppercase tracking-wider font-mono text-white leading-none">
                            {myTicketObj.name.split(' ')[0]}
                          </h2>
                          <p className="text-gray-300 text-xs font-mono font-bold leading-normal max-w-xs mx-auto uppercase">
                            {language === 'pt-BR' 
                              ? `Apresente-se imediatamente ao barbeiro ${myTicketObj.barberName}!` 
                              : `Please present yourself immediately to barber ${myTicketObj.barberName}!`}
                          </p>
                        </div>

                        {/* Ticket details inside the popup */}
                        <div className="bg-[#101622] rounded-3xl border border-white/5 p-6 font-mono text-xs text-left shadow-2xl space-y-3.5 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--brand-color)]/5 rounded-bl-full pointer-events-none"></div>
                          <div className="flex justify-between border-b border-white/5 pb-2.5">
                            <span className="text-gray-400 uppercase">{t.yourTicket}</span>
                            <strong className="text-[var(--brand-color)] text-2xl font-black">{myTicketObj.number}</strong>
                          </div>
                          <div className="flex justify-between border-b border-white/0 pt-1">
                            <span className="text-gray-400 uppercase">{t.barber}</span>
                            <strong className="text-white uppercase font-black text-sm">{myTicketObj.barberName}</strong>
                          </div>
                        </div>

                        {/* Big interactive OK button */}
                        <button
                          type="button"
                          onClick={() => {
                            setCallAcknowledged(true);
                            localStorage.setItem(`call_ack_${myTicketObj.id}`, 'true');
                          }}
                          className="w-full bg-[var(--brand-color)] hover:bg-[var(--brand-hover)] text-[#07090E] rounded-3xl py-5 px-6 font-mono text-xs font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-[var(--brand-color)]/25 transition-transform duration-100 active:scale-95"
                        >
                          {language === 'pt-BR' ? '✓ OK, ENTENDIDO' : "✓ OK, UNDERSTOOD"}
                        </button>
                        
                        <p className="text-[10px] text-gray-500 font-mono tracking-wider uppercase font-bold">
                          {language === 'pt-BR' ? 'Aperte OK para desligar o alarme sonoro' : 'Press OK to quiet the alarm sounds'}
                        </p>
                      </div>
                    </div>
                  )}

                  {myTicketObj.status === 'FINALIZADO' ? (
                    <div className="flex-1 flex flex-col justify-between items-center text-center py-6">
                      <div className="space-y-6 max-w-sm my-auto w-full">
                        <div className="w-20 h-20 bg-[var(--brand-color)]/10 text-[var(--brand-color)] rounded-full flex items-center justify-center mx-auto border border-[var(--brand-color)]/30 shadow-xl shadow-[var(--brand-color)]/10 animate-bounce">
                          <Check className="w-10 h-10 stroke-[3]" />
                        </div>
                        <div className="space-y-3">
                          <h2 className="text-2xl font-black uppercase tracking-wider font-mono text-white">
                            {language === 'pt-BR' ? 'ATENDIMENTO CONCLUÍDO' : 'SERVICE COMPLETED'}
                          </h2>
                          <p className="text-[var(--brand-color)] text-sm font-mono font-black uppercase tracking-wide">
                            {syncState?.settings.thankYouMessage || (language === 'pt-BR' ? 'OBRIGADO PELA PREFERÊNCIA!' : 'THANK YOU FOR YOUR PREFERENCE!')}
                          </p>
                          <p className="text-gray-400 text-xs font-mono uppercase leading-relaxed">
                            {language === 'pt-BR' 
                              ? 'Agradecemos de coração a sua confiança. Siga nossas redes sociais para novidades!' 
                              : 'We sincerely thank you for your trust. Follow our social networks for updates!'}
                          </p>
                        </div>

                        {/* Social media follow buttons */}
                        <div className="flex flex-col gap-2.5 pt-2">
                          {syncState?.settings.instagram && syncState?.settings.sendInstagram !== false && (
                            <a 
                              href={syncState.settings.instagram.startsWith('http') ? syncState.settings.instagram : `https://${syncState.settings.instagram}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] text-white py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider text-xs transition cursor-pointer hover:opacity-90 shadow-md transform hover:scale-[1.01]"
                            >
                              <Instagram className="w-4 h-4 shrink-0" />
                              <span>INSTAGRAM</span>
                            </a>
                          )}
                          {syncState?.settings.facebook && syncState?.settings.sendFacebook !== false && (
                            <a 
                              href={syncState.settings.facebook.startsWith('http') ? syncState.settings.facebook : `https://${syncState.settings.facebook}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2.5 bg-[#1877F2] text-white py-3.5 px-6 rounded-xl font-bold uppercase tracking-wider text-xs transition cursor-pointer hover:opacity-90 shadow-md transform hover:scale-[1.01]"
                            >
                              <Facebook className="w-4 h-4 shrink-0" />
                              <span>FACEBOOK</span>
                            </a>
                          )}
                        </div>
                        
                        <div className="bg-[#101622] rounded-2xl border border-white/5 p-4.5 font-mono text-xs text-left">
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-500 uppercase">{t.yourTicket}</span>
                            <strong className="text-white text-base">{myTicketObj.number}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-gray-500 uppercase">{t.barber}</span>
                            <span className="text-white font-bold uppercase">{myTicketObj.barberName}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTicketId(null);
                          localStorage.removeItem('barber_active_ticket_id');
                          setClientScreen('welcome');
                        }}
                        className="w-full bg-[var(--brand-color)] text-[#07090E] rounded-2xl py-4.5 px-6 font-black uppercase tracking-wider hover:bg-[var(--brand-hover)] transition shadow-lg shadow-[var(--brand-color)]/20 text-center cursor-pointer font-mono mt-8 text-sm"
                      >
                        {language === 'pt-BR' ? 'NOVO ATENDIMENTO' : 'NEW SERVICE'}
                      </button>
                    </div>
                  ) : myTicketObj.status === 'NAO_COMPARECEU' ? (
                    <div className="flex-1 flex flex-col justify-between items-center text-center py-6">
                      <div className="space-y-6 max-w-sm my-auto">
                        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-500/20 shadow-lg shadow-rose-500/5 animate-bounce">
                          <AlertTriangle className="w-10 h-10 stroke-[3]" />
                        </div>
                        <div className="space-y-3">
                          <h2 className="text-2xl font-black uppercase tracking-wider font-mono text-rose-500">
                            {language === 'pt-BR' ? 'ATENDIMENTO ENCERRADO' : 'SERVICE TERMINATED'}
                          </h2>
                          <p className="text-[var(--brand-color)] text-sm font-mono font-black uppercase tracking-wide">
                            {language === 'pt-BR' ? 'Você não compareceu' : 'No-Show / Absent'}
                          </p>
                          <p className="text-gray-400 text-xs font-mono uppercase leading-relaxed leading-normal">
                            {language === 'pt-BR' 
                              ? 'O barbeiro aguardou por você no horário reservado, mas o tempo limite de espera foi excedido. Conforme nossa política aceita no agendamento, esta reserva não é reembolsável.' 
                              : 'The barber waited for you at the reserved time, but the waiting limit was exceeded. In accordance with our policy accepted during booking, this reservation is non-refundable.'}
                          </p>
                        </div>
                        
                        <div className="bg-[#101622] rounded-2xl border border-white/5 p-4.5 font-mono text-xs text-left">
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-gray-500 uppercase">{t.yourTicket}</span>
                            <strong className="text-white text-base">{myTicketObj.number}</strong>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-gray-500 uppercase">{t.barber}</span>
                            <span className="text-white font-bold uppercase">{myTicketObj.barberName}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-white/5 mt-2">
                            <span className="text-gray-500 uppercase">{language === 'pt-BR' ? 'Hora Agendada' : 'Scheduled Time'}</span>
                            <span className="text-white font-bold">
                              {new Date(myTicketObj.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-gray-500 uppercase">{language === 'pt-BR' ? 'Hora Falta' : 'Missed Time'}</span>
                            <span className="text-white font-bold">
                              {myTicketObj.completedAt 
                                ? new Date(myTicketObj.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTicketId(null);
                          localStorage.removeItem('barber_active_ticket_id');
                          setClientScreen('welcome');
                        }}
                        className="w-full bg-[#101622] text-gray-300 rounded-2xl py-4.5 px-6 font-bold uppercase tracking-wider hover:bg-[#152033] transition border border-white/10 text-center cursor-pointer font-mono mt-8 text-sm"
                      >
                        {language === 'pt-BR' ? 'PEGAR NOVA SENHA' : 'GET NEW TICKET'}
                      </button>
                    </div>
                  ) : myTicketObj.status === 'CANCELADO' ? (
                    <div className="flex-1 flex flex-col justify-between items-center text-center py-6">
                      <div className="space-y-6 max-w-sm my-auto">
                        <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-500/20 shadow-lg shadow-rose-500/5 animate-pulse">
                          <X className="w-10 h-10 stroke-[3]" />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-2xl font-black uppercase tracking-wider font-mono text-white">
                            {language === 'pt-BR' ? 'SENHA CANCELADA' : 'TICKET CANCELLED'}
                          </h2>
                          <p className="text-gray-400 text-sm font-mono leading-relaxed uppercase">
                            {language === 'pt-BR' 
                              ? 'Esta senha foi cancelada pelo barbeiro ou expirou.' 
                              : 'This ticket has been cancelled by the barber or has expired.'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTicketId(null);
                          localStorage.removeItem('barber_active_ticket_id');
                          setClientScreen('welcome');
                        }}
                        className="w-full bg-[#101622] text-gray-300 rounded-2xl py-4 px-6 font-bold uppercase tracking-wider hover:bg-[#152033] transition border border-white/10 text-center cursor-pointer font-mono mt-8"
                      >
                        {language === 'pt-BR' ? 'VOLTAR AO INÍCIO' : 'BACK TO START'}
                      </button>
                    </div>
                  ) : (myTicketObj.status === 'AGUARDANDO' || myTicketObj.status === 'CHAMADO' || myTicketObj.status === 'EM_ATENDIMENTO') ? (
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {/* Upper title */}
                        <div className="text-center mt-2 mb-6">
                          {myTicketObj.status === 'AGUARDANDO' ? (
                            <>
                              <h2 className="text-2xl font-black tracking-wider text-white uppercase font-mono">
                                {t.inLine}
                              </h2>
                              <p className="text-xs text-gray-400 uppercase tracking-widest font-mono mt-1">
                                {t.trackPosition}
                              </p>
                            </>
                          ) : (
                            <>
                              <h2 className="text-2xl font-black tracking-wider text-[var(--brand-color)] uppercase font-mono animate-pulse flex items-center justify-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[var(--brand-color)] animate-ping" />
                                {language === 'pt-BR' ? 'SUA VEZ CHEGOU!' : 'IT IS YOUR TURN!'}
                              </h2>
                              <p className="text-xs text-emerald-400 uppercase tracking-widest font-mono mt-1 font-black animate-bounce">
                                {language === 'pt-BR' ? '📢 APRESENTE-SE IMEDIATAMENTE!' : '📢 PRESENT YOURSELF IMMEDIATELY!'}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Live queue + Logo side-by-side card matching design image exactly */}
                        <div className="flex items-stretch gap-3 mb-6">
                          {/* Left: Beautiful Logo Square wrapper */}
                          <div className="w-[110px] bg-[#101622] rounded-2xl border border-white/5 flex flex-col items-center justify-center p-3 shrink-0 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-8 h-8 bg-white/5 rounded-br-full"></div>
                            <div className="w-16 h-16 rounded-xl border border-white/15 bg-[#080B11] p-1 flex items-center justify-center overflow-hidden">
                              {syncState?.settings.logoUrl ? (
                                <img 
                                  src={syncState.settings.logoUrl} 
                                  alt="logo" 
                                  className="w-full h-full object-cover rounded-lg" 
                                  referrerPolicy="no-referrer" 
                                />
                              ) : (
                                <Scissors className="text-[var(--brand-color)] w-7 h-7" />
                              )}
                            </div>
                          </div>

                          {/* Right: Live Queue Card */}
                          <div className="flex-1 bg-[#101622] rounded-2xl p-4 border border-white/5 shadow-lg flex flex-col justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-[var(--brand-color)] uppercase tracking-widest font-mono">
                              <Clock className="w-3.5 h-3.5 animate-pulse text-[var(--brand-color)]" />
                              <span>{t.liveQueue}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="bg-[#080B11] p-1.5 rounded-xl border border-white/5 text-center flex flex-col justify-center min-h-[52px]">
                                <span className="text-[7.5px] uppercase font-bold text-gray-500 tracking-wider font-mono">
                                  {language === 'pt-BR' ? 'SENHA CORRENTE' : 'CURRENT TICKET'}
                                </span>
                                <span className="text-base font-black font-mono text-[var(--brand-color)] block mt-0.5 animate-pulse">
                                  {getCurrentTicketNum()}
                                </span>
                              </div>
                              <div className="bg-[#080B11] p-1.5 rounded-xl border border-white/5 text-center flex flex-col justify-center min-h-[52px]">
                                <span className="text-[7.5px] uppercase font-bold text-gray-400 tracking-wider font-mono">
                                  {language === 'pt-BR' ? 'TEMPO MÉDIO' : 'AVG TIME'}
                                </span>
                                <span className="text-xs font-black font-mono text-white block mt-0.5 whitespace-nowrap">
                                  ~{waitTimeMin} MIN
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {myTicketObj.status === 'AGUARDANDO' && countAhead === 0 && (
                          <div className="space-y-3 mb-6">
                            <div className="p-4 bg-[var(--brand-color)]/10 border border-[var(--brand-color)]/30 rounded-2xl text-center text-xs font-mono font-black text-[var(--brand-color)] uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[var(--brand-color)] animate-ping" />
                              <span>{language === 'pt-BR' ? 'Você já vai ser atendido!' : 'You are about to be served!'}</span>
                            </div>

                            {nextInLineTime && (currentTimestamp - nextInLineTime) >= 300000 && (
                              <div className="p-4 bg-rose-600/10 border-2 border-rose-500/30 rounded-2xl text-center text-xs font-mono font-black text-rose-500 uppercase tracking-widest animate-pulse flex flex-col items-center justify-center gap-2">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
                                  <span>{language === 'pt-BR' ? '⚠️ ATENÇÃO: DIRIGIR-SE AO LOCAL!' : '⚠️ ATTENTION: GO TO LOCATION!'}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold normal-case leading-relaxed">
                                  {language === 'pt-BR' 
                                    ? 'Se passaram 5 minutos e o atendimento ainda não foi iniciado. Por favor, vá imediatamente ao local.' 
                                    : '5 minutes have passed and the barber has not started yet. Please head to the location immediately.'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Large Ticket display */}
                        <div className="bg-[#101622] rounded-3xl border border-white/5 p-6 text-center shadow-xl mb-6 relative overflow-hidden">
                          <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest block font-mono">
                            {t.yourTicket}
                          </span>
                          <span className="text-6xl font-black tracking-wider text-white font-mono block mt-2 select-none">
                            {myTicketObj.number}
                          </span>

                          {/* Detail Table */}
                          <div className="bg-[#080B11]/50 rounded-2xl border border-white/5 p-4.5 font-mono text-xs text-left mt-6 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 uppercase tracking-wide text-[9.5px] font-bold">{t.barber}</span>
                              <strong className="text-white uppercase font-black text-sm leading-none bg-[#101622] border border-white/5 px-2.5 py-1.5 rounded-md">{myTicketObj.barberName}</strong>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 uppercase tracking-wide text-[9.5px] font-bold">{t.service}</span>
                              <strong className="text-white uppercase font-bold text-sm leading-none">{myTicketObj.serviceName}</strong>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/5 pt-2.5">
                              <span className="text-gray-500 uppercase tracking-wide text-[9.5px] font-bold">{t.value}</span>
                              <strong className={`font-black text-sm leading-none ${myTicketObj.prepaidAmount && myTicketObj.prepaidAmount > 0 ? "text-white" : "text-[var(--brand-color)] text-lg"}`}>
                                £{myTicketObj.price.toFixed(2)}
                              </strong>
                            </div>
                            {myTicketObj.prepaidAmount !== undefined && myTicketObj.prepaidAmount > 0 && (
                              <>
                                <div className="flex justify-between items-center border-t border-dashed border-white/5 pt-2">
                                  <span className="text-emerald-500 uppercase tracking-wide text-[9.5px] font-bold">
                                    {language === 'pt-BR' ? '✓ Pago Online (Sinal)' : '✓ Prepaid Online'}
                                  </span>
                                  <strong className="text-emerald-400 font-bold text-xs leading-none">
                                    -£{myTicketObj.prepaidAmount.toFixed(2)}
                                  </strong>
                                </div>
                                <div className="flex justify-between items-center border-t border-white/10 pt-2.5">
                                  <span className="text-gray-300 uppercase tracking-wide text-[10px] font-black">
                                    {language === 'pt-BR' ? 'A PAGAR NO LOCAL' : 'REMAINING ON SITE'}
                                  </span>
                                  <strong className="text-[var(--brand-color)] font-black text-lg leading-none">
                                    £{Math.max(0, myTicketObj.price - myTicketObj.prepaidAmount).toFixed(2)}
                                  </strong>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Expected clock time of service */}
                          <div className="mt-4 py-2.5 px-4 bg-[#080B11] rounded-xl border border-white/5 inline-flex items-center gap-2 w-full justify-center">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-[9px] font-bold text-gray-400 font-mono uppercase tracking-wider">
                              {language === 'pt-BR' ? 'PREVISÃO DE ATENDIMENTO:' : 'ESTIMATED START:'}
                            </span>
                            <strong className="text-[var(--brand-color)] text-lg font-black font-mono tracking-widest bg-[var(--brand-color)]/10 px-2 py-0.5 border border-[var(--brand-color)]/15 rounded-md leading-none">{clockTimeStr}</strong>
                          </div>

                          {/* CHAT WITH BARBER BUTTON */}
                          <div className="mt-4">
                            <button
                              onClick={() => setShowClientChat(!showClientChat)}
                              className={`w-full py-3.5 px-5 rounded-2xl border font-mono text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                                showClientChat
                                  ? 'bg-[var(--brand-color)] text-[#07090E] border-[var(--brand-color)] shadow-[var(--brand-color)]/10'
                                  : 'bg-[#101622] hover:bg-[#152033] text-gray-300 border border-white/10 hover:border-white/20'
                              }`}
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span>
                                {showClientChat
                                  ? (language === 'pt-BR' ? 'FECHAR CHAT' : 'CLOSE CHAT')
                                  : (language === 'pt-BR' ? 'CHAT COM O BARBEIRO' : 'CHAT WITH BARBER')}
                              </span>
                              {myTicketObj.messages && myTicketObj.messages.length > 0 && !showClientChat && (
                                <span className="bg-rose-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center border font-black border-[#101622] shadow shrink-0 animate-bounce">
                                  {myTicketObj.messages.length}
                                </span>
                              )}
                            </button>
                          </div>

                          {showClientChat && (
                            <div className="mt-3 bg-[#101622] rounded-2xl border border-white/5 p-4 text-left flex flex-col h-[320px]">
                              <h4 className="text-[10px] font-bold text-[var(--brand-color)] uppercase tracking-wider font-mono mb-3">
                                {language === 'pt-BR' ? 'CONVERSA COM' : 'CHAT WITH'} {myTicketObj.barberName}
                              </h4>

                              {/* Message History */}
                              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4 font-mono text-xs flex flex-col">
                                {!myTicketObj.messages || myTicketObj.messages.length === 0 ? (
                                  <div className="text-gray-600 text-center my-auto italic uppercase font-bold text-[10px]">
                                    {language === 'pt-BR' ? 'Nenhuma mensagem ainda.' : 'No messages yet.'}
                                  </div>
                                ) : (
                                  myTicketObj.messages.map((msg) => {
                                    const isClient = msg.sender === 'client';
                                    return (
                                      <div key={msg.id} className={`flex flex-col max-w-[85%] ${isClient ? 'self-end items-end' : 'self-start items-start'}`}>
                                        <span className="text-[7.5px] text-gray-500 font-bold uppercase mb-0.5">
                                          {isClient ? (language === 'pt-BR' ? 'Você' : 'You') : myTicketObj.barberName}
                                        </span>
                                        <div className={`px-3 py-1.5 rounded-2xl ${isClient ? 'bg-[var(--brand-color)] text-[#07090E] font-bold rounded-tr-none' : 'bg-white/5 text-gray-100 rounded-tl-none border border-white/5'}`}>
                                          <p className="leading-tight break-all">{msg.text}</p>
                                        </div>
                                        <span className="text-[7px] text-gray-600 font-mono mt-0.5">
                                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Message input form */}
                              <form
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  if (!clientMessageInput.trim()) return;
                                  try {
                                    const res = await fetch(`/api/tickets/${myTicketObj.id}/messages`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ sender: 'client', text: clientMessageInput })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      setClientMessageInput('');
                                      fetchState();
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="flex gap-2"
                              >
                                <input
                                  type="text"
                                  placeholder={language === 'pt-BR' ? 'ESCREVA UMA MENSAGEM...' : 'WRITE A MESSAGE...'}
                                  value={clientMessageInput}
                                  onChange={(e) => setClientMessageInput(e.target.value)}
                                  className="flex-1 bg-[#080B11] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 font-bold tracking-wide focus:outline-none focus:border-[var(--brand-color)] transition font-mono uppercase"
                                />
                                <button
                                  type="submit"
                                  className="bg-[var(--brand-color)] text-[#07090E] rounded-xl px-4 py-2.5 flex items-center justify-center font-bold hover:bg-[var(--brand-hover)] cursor-pointer transition shadow shadow-[var(--brand-color)]/10"
                                >
                                  <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                                </button>
                              </form>
                            </div>
                          )}

                          {/* DYNAMIC CHECK-IN (ESTOU NO LOCAL / CHEGUEI) */}
                          <div className="mt-4">
                            {myTicketObj.checkedIn ? (
                              <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-2xl p-4 text-center font-mono space-y-1.5">
                                <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-black text-[10px] uppercase tracking-wider">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                  {language === 'pt-BR' ? '✓ CHECK-IN REALIZADO' : '✓ CHECK-IN COMPLETED'}
                                </div>
                                <p className="text-[8.5px] text-gray-400 font-bold uppercase leading-normal">
                                  {language === 'pt-BR' 
                                    ? `Coord. enviadas às ${new Date(myTicketObj.checkedInAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                                    : `Coord. sent at ${new Date(myTicketObj.checkedInAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                </p>
                                <div className="text-lg font-black text-white tracking-wide">
                                  {myTicketObj.distanceToSalon !== undefined ? (
                                    myTicketObj.distanceToSalon <= 30 ? (
                                      <span className="text-emerald-400 text-xs font-black uppercase">
                                        {language === 'pt-BR' ? 'Você chegou! / Está no local' : 'You have arrived! / On-site'}
                                      </span>
                                    ) : (
                                      <span className="text-xs">
                                        {language === 'pt-BR' ? 'Distância:' : 'Distance:'}{' '}
                                        <span className="text-[var(--brand-color)]">
                                          {myTicketObj.distanceToSalon < 1000 
                                            ? `${myTicketObj.distanceToSalon}m` 
                                            : `${(myTicketObj.distanceToSalon / 1000).toFixed(2)} km`}
                                        </span>
                                        <span className="text-[9px] text-gray-500 font-bold block mt-0.5">
                                          (~{(myTicketObj.distanceToSalon * 0.000621371).toFixed(2)} {language === 'pt-BR' ? 'milhas' : 'miles'})
                                        </span>
                                      </span>
                                    )
                                  ) : (
                                    '--'
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (navigator.geolocation) {
                                    navigator.geolocation.getCurrentPosition(
                                      async (position) => {
                                        try {
                                          const checkinRes = await fetch(`/api/tickets/${myTicketObj.id}/checkin`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              latitude: position.coords.latitude,
                                              longitude: position.coords.longitude
                                            })
                                          });
                                          if (checkinRes.ok) {
                                            await fetchState();
                                            alert(language === 'pt-BR'
                                              ? 'Check-in concluído! O barbeiro foi notificado da sua chegada.'
                                              : 'Check-in complete! The barber has been notified or your arrival.'
                                            );
                                          } else {
                                            const errData = await checkinRes.json();
                                            alert(errData.error || 'Erro no check-in.');
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          alert(language === 'pt-BR' ? 'Erro ao conectar ao servidor.' : 'Connection error.');
                                        }
                                      },
                                      (error) => {
                                        let msgPr = '';
                                        if (error.code === error.PERMISSION_DENIED) {
                                          msgPr = language === 'pt-BR' 
                                            ? 'Permissão de localização negada. Se estiver no iFrame do AI Studio, use o botão "Abrir em nova aba" no topo para autorizar.'
                                            : 'Location permission denied. If inside the AI Studio preview, click "Open in browser" at the top to authorize.';
                                        } else {
                                          msgPr = language === 'pt-BR'
                                            ? 'Não foi possível ler as coordenadas do seu dispositivo.'
                                            : 'Could not fetch device coordinates.';
                                        }
                                        alert(msgPr);
                                      }
                                    );
                                  } else {
                                    alert(language === 'pt-BR' 
                                      ? 'Navegador sem suporte a geolocalização.' 
                                      : 'Browser does not support geolocation.'
                                    );
                                  }
                                }}
                                className="w-full py-3.5 px-5 bg-white text-black hover:bg-gray-100 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95"
                              >
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-red-500 animate-bounce" />
                                <span>{language === 'pt-BR' ? 'Estou no local / Cheguei' : 'I am on-site / I arrived'}</span>
                              </button>
                            )}
                          </div>



                          {/* CANCELAR MINHA SENHA BUTTON PLACED BELOW CHAT BUTTON */}
                          <div className="mt-4 space-y-3">
                            {!isConfirmingCancel ? (
                              <button
                                onClick={() => setIsConfirmingCancel(true)}
                                className="w-full bg-[#EF4444] hover:bg-rose-500 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 font-black uppercase tracking-wider transition-colors duration-150 shadow-lg shadow-rose-950/20 text-center cursor-pointer font-mono text-xs leading-none"
                              >
                                <X className="w-4 h-4 text-white/85" />
                                <span>{t.cancelTicket}</span>
                              </button>
                            ) : (
                              <>
                                <div className="text-center text-xs text-rose-400 font-bold uppercase font-mono py-1.5 rounded-xl bg-rose-500/5 border border-rose-500/10 w-full mb-1">
                                  {t.confirmCancel}
                                </div>
                                <button
                                  onClick={handleCancelTicket}
                                  className="w-full bg-rose-600 hover:bg-rose-500 text-white rounded-2xl py-3.5 font-black uppercase tracking-wider transition-colors duration-150 text-center cursor-pointer font-mono text-xs leading-none shadow-lg shadow-rose-950/40"
                                >
                                  {language === 'pt-BR' ? 'SIM, CANCELAR MINHA SENHA' : 'YES, CANCEL MY TICKET'}
                                </button>
                                <button
                                  onClick={() => setIsConfirmingCancel(false)}
                                  className="w-full bg-[#101622] hover:bg-[#152033] text-gray-300 rounded-2xl py-3.5 font-bold uppercase tracking-wider border border-white/10 transition text-center cursor-pointer font-mono text-xs"
                                >
                                  {language === 'pt-BR' ? 'VOLTAR' : 'BACK'}
                                </button>
                              </>
                            )}
                          </div>




                        </div>
                      </div>


                    </div>
                  ) : null}
                </div>
              )}

              {/* Copyright of the client panel */}
              <div className="mt-8 pt-4 border-t border-white/5 flex flex-col items-center gap-2 font-mono pb-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  © 2026 HERRANZ. TODOS OS DIREITOS RESERVADOS.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 💈 BARBER VIEW                                            */}
          {/* ========================================================= */}
          {currentNamespace === 'barber' && (
            <div className="flex-1 flex flex-col bg-[#080B11] p-4 sm:p-6 md:p-8">
              
              {/* LOGIN SCREEN (IMAGE 3) */}
              {!isAuthenticatedBarber && barberScreen === 'login' && (() => {
                const now = new Date();
                const currentRealMonth = now.getMonth() + 1;
                const currentRealYear = now.getFullYear();
                const currentRealMonthLabel = (monthsList.find(m => m.value === currentRealMonth)?.label || '').toUpperCase();
                return (
                  <div className="max-w-md w-full mx-auto my-auto bg-[#101622] rounded-2xl border border-white/5 p-6 shadow-2xl relative">
                    
                    {/* Brand Header */}
                    <div className="flex flex-col items-center text-center mt-4 mb-8">
                      <div className="w-16 h-16 rounded-full border-2 border-[var(--brand-color)] p-0.5 bg-[#080B11] mb-4 flex items-center justify-center shadow-lg shadow-[var(--brand-color)]/10 overflow-hidden">
                        {syncState?.settings.logoUrl ? (
                          <img 
                            src={syncState.settings.logoUrl} 
                            alt="Logo" 
                            className="w-full h-full object-cover rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Scissors className="w-8 h-8 text-[var(--brand-color)]" />
                        )}
                      </div>
                      <h2 className="text-xl font-black tracking-wider text-white uppercase font-mono">
                        {syncState?.settings.name || 'JCHFDKJLSK'} ADMIN
                      </h2>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500 block mt-1">
                        LOGIN ACESSO / ÁREA RESTRITA
                      </span>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-[var(--brand-color)] font-mono tracking-wider flex items-center justify-between">
                          <span>CÓDIGO DE ACESSO ({currentRealMonthLabel} {currentRealYear})</span>
                        </label>
                        <input 
                          type="password" 
                          placeholder="DIGITE O CÓDIGO"
                          value={monthlyCodeInput}
                          onChange={(e) => setMonthlyCodeInput(e.target.value)}
                          className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3.5 text-center text-sm font-bold tracking-widest font-mono text-[var(--brand-color)] focus:outline-none focus:border-[var(--brand-color)] transition"
                          onKeyDown={(e) => e.key === 'Enter' && handleBarberLogin()}
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={handleBarberLogin}
                        className="w-full bg-[var(--brand-color)] text-[#07090E] rounded-xl py-3.5 px-4 font-bold uppercase tracking-wider hover:bg-[var(--brand-hover)] transition cursor-pointer text-sm font-mono text-center flex items-center justify-center transform active:scale-[0.98]"
                      >
                        ENTRAR NO PAINEL
                      </button>
                      
                      <p className="text-[10px] text-center text-gray-500 font-mono mt-1 leading-relaxed">
                        DIGITE O CÓDIGO DE ACESSO MENSAL ENVIADO PELO GERENTE/ADMINISTRADOR DO LICENCIAMENTO PARA LIBERAR O SEU PAINEL DE ATENDIMENTOS DESTE MÊS.
                      </p>

                      <div className="pt-3 border-t border-white/5 flex flex-col items-center">
                        <button
                          onClick={() => {
                            const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                            setPwaActiveTab(isIosDevice ? 'ios' : 'android');
                            setShowPwaHelpModal(true);
                          }}
                          className="text-[var(--brand-color)] hover:text-[var(--brand-hover)] font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer bg-transparent border-0 py-1"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>SALVAR COMO APP NO CELULAR 📱</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* BARBER BACKEND DASHBOARD (IMAGE 1 & 2) */}
              {isAuthenticatedBarber && (
                <div className="max-w-6xl w-full mx-auto space-y-6 flex-1 flex flex-col justify-between">
                  
                  {/* Dashboard Header tab switches */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border border-white/10 p-0.5 bg-[#101622] overflow-hidden flex items-center justify-center shrink-0">
                        {syncState?.settings.logoUrl ? (
                          <img 
                            src={syncState.settings.logoUrl} 
                            alt="Logo" 
                            className="w-full h-full object-cover rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Scissors className="w-5 h-5 text-[var(--brand-color)]" />
                        )}
                      </div>
                      <div>
                        <h1 className="text-xl font-mono font-extrabold tracking-wider uppercase text-white">
                          {syncState?.settings.name || 'JCHFDKJLSK'}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--brand-color)] font-bold">
                            PAINEL ADMINISTRATIVO 
                          </span>
                          <span className="text-gray-600 text-[10px] font-bold">•</span>
                          <button
                            type="button"
                            onClick={handleToggleOnlineOffline}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest font-mono border cursor-pointer transition uppercase flex items-center gap-1 shrink-0 ${
                              syncState?.settings.isOnline !== false
                                ? 'bg-[#101622]/80 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-[#101622]/80 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                            }`}
                            title="Clique para alterar o estado de funcionamento da barbearia (Online/Offline)"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${syncState?.settings.isOnline !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                            {syncState?.settings.isOnline !== false ? "LOJA ONLINE" : "LOJA OFFLINE"}
                          </button>
                        </div>
                      </div>
                    </div>

                     {/* Navigation bar and Action triggers */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* QR Code de Acesso */}
                      <button
                        onClick={() => setShowQrModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-[#101622] hover:bg-[var(--brand-color)] text-gray-400 hover:text-[#07090E] border border-white/5 hover:border-transparent transition flex items-center gap-2 cursor-pointer text-xs font-bold font-mono uppercase tracking-wider"
                        title="Gerar QR Code para acesso do cliente"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>QR CODE</span>
                      </button>

                      {/* Link Externo Painel Monitor TV */}
                      <button
                        onClick={() => window.open(window.location.origin + '?view=tv', '_blank')}
                        className="px-3.5 py-2 rounded-xl bg-[#101622] hover:bg-[var(--brand-color)] text-gray-400 hover:text-[#07090E] border border-white/5 hover:border-transparent transition flex items-center gap-2 cursor-pointer text-xs font-bold font-mono uppercase tracking-wider mr-2"
                        title="Abrir URL do painel de senhas no monitor ou TV"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>TV MONITOR</span>
                      </button>

                      {/* PWA Mobile App Installation button */}
                      <button
                        onClick={() => {
                          const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                          setPwaActiveTab(isIosDevice ? 'ios' : 'android');
                          setShowPwaHelpModal(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#101622] hover:bg-[var(--brand-color)] text-gray-400 hover:text-[#07090E] border border-white/5 hover:border-transparent transition flex items-center gap-2 cursor-pointer text-xs font-bold font-mono uppercase tracking-wider mr-2"
                        title="Salvar este painel como aplicativo no celular"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>SALVAR APP</span>
                      </button>

                      <button
                        onClick={() => setBarberScreen('dashboard')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase font-mono tracking-wider cursor-pointer transition ${
                          barberScreen === 'dashboard' 
                            ? 'bg-[var(--brand-color)] text-[#07090E]' 
                            : 'bg-[#101622] text-gray-400 hover:text-white border border-white/5'
                        }`}
                      >
                        📊 PAINEL DO DIA
                      </button>
                      <button
                        onClick={() => {
                          setBarberScreen('settings');
                          if (syncState) {
                            setSettingsForm(syncState.settings);
                            setLocalBarbers(syncState.barbers);
                            setLocalServices(syncState.services);
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase font-mono tracking-wider cursor-pointer transition ${
                          barberScreen === 'settings' 
                            ? 'bg-[var(--brand-color)] text-[#07090E]' 
                            : 'bg-[#101622] text-gray-400 hover:text-white border border-white/5'
                        }`}
                      >
                        ⚙️ CONFIGURAÇÕES
                      </button>
                      <button
                        onClick={() => {
                          setIsAuthenticatedBarber(false);
                          localStorage.removeItem('barber_is_auth');
                          setBarberScreen('login');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-red-600/10 hover:text-red-500 text-gray-400 font-mono tracking-wider uppercase flex items-center gap-1 cursor-pointer transition"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>SAIR</span>
                      </button>
                    </div>
                  </div>

                  {/* DASHBOARD VIEW (IMAGE 1) */}
                  {barberScreen === 'dashboard' && (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Barbers list selections slots */}
                        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2.5 sm:gap-4">
                          {syncState?.barbers.map(barber => {
                            const waitingCount = syncState.tickets.filter(t => t.barberId === barber.id && t.status === 'AGUARDANDO').length;
                            const isSelected = selectedDashboardBarberId === barber.id;
                            return (
                              <div key={barber.id} className="flex flex-col gap-2 w-full md:w-auto">
                                {/* Name Square (Quadrado do Nome) */}
                                <button
                                  onClick={() => setSelectedDashboardBarberId(barber.id)}
                                  className={`w-full md:w-44 h-22 rounded-2xl border flex flex-col justify-between p-3.5 sm:p-4.5 transition cursor-pointer relative overflow-hidden ${
                                    isSelected 
                                      ? 'bg-[#101622] border-[var(--brand-color)] text-white shadow-xl shadow-[var(--brand-color)]/5' 
                                      : 'bg-[#101622]/50 border-white/5 text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {/* Barber status indicator dot */}
                                  <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 flex items-center gap-1.5 bg-[#080B11] py-0.5 sm:py-1 px-1.5 sm:px-2 rounded-full border border-white/5">
                                    <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${barber.active ? 'bg-[var(--brand-color)]' : 'bg-rose-500 animate-pulse'}`}></span>
                                    <span className="text-[7px] sm:text-[7.5px] font-black uppercase font-mono tracking-wider">
                                      {barber.active ? 'ON' : 'OFF'}
                                    </span>
                                  </div>
                                  
                                  <div className="mt-4 sm:mt-6 text-left">
                                    {/* Span name has size exactly 16px (text-base) */}
                                    <span className={`text-base font-black font-mono tracking-wider uppercase block truncate max-w-[125px] transition-all ${
                                      hasUnreadMessagesForBarber(barber.id) ? 'animate-custom-blink text-red-500' : ''
                                    }`}>
                                      {barber.name} {hasUnreadMessagesForBarber(barber.id) && '💬'}
                                    </span>
                                    <span className="text-[8px] sm:text-[8.5px] uppercase font-mono text-gray-500 tracking-widest mt-0.5 sm:mt-1 block font-bold">
                                      {barber.active ? 'DISPONÍVEL' : 'OFFLINE'}
                                    </span>
                                  </div>
                                </button>

                                {/* Waiting quantity square below (Outro Quadrado de Senha Aguardando) */}
                                <div className={`w-full md:w-44 h-16 sm:h-20 rounded-2xl border flex flex-col justify-center items-center font-mono transition p-2.5 sm:p-3 text-center ${
                                  isSelected 
                                    ? 'bg-[#101622] border-[var(--brand-color)]/40 text-white' 
                                    : 'bg-[#101622]/20 border-white/5 text-gray-400'
                                }`}>
                                  <span className="text-[8px] sm:text-[8.5px] uppercase font-bold text-gray-500 tracking-wider block">
                                    {language === 'pt-BR' ? 'AGUARDANDO' : 'WAITING TKT'}
                                  </span>
                                  <span className={`text-xl sm:text-2xl font-black mt-0.5 sm:mt-1 ${waitingCount > 0 ? 'text-[var(--brand-color)]' : 'text-gray-600'}`}>
                                    {waitingCount}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Barber Control Board card */}
                        {selectedDashboardBarberId && (
                          <div className="bg-[#101622] rounded-2xl border border-white/5 p-6 shadow-xl mt-6 space-y-6">
                            
                            {/* Control triggers */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-5">
                              {/* Left Column: Barber Name & ON/OFF State */}
                              <div className="flex flex-col items-start gap-2">
                                <div>
                                  <span className="text-[10px] font-bold text-gray-500 tracking-wider font-mono block uppercase">
                                    PAINEL ADMINISTRATIVO
                                  </span>
                                  <h3 className="text-2xl font-black text-white tracking-widest font-mono uppercase mt-1">
                                    {syncState?.barbers.find(b => b.id === selectedDashboardBarberId)?.name || 'BARBEIRO'}
                                  </h3>
                                </div>

                                {/* DIV - BOTAO ON OFF COLOCAR EMBAIXO DO H3 NOME DO BARBEIRO */}
                                <div 
                                  className="flex items-center bg-[#080B11] rounded-xl border border-white/5 font-mono shadow-inner p-0.5 justify-between"
                                  style={{ fontScale: 1, fontSize: '13px', width: '98.6px', height: '29.5875px' }}
                                >
                                  <button
                                    onClick={async () => {
                                      const bObj = syncState?.barbers.find(b => b.id === selectedDashboardBarberId);
                                      if (bObj && !bObj.active) {
                                        await fetch('/api/barbers', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ ...bObj, active: true })
                                        });
                                        fetchState();
                                      }
                                    }}
                                    style={{ width: '43.4px', height: '25.9875px', padding: 0 }}
                                    className={`rounded-lg text-[10px] font-black uppercase tracking-wider transition duration-150 cursor-pointer flex items-center justify-center ${
                                      syncState?.barbers.find(b => b.id === selectedDashboardBarberId)?.active
                                        ? 'bg-[var(--brand-color)] text-[#07090E] shadow hover:bg-[var(--brand-hover)]'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                                  >
                                    ON
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const bObj = syncState?.barbers.find(b => b.id === selectedDashboardBarberId);
                                      if (bObj && bObj.active) {
                                        await fetch('/api/barbers', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ ...bObj, active: false })
                                        });
                                        fetchState();
                                      }
                                    }}
                                    style={{ width: '43.4px', height: '25.9875px', padding: 0 }}
                                    className={`rounded-lg text-[10px] font-black uppercase tracking-wider transition duration-150 cursor-pointer flex items-center justify-center ${
                                      !syncState?.barbers.find(b => b.id === selectedDashboardBarberId)?.active
                                        ? 'bg-rose-600 text-white shadow shadow-rose-900/25 hover:bg-rose-700'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                                  >
                                    OFF
                                  </button>
                                </div>
                              </div>

                              {/* Middle Column: Chamar Próximo (top) & Finalizar Atendimento (below) */}
                              <div className="flex flex-col items-center gap-2.5">
                                {(() => {
                                  const calledTkt = syncState?.tickets.find(t => t.barberId === selectedDashboardBarberId && t.status === 'CHAMADO' && isToday(t.createdAt));
                                  const servingTkt = syncState?.tickets.find(t => t.barberId === selectedDashboardBarberId && t.status === 'EM_ATENDIMENTO' && isToday(t.createdAt));

                                  if (calledTkt) {
                                    return (
                                      <button
                                        onClick={() => handleIniciarAtendimento(calledTkt.id)}
                                        style={{ width: '178px', height: '53px' }}
                                        className="bg-[var(--brand-color)] text-[#07090E] rounded-xl text-xs font-black uppercase font-mono tracking-wider hover:bg-[var(--brand-hover)] cursor-pointer transition-all duration-150 flex items-center justify-center gap-1.5 shadow-lg shadow-[var(--brand-color)]/10 transform active:scale-[0.98]"
                                      >
                                        <span>{language === 'pt-BR' ? 'INICIAR ATENDIMENTO' : 'START SERVICE'}</span>
                                        <Play className="w-4 h-4 shrink-0 fill-current" />
                                      </button>
                                    );
                                  } else {
                                    return (
                                      <button
                                        onClick={() => handleChamarProximo(selectedDashboardBarberId)}
                                        disabled={!!servingTkt}
                                        style={{ width: '178px', height: '53px' }}
                                        className={`rounded-xl text-xs font-black uppercase font-mono tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 shadow-lg transform ${
                                          servingTkt 
                                            ? 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed opacity-50 shadow-none' 
                                            : 'bg-[var(--brand-color)] text-[#07090E] hover:bg-[var(--brand-hover)] cursor-pointer shadow-[var(--brand-color)]/10 active:scale-[0.98]'
                                        }`}
                                      >
                                        <span>CHAMAR PRÓXIMO</span>
                                        <ChevronRight className="w-4 h-4 shrink-0 stroke-[3]" />
                                      </button>
                                    );
                                  }
                                })()}

                                {(() => {
                                  const servingTkt = syncState?.tickets.find(t => t.barberId === selectedDashboardBarberId && t.status === 'EM_ATENDIMENTO' && isToday(t.createdAt));
                                  return servingTkt ? (
                                    <button
                                      type="button"
                                      onClick={() => handleFinalizarAtendimento(servingTkt.id)}
                                      style={{ width: '178px' }}
                                      className="bg-red-600 hover:bg-[#BE123C] text-white rounded-lg py-1.5 text-[10px] font-black uppercase font-mono tracking-wider cursor-pointer transition text-center shadow shadow-red-950/20 active:scale-95 animate-pulse"
                                    >
                                      {language === 'pt-BR' ? '✓ FINALIZAR ATENDIMENTO' : '✓ COMPLETE SERVICE'}
                                    </button>
                                  ) : null;
                                })()}
                              </div>

                              {/* Right Column: Não Compareceu (com Confirmação) */}
                              <div className="flex flex-col items-center md:items-end justify-center">
                                {(() => {
                                  const activeTkt = syncState?.tickets.find(
                                    t => t.barberId === selectedDashboardBarberId && 
                                    (t.status === 'EM_ATENDIMENTO' || t.status === 'CHAMADO') && 
                                    isToday(t.createdAt)
                                  );
                                  return activeTkt ? (
                                    <div className="flex flex-col gap-2 bg-[#080B11]/50 border border-white/5 rounded-xl px-3 py-1.5 font-mono shadow-inner w-full max-w-[200px]">
                                      <label className="flex items-center gap-1.5 cursor-pointer text-[9px] text-gray-400 font-bold uppercase select-none justify-center">
                                        <input
                                          type="checkbox"
                                          checked={confirmNoShow}
                                          onChange={(e) => setConfirmNoShow(e.target.checked)}
                                          className="w-3.5 h-3.5 rounded border-white/10 bg-[#080B11] text-[var(--brand-color)] focus:ring-[var(--brand-color)] focus:ring-opacity-25 cursor-pointer accent-[var(--brand-color)]"
                                        />
                                        <span>
                                          {language === 'pt-BR' ? 'Falta / Não Compareceu?' : 'No-Show / Absent?'}
                                        </span>
                                      </label>
                                      
                                      <button
                                        type="button"
                                        disabled={!confirmNoShow}
                                        onClick={() => handleNaoCompareceuAtendimento(activeTkt.id)}
                                        className={`rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider font-mono transition duration-150 cursor-pointer text-center w-full ${
                                          confirmNoShow
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow shadow-rose-950'
                                            : 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed'
                                        }`}
                                      >
                                        {language === 'pt-BR' ? 'NÃO COMPARECEU' : 'NO-SHOW'}
                                      </button>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            </div>

                            {(() => {
                              const activeChatTicket = syncState?.tickets.find(t => t.id === activeChatTicketId);
                              return (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                  <div className={`${activeChatTicket ? 'lg:col-span-8' : 'lg:col-span-12'} overflow-x-auto rounded-xl bg-[#080B11] border border-white/5 transition-all duration-300`}>
                                    <table className="w-full text-left border-collapse font-mono text-xs">
                                      <thead>
                                        <tr className="border-b border-white/5 text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-[#0A0F1A]">
                                          <th className="py-4.5 px-4 font-bold"># SENHA</th>
                                          <th className="py-4.5 px-4 font-bold">NOME</th>
                                          <th className="py-4.5 px-4 font-bold text-center">CHAT</th>
                                          <th className="py-4.5 px-4 font-bold">TIPO DE SERVIÇO</th>
                                          <th className="py-4.5 px-4 text-center font-bold">CLIENTES</th>
                                          <th className="py-4.5 px-4 text-center font-bold">TEMPO</th>
                                          <th className="py-4.5 px-4 text-right font-bold">VALOR</th>
                                          <th className="py-4.5 px-4 text-right font-bold">STATUS</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5 font-medium">
                                        {syncState?.tickets
                                          .filter(t => t.barberId === selectedDashboardBarberId && isToday(t.createdAt))
                                          .sort((a, b) => {
                                            const priority: Record<string, number> = {
                                              'EM_ATENDIMENTO': 1,
                                              'CHAMADO': 1,
                                              'AGUARDANDO': 2,
                                              'FINALIZADO': 3,
                                              'CANCELADO': 4
                                            };
                                            const diff = (priority[a.status] || 99) - (priority[b.status] || 99);
                                            if (diff !== 0) return diff;

                                            // If the status is the same:
                                            if (a.status === 'FINALIZADO' || a.status === 'CANCELADO') {
                                              // Descending order of creation (most recent first)
                                              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                            } else {
                                              // Ascending order of creation for waiting/active queue items
                                              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                                            }
                                          })
                                          .map(ticket => {
                                            const isMyActive = ticket.status === 'EM_ATENDIMENTO' || ticket.status === 'CHAMADO';
                                            return (
                                              <tr key={ticket.id} className={`hover:bg-white/2 transition ${isMyActive ? 'bg-[var(--brand-color)]/5 text-white font-bold' : 'text-gray-400'}`}>
                                                <td className="py-4 px-4 text-white uppercase">{ticket.number}</td>
                                                <td className="py-4 px-4 font-mono">
                                                  <div className="text-white uppercase font-bold text-xs">{ticket.name}</div>
                                                  {ticket.checkedIn ? (
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 normal-case font-mono">
                                                      {ticket.distanceToSalon !== undefined && ticket.distanceToSalon <= 30 ? (
                                                        <span className="bg-emerald-500/10 text-emerald-400 text-[8.5px] font-black uppercase px-2 py-0.5 rounded border border-emerald-500/15 flex items-center gap-1 leading-none shadow-sm">
                                                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                                          {language === 'pt-BR' ? 'Chegou / No local' : 'Arrived / On-site'}
                                                        </span>
                                                      ) : (
                                                        <span className="bg-amber-500/10 text-amber-400 text-[8.5px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/15 flex items-center gap-1 leading-none shadow-sm">
                                                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping shrink-0" />
                                                          <span>
                                                            {ticket.distanceToSalon !== undefined ? (
                                                              ticket.distanceToSalon < 1000 
                                                                ? `${ticket.distanceToSalon}m` 
                                                                : `${(ticket.distanceToSalon / 1000).toFixed(2)} km`
                                                            ) : '--'}
                                                          </span>
                                                          <span className="text-[7.5px] text-amber-400/75 lowercase font-bold tracking-tight">
                                                            (~{((ticket.distanceToSalon || 0) * 0.000621371).toFixed(2)} mi)
                                                          </span>
                                                        </span>
                                                      )}
                                                      
                                                      {ticket.latitude !== undefined && ticket.longitude !== undefined && (
                                                        <a
                                                          href={`https://www.google.com/maps/search/?api=1&query=${ticket.latitude},${ticket.longitude}`}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white rounded px-2 py-0.5 text-[8.5px] font-black uppercase inline-flex items-center gap-1 transition-all leading-none py-1 block cursor-pointer"
                                                        >
                                                          <MapPin className="w-2.5 h-2.5 text-red-500" />
                                                          <span>{language === 'pt-BR' ? 'Ver no Mapa' : 'View on Map'}</span>
                                                        </a>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="text-[8.5px] text-gray-500 mt-1 uppercase font-bold tracking-wider leading-none">
                                                      {language === 'pt-BR' ? '⌛ Sem Check-in' : '⌛ No Check-in'}
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                  <button
                                                    onClick={() => {
                                                      setActiveChatTicketId(ticket.id === activeChatTicketId ? null : ticket.id);
                                                    }}
                                                    className={`relative tracking-normal border px-2.5 py-1.5 rounded-lg font-mono text-[9px] uppercase font-black cursor-pointer flex items-center justify-center gap-1 mx-auto transition-all ${
                                                      ticket.id === activeChatTicketId
                                                        ? 'bg-[var(--brand-color)] text-[#07090E] border-[var(--brand-color)] shadow'
                                                        : (ticket.messages && ticket.messages.length > 0 && ticket.messages[ticket.messages.length - 1].sender === 'client')
                                                          ? 'bg-gradient-to-r from-red-500/15 to-rose-500/15 border-red-500 text-red-500 animate-[pulse_1.5s_infinite]'
                                                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                                                    }`}
                                                  >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    <span>CHAT</span>
                                                    {ticket.messages && ticket.messages.length > 0 && (
                                                      <span className={`absolute -top-1.5 -right-1.5 text-white text-[7px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-[#080B11] shadow transition-all ${
                                                        ticket.messages[ticket.messages.length - 1].sender === 'client'
                                                          ? 'bg-red-600 animate-custom-blink text-[10px]'
                                                          : 'bg-emerald-500'
                                                      }`}>
                                                        {ticket.messages[ticket.messages.length - 1].sender === 'client' ? '💬' : '✓'}
                                                      </span>
                                                    )}
                                                  </button>
                                                </td>
                                                <td className="py-4 px-4 max-w-[150px] truncate">{ticket.serviceName}</td>
                                                <td className="py-4 px-4 text-center">{ticket.adultsCount + ticket.kidsCount}</td>
                                                <td className="py-4 px-4 text-center text-[var(--brand-color)]">~{ticket.estimatedTime} —</td>
                                                <td className="py-4 px-4 text-right font-bold text-white">
                                                   <div>£{ticket.price.toFixed(2)}</div>
                                                   {ticket.prepaidAmount !== undefined && ticket.prepaidAmount > 0 && (
                                                     <div className="text-[9px] text-emerald-400 font-black block mt-1 whitespace-nowrap">
                                                       Sinal: £{ticket.prepaidAmount.toFixed(2)} <span className="text-gray-500 font-bold">| Resta: £{Math.max(0, ticket.price - ticket.prepaidAmount).toFixed(2)}</span>
                                                     </div>
                                                   )}
                                                 </td>
                                                <td className="py-4 px-4 text-right">
                                                  <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase sm:w-auto ${
                                                    ticket.status === 'EM_ATENDIMENTO' ? 'bg-[var(--brand-color)]/20 text-[var(--brand-color)] border border-[var(--brand-color)]/10 animate-pulse' :
                                                    ticket.status === 'CHAMADO' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/10 animate-pulse font-black' :
                                                    ticket.status === 'AGUARDANDO' ? 'bg-blue-600/15 text-blue-400' :
                                                    ticket.status === 'FINALIZADO' ? 'text-emerald-500' :
                                                    ticket.status === 'NAO_COMPARECEU' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-rose-500'
                                                  }`}>
                                                    {ticket.status === 'NAO_COMPARECEU' ? (language === 'pt-BR' ? 'FALTOU' : 'ABSENT') : ticket.status === 'CHAMADO' ? (language === 'pt-BR' ? 'CHAMADO' : 'CALLED') : ticket.status}
                                                  </span>
                                                  <div className="text-[9.5px] text-gray-500 mt-1 uppercase font-bold tracking-wider font-mono">
                                                    {language === 'pt-BR' ? 'Agendado:' : 'Scheduled:'}{' '}
                                                    <span className="text-gray-300">
                                                      {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        {(!syncState?.tickets.filter(t => t.barberId === selectedDashboardBarberId && isToday(t.createdAt)).length) && (
                                          <tr>
                                            <td colSpan={8} className="py-8 text-center text-gray-600 font-bold uppercase font-mono">
                                              Nenhum cliente na fila de hoje.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>

                                  {activeChatTicket && (
                                    <div className="lg:col-span-4 bg-[#101622] rounded-xl border border-white/5 p-5 flex flex-col justify-between h-[450px] shadow-2xl relative">
                                      {/* Barber Chat Header */}
                                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                        <div>
                                          <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--brand-color)] uppercase tracking-wider font-mono">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-color)] animate-pulse" />
                                            <span>CHAT ATIVO</span>
                                          </div>
                                          <h4 className="text-sm font-black text-white uppercase font-mono mt-0.5 max-w-[160px] truncate">
                                            {activeChatTicket.name} ({activeChatTicket.number})
                                          </h4>
                                        </div>
                                        <button
                                          onClick={() => setActiveChatTicketId(null)}
                                          className="p-1 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>

                                      {/* Barber Chat History */}
                                      <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 font-mono text-xs flex flex-col">
                                        {!activeChatTicket.messages || activeChatTicket.messages.length === 0 ? (
                                          <div className="text-gray-600 text-center my-auto italic uppercase font-bold text-[10px]">
                                            Nenhuma mensagem recebida ou enviada ainda.
                                          </div>
                                        ) : (
                                          activeChatTicket.messages.map((msg) => {
                                            const isBarber = msg.sender === 'barber';
                                            return (
                                              <div key={msg.id} className={`flex flex-col max-w-[85%] ${isBarber ? 'self-end items-end' : 'self-start items-start'}`}>
                                                <span className="text-[8px] text-gray-500 font-bold uppercase mb-0.5">
                                                  {isBarber ? 'Você' : activeChatTicket.name}
                                                </span>
                                                <div className={`px-3 py-2 rounded-2xl ${isBarber ? 'bg-[var(--brand-color)] text-[#07090E] font-bold rounded-tr-none' : 'bg-white/5 text-gray-100 rounded-tl-none border border-white/5'}`}>
                                                  <p className="leading-tight break-all">{msg.text}</p>
                                                </div>
                                                <span className="text-[7.5px] text-gray-600 font-mono mt-0.5">
                                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>

                                      {/* Barber Chat Input */}
                                      <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (!barberMessageInput.trim()) return;
                                        try {
                                          const res = await fetch(`/api/tickets/${activeChatTicket.id}/messages`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ sender: 'barber', text: barberMessageInput })
                                          });
                                          const data = await res.json();
                                          if (data.success) {
                                            setBarberMessageInput('');
                                            fetchState();
                                          }
                                        } catch (err) {
                                          console.error(err);
                                        }
                                      }} className="flex gap-2">
                                        <input
                                          type="text"
                                          placeholder="ESCREVA SUA RESPOSTA..."
                                          value={barberMessageInput}
                                          onChange={(e) => setBarberMessageInput(e.target.value)}
                                          className="flex-1 bg-[#080B11] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 font-bold tracking-wide focus:outline-none focus:border-[var(--brand-color)] transition font-mono uppercase"
                                        />
                                        <button
                                          type="submit"
                                          className="bg-[var(--brand-color)] text-[#07090E] rounded-xl px-4 py-2.5 flex items-center justify-center font-bold hover:bg-[var(--brand-hover)] cursor-pointer transition shadow shadow-[var(--brand-color)]/10"
                                        >
                                          <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </button>
                                      </form>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Footer Stat Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {/* Stat 1: Total do dia */}
                        <div className="bg-[#101622] rounded-2xl p-5 border border-white/5 flex items-center justify-between shadow-lg">
                          <div>
                            <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase font-mono block">
                              TOTAL ATENDIDOS HOJE
                            </span>
                            <span className="text-3xl font-black text-white font-mono mt-1 block">
                              {getTotalClientesAtendidos()}
                            </span>
                          </div>
                          <div className="p-3.5 bg-[var(--brand-color)]/10 rounded-xl text-[var(--brand-color)]">
                            <Users className="w-6 h-6" />
                          </div>
                        </div>

                        {/* Stat 2: Faturamento do Barbeiro */}
                        {selectedDashboardBarberId && (
                          <div className="bg-[#101622] rounded-2xl p-5 border border-white/5 flex items-center justify-between shadow-lg">
                            <div>
                              <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase font-mono block">
                                FATURAMENTO DO DIA (FINALIZADO)
                              </span>
                              <span className="text-3xl font-black text-[var(--brand-color)] font-mono mt-1 block">
                                {showFaturamento ? `£${getFaturamentoDoDia(selectedDashboardBarberId).toFixed(2)}` : '••••'}
                              </span>
                            </div>
                            <button 
                              onClick={() => setShowFaturamento(!showFaturamento)}
                              className="p-3.5 bg-[#101622] hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition cursor-pointer border border-white/5"
                            >
                              {showFaturamento ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Clear/Reset manually removed per request */}

                    </div>
                  )}

                  {/* SETTINGS VIEW (IMAGE 2) */}
                  {barberScreen === 'settings' && settingsForm && (
                     <div className="space-y-6">
                       
                       <div className="flex items-center justify-between">
                         <h3 className="text-lg font-bold font-mono tracking-wider uppercase text-white">
                           CONFIGURAÇÕES DA BARBEARIA
                         </h3>
                         <button
                           onClick={handleSaveAllSettings}
                            className="bg-[var(--brand-color)] text-[#07090E] rounded-lg px-2.5 py-1 font-black uppercase text-[9px] tracking-widest cursor-pointer hover:bg-[var(--brand-hover)] shadow-md shadow-[var(--brand-color)]/10 flex items-center gap-1.5 font-mono transition-transform duration-200 active:scale-95"
                         >
                           <CheckCircle className="w-3.5 h-3.5 stroke-[3.5]" />
                           <span>SALVAR TUDO</span>
                         </button>
                       </div>

                       {/* Settings layouts split */}
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start font-mono text-xs">
                         
                         {/* LEFT COLUMN: Identity & social */}
                         <div className="space-y-6">
                           <div className="bg-[#101622] rounded-2xl border border-white/5 p-5 space-y-4">
                           <h4 className="text-xs font-black text-[var(--brand-color)] tracking-widest uppercase border-b border-white/5 pb-2">
                             ⚔️ IDENTIDADE E REDES
                           </h4>

                           {/* Estado de Funcionamento (Online/Offline) */}
                           <div className="bg-[#080B11]/50 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
                             <div>
                               <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">Status para Novos Agendamentos</h5>
                               <p className="text-[9px] text-gray-500 mt-0.5">Define de forma global se os clientes conseguem agendar.</p>
                             </div>
                             <button
                               type="button"
                               onClick={() => setSettingsForm({ ...settingsForm, isOnline: settingsForm.isOnline !== false ? false : true })}
                               className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border cursor-pointer transition uppercase flex items-center gap-1.5 ${
                                 settingsForm.isOnline !== false
                                   ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                   : 'bg-rose-500/10 border-rose-500/50 text-rose-400 hover:bg-rose-500/20'
                               }`}
                             >
                               <span className={`w-1.5 h-1.5 rounded-full ${settingsForm.isOnline !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                               {settingsForm.isOnline !== false ? 'ONLINE' : 'OFFLINE'}
                             </button>
                           </div>

                           {/* Name */}
                           <div className="space-y-1.5">
                             <label className="text-[10px] text-gray-500 font-bold uppercase">NOME DO ESTABELECIMENTO</label>
                             <input 
                               type="text" 
                               value={settingsForm.name}
                               onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value.toUpperCase() })}
                               className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 placeholder-gray-600 focus:outline-none focus:border-[var(--brand-color)]"
                             />
                           </div>

                           {/* Address */}
                           <div className="space-y-1.5">
                             <label className="text-[10px] text-gray-500 font-bold uppercase">ENDEREÇO COMPLETO</label>
                             <input 
                               type="text" 
                               value={settingsForm.address}
                               onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                               className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 placeholder-gray-600 focus:outline-none focus:border-[var(--brand-color)]"
                             />
                           </div>

                           {/* Instagram & Facebook */}
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             <div className="space-y-1.5">
                               <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1">
                                 <Instagram className="w-3.5 h-3.5" />
                                 <span>INSTAGRAM</span>
                               </label>
                               <input 
                                 type="text" 
                                 value={settingsForm.instagram}
                                 onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                                 className="w-full bg-[#080B11] border border-white/10 rounded-xl px-3 py-3 focus:outline-none focus:border-[var(--brand-color)]"
                               />
                               <div className="flex items-center gap-2 mt-1.5 px-0.5">
                                 <input 
                                   type="checkbox"
                                   id="sendInstagram"
                                   checked={settingsForm.sendInstagram !== false}
                                   onChange={(e) => setSettingsForm({ ...settingsForm, sendInstagram: e.target.checked })}
                                   className="rounded border-white/10 text-[var(--brand-color)] focus:ring-0 bg-[#080B11] cursor-pointer"
                                 />
                                 <label htmlFor="sendInstagram" className="text-[9px] text-gray-400 font-mono uppercase tracking-wider cursor-pointer">
                                   Enviar no fim do atendimento
                                 </label>
                               </div>
                             </div>
                             <div className="space-y-1.5">
                               <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1">
                                 <Facebook className="w-3.5 h-3.5" />
                                 <span>FACEBOOK</span>
                               </label>
                               <input 
                                 type="text" 
                                 value={settingsForm.facebook}
                                 onChange={(e) => setSettingsForm({ ...settingsForm, facebook: e.target.value })}
                                 className="w-full bg-[#080B11] border border-white/10 rounded-xl px-3 py-3 focus:outline-none focus:border-[var(--brand-color)]"
                               />
                               <div className="flex items-center gap-2 mt-1.5 px-0.5">
                                 <input 
                                   type="checkbox"
                                   id="sendFacebook"
                                   checked={settingsForm.sendFacebook !== false}
                                   onChange={(e) => setSettingsForm({ ...settingsForm, sendFacebook: e.target.checked })}
                                   className="rounded border-white/10 text-[var(--brand-color)] focus:ring-0 bg-[#080B11] cursor-pointer"
                                 />
                                 <label htmlFor="sendFacebook" className="text-[9px] text-gray-400 font-mono uppercase tracking-wider cursor-pointer">
                                   Enviar no fim do atendimento
                                 </label>
                               </div>
                             </div>
                           </div>

                                                       {/* Logo selector file upload (No text URL) */}
                            <div className="space-y-2">
                              <label className="text-[10px] text-gray-500 font-bold uppercase block tracking-wider">LOGOMARCA DO ESTABELECIMENTO</label>
                              
                              {settingsForm.logoUrl ? (
                                <div className="border border-white/10 bg-[#080B11] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                                  {/* Preview */}
                                  <div className="w-16 h-16 rounded-xl bg-[#101622] border border-white/5 p-1.5 flex items-center justify-center overflow-hidden shrink-0">
                                    <img 
                                      src={settingsForm.logoUrl} 
                                      alt="Current logo" 
                                      className="w-full h-full object-contain rounded"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  
                                  <div className="flex-1 text-center sm:text-left">
                                    <span className="text-[10px] font-black text-[var(--brand-color)] tracking-wider uppercase block font-mono">LOGOMARCA ATIVA</span>
                                    <p className="text-[9px] text-gray-500 font-mono uppercase mt-0.5">Imagem carregada e pronta para exibição nas telas e painéis.</p>
                                  </div>

                                  <div className="flex gap-2">
                                    <label className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold font-mono px-3 py-2 rounded-xl transition cursor-pointer border border-white/5 hover:border-white/15">
                                      <span>ALTERAR</span>
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                              if (event.target?.result) {
                                                setSettingsForm({ ...settingsForm, logoUrl: event.target.result as string });
                                              }
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => setSettingsForm({ ...settingsForm, logoUrl: '' })}
                                      className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/10 text-[10px] font-bold font-mono px-3 py-2 rounded-xl transition cursor-pointer"
                                    >
                                      REMOVER
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="border border-dashed border-white/15 hover:border-[var(--brand-color)]/40 bg-[#080B11]/50 hover:bg-[#080B11] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition duration-300 select-none text-center">
                                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-400">
                                    <Scissors className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-black text-white block uppercase tracking-wider">Clique para anexar imagem</span>
                                    <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-widest mt-0.5">Suporta PNG, JPG ou SVG</span>
                                  </div>
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          if (event.target?.result) {
                                            setSettingsForm({ ...settingsForm, logoUrl: event.target.result as string });
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>

                           {/* Color Palette customization (PALETA DE CORES DE CONFIGURAÇÃO) */}
                           <div className="space-y-3 pb-4 mb-4 border-b border-white/5">
                             <div className="flex items-center justify-between">
                               <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block font-mono">🎨 PALETA DE CORES DO SISTEMA</label>
                               <span className="text-[10px] text-[var(--brand-color)] font-bold uppercase tracking-wider bg-[var(--brand-color)]/10 px-2 py-0.5 rounded-md border border-[var(--brand-color)]/20">
                                 {(() => {
                                   const palettes = [
                                     { id: 'emerald', label: 'Verde Neon', color: '#00E396' },
                                     { id: 'blue', label: 'Azul Oceano', color: '#3B82F6' },
                                     { id: 'violet', label: 'Roxo Elétrico', color: '#8B5CF6' },
                                     { id: 'amber', label: 'Amarelo Sol', color: '#F59E0B' },
                                     { id: 'rose', label: 'Rosa Real', color: '#EC4899' },
                                     { id: 'cyan', label: 'Ciano Técnico', color: '#06B6D4' },
                                     { id: 'orange', label: 'Laranja Fogo', color: '#FF6B00' },
                                     { id: 'red', label: 'Vermelho Rubi', color: '#EF4444' },
                                     { id: 'lime', label: 'Lima Limão', color: '#84CC16' },
                                     { id: 'fuchsia', label: 'Fúcsia Glow', color: '#D946EF' },
                                     { id: 'gold', label: 'Ouro Vintage', color: '#EAB308' },
                                     { id: 'teal', label: 'Teal Clássico', color: '#14B8A6' }
                                   ];
                                   return (palettes.find(p => p.id === (settingsForm?.colorPalette || 'emerald')) || palettes[0]).label;
                                 })()}
                               </span>
                             </div>
                             <div className="flex flex-wrap gap-2.5">
                               {[
                                 { id: 'emerald', label: 'Verde Neon', color: '#00E396' },
                                 { id: 'blue', label: 'Azul Oceano', color: '#3B82F6' },
                                 { id: 'violet', label: 'Roxo Elétrico', color: '#8B5CF6' },
                                 { id: 'amber', label: 'Amarelo Sol', color: '#F59E0B' },
                                 { id: 'rose', label: 'Rosa Real', color: '#EC4899' },
                                 { id: 'cyan', label: 'Ciano Técnico', color: '#06B6D4' },
                                 { id: 'orange', label: 'Laranja Fogo', color: '#FF6B00' },
                                 { id: 'red', label: 'Vermelho Rubi', color: '#EF4444' },
                                 { id: 'lime', label: 'Lima Limão', color: '#84CC16' },
                                 { id: 'fuchsia', label: 'Fúcsia Glow', color: '#D946EF' },
                                 { id: 'gold', label: 'Ouro Vintage', color: '#EAB308' },
                                 { id: 'teal', label: 'Teal Clássico', color: '#14B8A6' }
                               ].map((palette) => {
                                 const isSelected = (settingsForm?.colorPalette || 'emerald') === palette.id;
                                 return (
                                   <button
                                     key={palette.id}
                                     type="button"
                                     title={palette.label}
                                     onClick={() => setSettingsForm({ ...settingsForm, colorPalette: palette.id })}
                                     className={`w-9 h-9 rounded-full flex items-center justify-center border cursor-pointer transition-all duration-300 relative ${
                                       isSelected
                                         ? 'bg-[#080B11] border-white scale-110 shadow-lg shadow-black/50 z-10'
                                         : 'bg-[#080B11]/50 border-white/10 hover:border-white/30 hover:scale-105'
                                     }`}
                                   >
                                     <span 
                                       className="w-5.5 h-5.5 rounded-full block transition-all" 
                                       style={{ 
                                         backgroundColor: palette.color,
                                         boxShadow: isSelected ? `0 0 12px ${palette.color}aa` : 'none'
                                       }} 
                                     />
                                     {isSelected && (
                                       <span className="absolute -bottom-1 -right-1 bg-white text-black w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border border-[#07090E]">
                                         ✓
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              <span className="text-[9px] text-gray-500 font-mono block uppercase tracking-widest leading-normal">
                                Selecione a cor de destaque principal que será aplicada a todo o sistema do barbeiro e dos clientes em tempo real.
                              </span>
                            </div>

                           {/* Background Customization (TROCA DO PLANO DE FUNDO DO SISTEMA) */}
                           <div className="space-y-3 pb-4 mb-4 border-b border-white/5">
                             <div className="flex items-center justify-between">
                               <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block font-mono">🌌 PLANO DE FUNDO DO SISTEMA</label>
                               <span className="text-[10px] text-[var(--brand-color)] font-bold uppercase tracking-wider bg-[var(--brand-color)]/10 px-2 py-0.5 rounded-md border border-[var(--brand-color)]/20">
                                 {(() => {
                                   const backgroundThemes = [
                                     { id: 'default', label: 'Escuro Cósmico', color: '#07090E' },
                                     { id: 'black', label: 'Preto Absoluto', color: '#000000' },
                                     { id: 'slate', label: 'Chumbo Slate', color: '#0F172A' },
                                     { id: 'wood', label: 'Madeira Vintage', color: '#181210' },
                                     { id: 'burgundy', label: 'Vinho Premium', color: '#1A0C0F' },
                                     { id: 'navy', label: 'Azul Marinho', color: '#0B132B' },
                                     { id: 'forest', label: 'Floresta Negra', color: '#062016' },
                                     { id: 'abyssal', label: 'Roxo Abissal', color: '#150D2A' },
                                     { id: 'espresso', label: 'Café Expresso', color: '#1F140E' },
                                     { id: 'graphite', label: 'Cinza Grafite', color: '#1E1E24' },
                                     { id: 'petrol', label: 'Petrol Profundo', color: '#0A1C20' },
                                     { id: 'midnight', label: 'Azul Meia-Noite', color: '#020617' }
                                   ];
                                   return (backgroundThemes.find(bg => bg.id === (settingsForm?.backgroundTheme || 'default')) || backgroundThemes[0]).label;
                                 })()}
                               </span>
                             </div>
                             <div className="flex flex-wrap gap-2.5">
                               {[
                                 { id: 'default', label: 'Escuro Cósmico', color: '#07090E' },
                                 { id: 'black', label: 'Preto Absoluto', color: '#000000' },
                                 { id: 'slate', label: 'Chumbo Slate', color: '#0F172A' },
                                 { id: 'wood', label: 'Madeira Vintage', color: '#181210' },
                                 { id: 'burgundy', label: 'Vinho Premium', color: '#1A0C0F' },
                                 { id: 'navy', label: 'Azul Marinho', color: '#0B132B' },
                                 { id: 'forest', label: 'Floresta Negra', color: '#062016' },
                                 { id: 'abyssal', label: 'Roxo Abissal', color: '#150D2A' },
                                 { id: 'espresso', label: 'Café Expresso', color: '#1F140E' },
                                 { id: 'graphite', label: 'Cinza Grafite', color: '#1E1E24' },
                                 { id: 'petrol', label: 'Petrol Profundo', color: '#0A1C20' },
                                 { id: 'midnight', label: 'Azul Meia-Noite', color: '#020617' }
                               ].map((bg) => {
                                 const isSelected = (settingsForm?.backgroundTheme || 'default') === bg.id;
                                 return (
                                   <button
                                     key={bg.id}
                                     type="button"
                                     title={bg.label}
                                     onClick={() => setSettingsForm(settingsForm ? { ...settingsForm, backgroundTheme: bg.id } : null)}
                                     className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer transition-all duration-300 relative ${
                                       isSelected
                                         ? 'bg-[#080B11] border-white scale-110 shadow-lg shadow-black/50 z-10'
                                         : 'bg-[#080B11]/50 border-white/10 hover:border-white/30 hover:scale-105'
                                     }`}
                                   >
                                     <span 
                                       className="w-5.5 h-5.5 rounded-lg block transition-all border border-white/10" 
                                       style={{ 
                                         backgroundColor: bg.color,
                                         boxShadow: isSelected ? `0 0 12px ${bg.color}88` : 'none'
                                       }} 
                                     />
                                     {isSelected && (
                                       <span className="absolute -bottom-1 -right-1 bg-white text-black w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border border-[#07090E]">
                                         ✓
                                       </span>
                                     )}
                                   </button>
                                 );
                               })}
                             </div>
                             <span className="text-[9px] text-gray-500 font-mono block uppercase tracking-widest leading-normal">
                               Escolha o plano de fundo que será aplicado em todo o sistema em tempo real.
                             </span>
                           </div>

                           {/* Thank you note */}
                           <div className="space-y-1.5">
                             <label className="text-[10px] text-gray-500 font-bold uppercase">MENSAGEM DE AGRADECIMENTO</label>
                             <textarea 
                               rows={3}
                               value={settingsForm.thankYouMessage}
                               onChange={(e) => setSettingsForm({ ...settingsForm, thankYouMessage: e.target.value })}
                               className="w-full bg-[#080B11] border border-white/10 rounded-xl p-4 focus:outline-none focus:border-[var(--brand-color)]"
                             ></textarea>
                           </div>

                           {/* Ticket modal display duration setting */}
                           <div className="space-y-1.5 pt-2 border-t border-white/5">
                             <label className="text-[10px] text-gray-500 font-bold uppercase">TEMPO DE EXIBIÇÃO DA CHAMADA (SEGUNDOS)</label>
                             <div className="flex items-center gap-3">
                               <input 
                                 type="range" 
                                 min={2}
                                 max={30}
                                 value={settingsForm.announcementDuration ?? 5}
                                 onChange={(e) => setSettingsForm({ ...settingsForm, announcementDuration: parseInt(e.target.value) || 5 })}
                                 className="flex-1 accent-[var(--brand-color)] cursor-pointer bg-[#080B11]"
                               />
                               <span className="bg-[#080B11] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[var(--brand-color)] font-bold font-mono min-w-[40px] text-center shrink-0">
                                 {settingsForm.announcementDuration ?? 5}s
                                </span>
                             </div>
                             <span className="text-[9px] text-gray-500 font-mono block uppercase tracking-widest mt-0.5 leading-normal">
                               Tempo que o modal visual de chamada do cliente ficará ativo na tela administrativa após o clique.
                             </span>
                           </div>

                         </div>

                         {/* STRIPE PAYMENT CONFIGURATION */}
                         <div className="bg-[#101622] rounded-2xl border border-white/5 p-5 space-y-4">
                           <h4 className="border-b border-white/5 pb-2 font-black uppercase tracking-widest text-[var(--brand-color)] text-xs flex items-center gap-1.5 font-mono">
                             💳 PAGAMENTO INTEGRADO (STRIPE)
                           </h4>
                           
                           <div className="space-y-3.5 font-mono text-xs">
                             <div className="space-y-1.5">
                               <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">Stripe Publishable Key</label>
                               <input 
                                 type="text" 
                                 placeholder="pk_test_..."
                                 value={settingsForm.stripePublishableKey || ''}
                                 onChange={(e) => setSettingsForm({ ...settingsForm, stripePublishableKey: e.target.value })}
                                 className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 placeholder-gray-600 focus:outline-none focus:border-[var(--brand-color)] text-white font-mono"
                               />
                             </div>

                             <div className="space-y-1.5">
                               <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">Stripe Secret Key</label>
                               <input 
                                 type="password" 
                                 placeholder={settingsForm.stripeSecretKey ? "••••••••••••••••" : "sk_test_..."}
                                 value={settingsForm.stripeSecretKey || ''}
                                 onChange={(e) => setSettingsForm({ ...settingsForm, stripeSecretKey: e.target.value })}
                                 className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 placeholder-gray-600 focus:outline-none focus:border-[var(--brand-color)] text-white font-mono"
                               />
                               <span className="text-[8px] text-gray-500 font-mono block uppercase">
                                 Nota: A chave secreta é processada exclusivamente no servidor e nunca vai ao front-end.
                                </span>
                             </div>

                             <div className="space-y-1.5">
                               <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">Valor do Sinal / Taxa de Reserva Online (£)</label>
                               <div className="relative">
                                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">£</span>
                                 <input 
                                   type="number" 
                                   step="0.01"
                                   placeholder="10.00"
                                   value={settingsForm.servicePrice !== undefined ? settingsForm.servicePrice : ''}
                                   onChange={(e) => setSettingsForm({ ...settingsForm, servicePrice: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                   className="w-full bg-[#080B11] border border-white/10 rounded-xl pl-10 pr-4 py-3 placeholder-gray-600 focus:outline-none focus:border-[var(--brand-color)] text-white font-mono font-bold"
                                 />
                               </div>
                               <span className="text-[8px] text-gray-500 font-mono block mt-0.5 leading-normal font-bold">
                                 Define o valor da taxa de reserva cobrada online via Stripe em Libras (£). O restante do valor do serviço contratado será pago presencialmente na barbearia.
                               </span>
                             </div>
                           </div>
                         </div>

                         {/* SALON GEOLOCATION CONFIGURATION */}
                         <div className="bg-[#101622] rounded-2xl border border-white/5 p-5 space-y-4">
                           <h4 className="border-b border-white/5 pb-2 font-black uppercase tracking-widest text-[var(--brand-color)] text-xs flex items-center gap-1.5 font-mono">
                             📍 GEOLOCALIZAÇÃO DO SALÃO (CHECK-IN)
                           </h4>
                           
                           <div className="space-y-3.5 font-mono text-xs">
                             <p className="text-[10px] text-gray-400 uppercase leading-normal font-bold">
                               Configure as coordenadas geográficas do seu salão para permitir que os clientes façam check-in automático ao se aproximarem.
                             </p>
                             
                             <div className="grid grid-cols-2 gap-3">
                               <div className="space-y-1.5">
                                 <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">Latitude</label>
                                 <input 
                                   type="number" 
                                   step="0.000001"
                                   placeholder="38.7223"
                                   value={(settingsForm as any)?.salonLatitude !== undefined ? (settingsForm as any).salonLatitude : ''}
                                   onChange={(e) => setSettingsForm({ ...settingsForm, salonLatitude: e.target.value === '' ? undefined : parseFloat(e.target.value) } as any)}
                                   className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 placeholder-gray-600 focus:outline-none focus:border-[var(--brand-color)] text-white font-mono"
                                 />
                               </div>

                               <div className="space-y-1.5">
                                 <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">Longitude</label>
                                 <input 
                                   type="number" 
                                   step="0.000001"
                                   placeholder="-9.1393"
                                   value={(settingsForm as any)?.salonLongitude !== undefined ? (settingsForm as any).salonLongitude : ''}
                                   onChange={(e) => setSettingsForm({ ...settingsForm, salonLongitude: e.target.value === '' ? undefined : parseFloat(e.target.value) } as any)}
                                   className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 placeholder-gray-600 focus:outline-none focus:border-[var(--brand-color)] text-white font-mono"
                                 />
                               </div>
                             </div>

                             <button
                               type="button"
                               onClick={() => {
                                 if (navigator.geolocation) {
                                   navigator.geolocation.getCurrentPosition(
                                     (position) => {
                                       setSettingsForm({
                                         ...settingsForm,
                                         salonLatitude: parseFloat(position.coords.latitude.toFixed(6)),
                                         salonLongitude: parseFloat(position.coords.longitude.toFixed(6))
                                       } as any);
                                     },
                                     (error) => {
                                       alert(language === 'pt-BR'
                                         ? 'Não foi possível obter sua localização atual. Verifique as permissões de geolocalização do seu navegador.'
                                         : 'Could not fetch your current location. Please verify browser geolocation permissions.'
                                       );
                                     }
                                   );
                                 } else {
                                   alert('Geolocalização não é suportada por este navegador.');
                                 }
                               }}
                               className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer border border-white/5 active:scale-95"
                             >
                               🎯 CAPTURAR MINHA POSIÇÃO ATUAL
                             </button>
                           </div>
                         </div>

                       </div>

                       {/* RIGHT COLUMN: Team & service pricing lists */}
                         <div className="space-y-6">
                           
                           {/* Team lists (EQUIPE) */}
                           <div className="bg-[#101622] rounded-2xl border border-white/5 p-5 space-y-4">
                             <div className="flex items-center justify-between border-b border-white/5 pb-2">
                               <h4 className="text-xs font-black text-[var(--brand-color)] tracking-widest uppercase">
                                 👥 EQUIPE (BARBEIROS)
                               </h4>
                             </div>

                             {/* Local barber items list */}
                             <div className="space-y-2">
                               {localBarbers.map((b, idx) => (
                                 <div key={b.id || idx} className="bg-[#080B11] rounded-xl px-4 py-3.5 border border-white/5 flex items-center justify-between">
                                   <div className="flex items-center gap-2">
                                     <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-color)]"></span>
                                     <span className="font-bold text-white uppercase">{b.name}</span>
                                   </div>
                                   <button 
                                     onClick={() => handleRemoveLocalBarber(b.id)}
                                     className="text-rose-500 hover:text-white hover:bg-rose-500/10 p-1.5 rounded-lg transition"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                               ))}
                             </div>

                             {/* Add barber tools bar */}
                             <div className="flex gap-2.5">
                               <input 
                                 type="text" 
                                 placeholder="NOME DO BARBEIRO"
                                 value={newBarberName}
                                 onChange={(e) => setNewBarberName(e.target.value)}
                                 className="flex-1 bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 placeholder-gray-600 focus:outline-none"
                               />
                               <button 
                                 onClick={handleAddLocalBarber}
                                 className="bg-[var(--brand-color)] text-[#07090E] font-bold px-4 rounded-xl flex items-center justify-center cursor-pointer font-sans"
                               >
                                 <Plus className="w-4 h-4" />
                               </button>
                             </div>
                           </div>

                           {/* Services management lists */}
                           <div className="bg-[#101622] rounded-2xl border border-white/5 p-5 space-y-4">
                             <div className="flex items-center justify-between border-b border-white/5 pb-2">
                               <h4 className="text-xs font-black text-[var(--brand-color)] tracking-widest uppercase">
                                 💇‍♂️ SERVIÇOS & TABELA DE PREÇOS
                               </h4>
                             </div>

                             {/* Local service items list */}
                             <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                               {localServices.map((s, idx) => (
                                 <div key={s.id || idx} className="bg-[#080B11] rounded-xl px-4 py-3 border border-white/5 flex items-center justify-between gap-2">
                                   <div>
                                     <span className="font-bold text-white uppercase block">{s.name}</span>
                                     <span className="text-[10px] text-gray-400 mt-0.5 block">
                                       £{s.price.toFixed(2)} • {s.duration} MIN • <strong className="text-xs text-[var(--brand-color)] uppercase">{s.type === 'kids' ? 'Infantil' : 'Adulto'}</strong>
                                     </span>
                                   </div>
                                   <button 
                                     onClick={() => handleRemoveLocalService(s.id)}
                                     className="text-rose-500 hover:text-white hover:bg-rose-500/10 p-1.5 rounded-lg transition"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                               ))}
                             </div>

                             {/* Add service tools bar */}
                             <div className="bg-[#080B11] rounded-xl p-3 border border-white/5 space-y-3">
                               <div className="grid grid-cols-2 gap-2">
                                 <input 
                                   type="text" 
                                   placeholder="TITULO DO SERVIÇO"
                                   value={newServiceName}
                                   onChange={(e) => setNewServiceName(e.target.value)}
                                   className="w-full bg-[#101622] border border-white/10 rounded-lg px-3 py-2 text-xs placeholder-gray-600 focus:outline-none"
                                 />
                                 <input 
                                   type="number" 
                                   placeholder="VALOR £"
                                   value={newServicePrice}
                                   onChange={(e) => setNewServicePrice(e.target.value)}
                                   className="w-full bg-[#101622] border border-white/10 rounded-lg px-3 py-2 text-xs placeholder-gray-600 focus:outline-none"
                                 />
                               </div>
                               <div className="grid grid-cols-2 gap-2">
                                 <input 
                                   type="number" 
                                   placeholder="TEMPO (MINUTES)"
                                   value={newServiceDuration}
                                   onChange={(e) => setNewServiceDuration(e.target.value)}
                                   className="w-full bg-[#101622] border border-white/10 rounded-lg px-3 py-2 text-xs placeholder-gray-600 focus:outline-none"
                                 />
                                 <select 
                                   value={newServiceType}
                                   onChange={(e) => setNewServiceType(e.target.value as 'adult' | 'kids')}
                                   className="w-full bg-[#101622] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none"
                                 >
                                   <option value="adult">Adulto</option>
                                   <option value="kids">Infantil (Kids)</option>
                                 </select>
                               </div>
                               <button 
                                 onClick={handleAddLocalService}
                                 className="w-full bg-[var(--brand-color)] text-[#07090E] rounded-lg py-2.5 font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer font-sans text-xs"
                               >
                                 <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                 <span>ADICIONAR SERVIÇO</span>
                               </button>
                             </div>

                           </div>

                         </div>

                       </div>

                     </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 🔑 LICENSING DEVELOPER MASTER VIEW                       */}
          {/* ========================================================= */}
          {currentNamespace === 'master' && (
            <div className="flex-1 flex flex-col bg-[#080B11] p-4 sm:p-6 md:p-8">
              
              {/* MASTER PASSWORD GATE (IMAGE 4) */}
              {!isAuthenticatedMaster && masterScreen === 'login' && (
                <div className="max-w-md w-full mx-auto my-auto bg-[#101622] rounded-2xl border border-white/5 p-6 shadow-2xl">
                  
                  {/* Brand Header */}
                  <div className="flex flex-col items-center text-center mt-4 mb-6">
                    <div className="w-16 h-16 rounded-full border-2 border-[var(--brand-color)] p-1 bg-[#080B11] mb-4 flex items-center justify-center shadow-lg shadow-[var(--brand-color)]/10">
                      <Shield className="w-8 h-8 text-[var(--brand-color)]" />
                    </div>
                    <h2 className="text-xl font-black tracking-wider text-white uppercase font-mono">
                      ADMIN MASTER
                    </h2>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500 block mt-1">
                      ÁREA DO DESENVOLVEDOR • LOGIN
                    </span>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1.5 font-mono text-xs">
                      <label className="text-[10px] uppercase font-bold text-[var(--brand-color)] tracking-wider block">
                        USUÁRIO OU E-MAIL MESTRE
                      </label>
                      <input 
                        type="text" 
                        placeholder="EX: admin OU SEU E-MAIL"
                        value={masterUsernameInput}
                        onChange={(e) => setMasterUsernameInput(e.target.value)}
                        className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3.5 text-center text-sm font-bold tracking-widest font-mono text-white focus:outline-none focus:border-[var(--brand-color)] transition"
                      />
                    </div>

                    <div className="space-y-1.5 font-mono text-xs">
                      <label className="text-[10px] uppercase font-bold text-[var(--brand-color)] tracking-wider block">
                        SENHA DE ACESSO
                      </label>
                      <input 
                        type="password" 
                        placeholder="SENHA"
                        value={masterPasswordInput}
                        onChange={(e) => setMasterPasswordInput(e.target.value)}
                        className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3.5 text-center text-sm font-bold tracking-widest font-mono text-white focus:outline-none focus:border-[var(--brand-color)] transition"
                        onKeyDown={(e) => e.key === 'Enter' && handleMasterLogin()}
                      />
                    </div>

                    <div className="p-3 bg-[#080B11] border border-cyan-500/10 rounded-xl text-center text-[11px] text-gray-500 leading-relaxed font-mono">
                      💡 Primeiro Acesso: Usuário <strong className="text-cyan-400">admin</strong> e Senha <strong className="text-cyan-400">admin123</strong>
                    </div>

                    {/* Enter Button */}
                    <button
                      onClick={handleMasterLogin}
                      className="w-full bg-[var(--brand-color)] text-[#07090E] rounded-xl py-3.5 px-4 font-bold uppercase tracking-wider hover:bg-[var(--brand-hover)] cursor-pointer text-sm font-mono text-center flex items-center justify-center shadow-lg shadow-[var(--brand-color)]/10"
                    >
                      ENTRAR
                    </button>

                    <div className="flex justify-center items-center pt-2 font-mono text-[11px]">
                      <button
                        onClick={() => {
                          setMasterScreen('forgot_password');
                          setSimulatedResetLink(null);
                        }}
                        className="text-gray-400 hover:text-[var(--brand-color)] transition uppercase cursor-pointer"
                      >
                        🔑 Esqueci minha senha
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* FIRST ACCESS SETUP SCREEN (REDIRECIONAMENTO OBRIGATÓRIO) */}
              {!isAuthenticatedMaster && masterScreen === 'setup' && (
                <div className="max-w-md w-full mx-auto my-auto bg-[#101622] rounded-2xl border border-cyan-500/30 p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-500 to-[var(--brand-color)]"></div>

                  {/* Brand Header */}
                  <div className="flex flex-col items-center text-center mt-4 mb-6">
                    <div className="w-16 h-16 rounded-full border-2 border-cyan-400 p-1 bg-[#080B11] mb-4 flex items-center justify-center shadow-lg shadow-cyan-400/10 leading-none">
                      <span className="text-xl">🚀</span>
                    </div>
                    <h2 className="text-xl font-black tracking-wider text-white uppercase font-mono">
                      CONFIGURAR PRIMEIRO ACESSO
                    </h2>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 block mt-1">
                      OBRIGATÓRIO • SEGURANÇA MESTRE
                    </span>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <p className="text-gray-400 font-mono text-[11px] text-center leading-relaxed uppercase">
                      Como medida de segurança, substitua a senha provisória <span className="text-cyan-400">admin123</span> e cadastre seu e-mail de recuperação pessoal para ativar o ambiente.
                    </p>

                    <div className="space-y-1.5 font-mono text-xs">
                      <label className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
                        SEU E-MAIL PESSOAL DO ADMINISTRADOR
                      </label>
                      <input 
                        type="email" 
                        placeholder="EX: julio.herranz31@gmail.com"
                        value={masterEmailInput}
                        onChange={(e) => setMasterEmailInput(e.target.value)}
                        className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3.5 text-center text-sm font-bold font-mono text-white focus:outline-none focus:border-cyan-400 transition"
                      />
                    </div>

                    <div className="space-y-1.5 font-mono text-xs">
                      <label className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
                        NOVA SENHA DEFINITIVA
                      </label>
                      <input 
                        type="password" 
                        placeholder="SENHA DEFINITIVA (MÍNIMO 6 CARACT)"
                        value={masterNewPasswordInput}
                        onChange={(e) => setMasterNewPasswordInput(e.target.value)}
                        className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3.5 text-center text-sm font-bold tracking-widest font-mono text-white focus:outline-none focus:border-cyan-400 transition"
                      />
                    </div>

                    <div className="space-y-1.5 font-mono text-xs">
                      <label className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
                        CONFIRMAR NOVA SENHA
                      </label>
                      <input 
                        type="password" 
                        placeholder="CONFIRME SUA NOVA SENHA"
                        value={masterNewPasswordConfirmInput}
                        onChange={(e) => setMasterNewPasswordConfirmInput(e.target.value)}
                        className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3.5 text-center text-sm font-bold tracking-widest font-mono text-white focus:outline-none focus:border-cyan-400 transition"
                        onKeyDown={(e) => e.key === 'Enter' && handleMasterSetup()}
                      />
                    </div>

                    {/* Setup / Save button */}
                    <button
                      onClick={handleMasterSetup}
                      className="w-full bg-cyan-400 text-black rounded-xl py-3.5 px-4 font-bold uppercase tracking-wider hover:bg-cyan-300 cursor-pointer text-sm font-mono text-center flex items-center justify-center shadow-lg"
                    >
                      SALVAR E ATIVAR CADASTRO
                    </button>

                    <button
                      onClick={() => {
                        setIsAuthenticatedMaster(false);
                        localStorage.removeItem('master_is_auth');
                        setMasterScreen('login');
                      }}
                      className="w-full text-center text-gray-500 hover:text-white transition font-mono text-[11px] uppercase cursor-pointer block"
                    >
                      Sair e voltar ao login
                    </button>
                  </div>
                </div>
              )}

              {/* FORGOT PASSWORD SCREEN */}
              {!isAuthenticatedMaster && masterScreen === 'forgot_password' && (
                <div className="max-w-md w-full mx-auto my-auto bg-[#101622] rounded-2xl border border-white/5 p-6 shadow-2xl">
                  
                  {/* Brand Header */}
                  <div className="flex flex-col items-center text-center mt-4 mb-6">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500 p-1 bg-[#080B11] mb-4 flex items-center justify-center shadow-lg shadow-amber-500/10">
                      <Shield className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-black tracking-wider text-white uppercase font-mono">
                      RECUPERAÇÃO DE SENHA
                    </h2>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-500 block mt-1">
                      ÁREA DO DESENVOLVEDOR
                    </span>
                  </div>

                  {/* Input Email */}
                  <div className="space-y-4">
                    <p className="text-gray-400 font-mono text-[11px] text-center leading-relaxed uppercase">
                      Digite o e-mail pessoal cadastrado no seu primeiro acesso para enviarmos um link de redefinição de senha.
                    </p>

                    <div className="space-y-1.5 font-mono text-xs">
                      <label className="text-[10px] uppercase font-bold text-amber-500 tracking-wider block">
                        E-MAIL CADASTRADO
                      </label>
                      <input 
                        type="email" 
                        placeholder="EX: seu-email@dominio.com"
                        value={masterForgotPasswordEmailInput}
                        onChange={(e) => setMasterForgotPasswordEmailInput(e.target.value)}
                        className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3.5 text-center text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-500 transition"
                        onKeyDown={(e) => e.key === 'Enter' && handleMasterForgotPassword()}
                      />
                    </div>

                    {/* Simulation response ready for emails integration */}
                    {simulatedResetLink && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                        <p className="text-[11px] text-amber-400 font-mono font-bold uppercase tracking-wider text-center">
                          📬 E-mail Enviado! (Estrutura Pronta)
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono leading-relaxed text-center">
                          A estrutura de backend para integração real (e.g., SMTP / Nodemailer) em <strong>server.ts</strong> está configurada. Para testes no ambiente do iFrame, clique no link abaixo para simular a redefinição de senha:
                        </p>
                        <div className="text-center pt-1.5 block">
                          <a 
                            href={simulatedResetLink}
                            className="inline-block bg-amber-500 text-black font-semibold text-[10px] tracking-wide uppercase px-4 py-2 rounded-lg hover:bg-amber-400 transition"
                          >
                            🔗 REDEFINIR SENHA AGORA
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Forgot password Button */}
                    <button
                      onClick={handleMasterForgotPassword}
                      className="w-full bg-amber-500 text-black rounded-xl py-3.5 px-4 font-bold uppercase tracking-wider hover:bg-amber-400 cursor-pointer text-sm font-mono text-center flex items-center justify-center shadow-lg"
                    >
                      SOLICITAR LINK DE REDEFINIÇÃO
                    </button>

                    <button
                      onClick={() => {
                        setMasterScreen('login');
                        setSimulatedResetLink(null);
                      }}
                      className="w-full text-center text-gray-500 hover:text-white transition font-mono text-[11px] uppercase cursor-pointer block font-bold"
                    >
                      ← Voltar ao login
                    </button>
                  </div>
                </div>
              )}

              {/* RESET PASSWORD TOKEN SCREEN */}
              {!isAuthenticatedMaster && masterScreen === 'reset_password' && (
                <div className="max-w-md w-full mx-auto my-auto bg-[#101622] rounded-2xl border border-white/5 p-6 shadow-2xl animate-fade-in">
                  
                  {/* Brand Header */}
                  <div className="flex flex-col items-center text-center mt-4 mb-6">
                    <div className="w-16 h-16 rounded-full border-2 border-purple-500 p-1 bg-[#080B11] mb-4 flex items-center justify-center shadow-lg shadow-purple-500/10">
                      <Shield className="w-8 h-8 text-purple-500" />
                    </div>
                    <h2 className="text-xl font-black tracking-wider text-white uppercase font-mono">
                      REDEFINIR SENHA MESTRE
                    </h2>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-purple-500 block mt-1">
                      ÁREA DO DESENVOLVEDOR
                    </span>
                  </div>

                  {/* Core Content */}
                  <div className="space-y-4">
                    <p className="text-gray-400 font-mono text-[11px] text-center leading-relaxed uppercase">
                      Insira a sua nova senha e confirme o valor para concluir a redefinição segura de forma criptografada.
                    </p>

                    <div className="space-y-1.5 font-mono text-xs">
                      <label className="text-[10px] uppercase font-bold text-purple-500 tracking-wider block">
                        NOVA SENHA DEFINITIVA
                      </label>
                      <input 
                        type="password" 
                        placeholder="NOVA SENHA (MÍNIMO 6 CARACT)"
                        value={masterNewPasswordInput}
                        onChange={(e) => setMasterNewPasswordInput(e.target.value)}
                        className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3.5 text-center text-sm font-bold tracking-widest font-mono text-white focus:outline-none focus:border-purple-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5 font-mono text-xs">
                      <label className="text-[10px] uppercase font-bold text-purple-500 tracking-wider block">
                        CONFIRMAR NOVA SENHA
                      </label>
                      <input 
                        type="password" 
                        placeholder="CONFIRME A NOVA SENHA"
                        value={masterNewPasswordConfirmInput}
                        onChange={(e) => setMasterNewPasswordConfirmInput(e.target.value)}
                        className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3.5 text-center text-sm font-bold tracking-widest font-mono text-white focus:outline-none focus:border-purple-500 transition"
                        onKeyDown={(e) => e.key === 'Enter' && handleMasterResetPassword()}
                      />
                    </div>

                    {/* Reset Button */}
                    <button
                      onClick={handleMasterResetPassword}
                      className="w-full bg-purple-500 text-black rounded-xl py-3.5 px-4 font-bold uppercase tracking-wider hover:bg-purple-400 cursor-pointer text-sm font-mono text-center flex items-center justify-center shadow-lg"
                    >
                      SALVAR E REDEFINIR SENHA
                    </button>

                    <button
                      onClick={() => {
                        setMasterScreen('login');
                        setResetTokenFromUrl(null);
                        // Clear queries
                        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + "?view=master";
                        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
                      }}
                      className="w-full text-center text-gray-500 hover:text-white transition font-mono text-[11px] uppercase cursor-pointer block font-bold"
                    >
                      Cancelar e voltar ao login
                    </button>
                  </div>
                </div>
              )}

              {/* LICENSING GRID DISPLAY BOARD (IMAGE 5) */}
              {isAuthenticatedMaster && masterScreen === 'dashboard' && (
                <div className="max-w-4xl w-full mx-auto space-y-6">
                  
                  {/* Licensing stats header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-4.5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 border border-emerald-500/10 rounded-xl bg-[#101622] text-[var(--brand-color)]">
                        <Key className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-lg font-mono font-extrabold tracking-wider uppercase text-white">
                          PAINEL MASTER DEVELOPER
                        </h2>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500 block">
                          GESTÃO COMPLETA DE LICENÇAS E PLATAFORMA SAAS MULTI-TENANT
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setIsAuthenticatedMaster(false);
                        localStorage.removeItem('master_is_auth');
                        setMasterScreen('login');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 text-gray-400 font-mono tracking-wider uppercase flex items-center gap-1 cursor-pointer transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>SAIR MASTER</span>
                    </button>
                  </div>

                  {/* Tabs configuration selector */}
                  <div className="flex border-b border-white/5 font-mono text-xs font-bold gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMasterTab('licenses');
                        fetchShops();
                      }}
                      className={`py-3 px-4 uppercase transition-all border-b-2 cursor-pointer ${
                        masterTab === 'licenses' 
                          ? 'border-[var(--brand-color)] text-[var(--brand-color)] bg-white/[0.02]' 
                          : 'border-transparent text-gray-500 hover:text-white'
                      }`}
                    >
                      🔑 Gerenciar Licenças & Testes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMasterTab('tenants');
                        fetchShops();
                      }}
                      className={`py-3 px-4 uppercase transition-all border-b-2 cursor-pointer ${
                        masterTab === 'tenants' 
                          ? 'border-[var(--brand-color)] text-[var(--brand-color)] bg-white/[0.02]' 
                          : 'border-transparent text-gray-500 hover:text-white'
                      }`}
                    >
                      🏢 Plataforma SaaS Multi-Tenant ({superShops.length} lojas)
                    </button>
                  </div>

                  {/* TAB 1: LICENSES */}
                  {masterTab === 'licenses' && (
                    <div className="space-y-6 text-left pt-4">
                      {/* TENANTS LIST GRID */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest text-left">
                            Barbearias Ativas na Plataforma ({superShops.length})
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {superShops.map((shop) => {
                            const accessUrl = shop.customDomain 
                              ? `http://${shop.customDomain}` 
                              : `${window.location.origin}/?shop=${shop.id}`;
                            const barberUrl = shop.customDomain 
                              ? `http://${shop.customDomain}/?view=barber` 
                              : `${window.location.origin}/?shop=${shop.id}&view=barber`;
                            const tvUrl = shop.customDomain 
                              ? `http://${shop.customDomain}/?view=tv` 
                              : `${window.location.origin}/?shop=${shop.id}&view=tv`;
                            const isEditing = editingShopId === shop.id;

                            // Calculate current month code
                            const now = new Date();
                            const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
                            const currentKeyVal = shop.monthlyLicenseKeys ? shop.monthlyLicenseKeys[currentMonthKey] : "NÃO GERADO";

                            const handleCopyKey = (keyName: string, keyValue: string) => {
                              navigator.clipboard.writeText(keyValue);
                              setCopiedKey(keyName);
                              setTimeout(() => setCopiedKey(null), 2000);
                            };

                            return (
                              <div 
                                key={shop.id}
                                className={`bg-[#101622] rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                                  shop.active ? 'border-white/5 shadow-xl' : 'border-rose-500/20 opacity-80'
                                }`}
                              >
                                <div className="space-y-3">
                                  {/* Header info name/toggle */}
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-left font-mono flex-1">
                                      {isEditing ? (
                                        <div className="space-y-1">
                                          <label className="text-[8px] uppercase font-bold text-gray-400 tracking-wider block">Nome da Barbearia</label>
                                          <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            className="bg-[#080B11] border border-white/10 rounded-lg px-2 py-1 text-xs font-bold font-mono text-white focus:outline-none focus:border-[var(--brand-color)] w-full"
                                          />
                                        </div>
                                      ) : (
                                        <>
                                          <h4 className="text-sm font-black text-white uppercase tracking-wide">
                                            {shop.name}
                                          </h4>
                                          <span className="text-[9px] text-gray-500 uppercase tracking-wide block">
                                            Slug ID: <strong className="text-[var(--brand-color)]">{shop.id}</strong>
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    {/* Action Toggle block/unblock */}
                                    {shop.id === 'default' || shop.id === 'matriz' ? (
                                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black tracking-widest font-mono px-2 py-1 rounded-full uppercase scale-90 shrink-0">
                                        SISTEMA PADRÃO
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleShopActive(shop.id, shop.active)}
                                        className={`px-2 py-1 rounded-full text-[8px] font-black tracking-widest font-mono border cursor-pointer transition uppercase shrink-0 scale-90 ${
                                          shop.active 
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 hover:scale-95'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400 hover:scale-95'
                                        }`}
                                        title={shop.active ? "Clique para Bloquear" : "Clique para Desbloquear"}
                                      >
                                        {shop.active ? "● ATIVO" : "○ BLOQUEADO"}
                                      </button>
                                    )}
                                  </div>

                                  {/* Custom Domain Input or View Field */}
                                  <div className="font-mono text-xs text-left bg-[#080B11]/40 border border-white/5 rounded-xl p-2.5 space-y-1">
                                    <span className="text-[8px] uppercase font-bold text-gray-400 tracking-wider block">
                                      🌐 Domínio Personalizado
                                    </span>
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        placeholder="Ex: www.copacabanabarber.com"
                                        value={editingCustomDomain}
                                        onChange={(e) => setEditingCustomDomain(e.target.value)}
                                        className="bg-[#080B11] border border-white/10 rounded-md px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[var(--brand-color)] w-full"
                                      />
                                    ) : (
                                      <span className="text-xs text-white break-all block font-bold">
                                        {shop.customDomain ? (
                                          <span className="text-[var(--brand-color)]">{shop.customDomain}</span>
                                        ) : (
                                          <span className="text-gray-500 italic text-[10px]">Nenhum domínio configurado</span>
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  {/* Trial Period Info / Admin panel configuration */}
                                  <div className="font-mono text-xs text-left bg-[#080B11]/40 border border-white/5 rounded-xl p-2.5 space-y-2">
                                    <span className="text-[8px] uppercase font-bold text-gray-400 tracking-wider block">
                                      🧪 Período de Teste Grátis
                                    </span>
                                    {isEditing ? (
                                      <div className="space-y-2 text-[10px]">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-gray-400 uppercase font-black text-[8px]">Status do Teste:</span>
                                          <div className="flex gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() => setEditingTrialEnabled(true)}
                                              className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition ${
                                                editingTrialEnabled 
                                                  ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-extrabold' 
                                                  : 'bg-white/5 border border-transparent text-gray-400'
                                              }`}
                                            >
                                              Ativo
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingTrialEnabled(false)}
                                              className={`px-2 py-1 rounded text-[8px] font-bold uppercase transition ${
                                                !editingTrialEnabled 
                                                  ? 'bg-rose-500/15 border border-rose-500/35 text-rose-400 font-extrabold' 
                                                  : 'bg-white/5 border border-transparent text-gray-400'
                                              }`}
                                            >
                                              Inativo
                                            </button>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5">
                                          <div className="space-y-0.5">
                                            <label className="text-[8px] text-gray-400 uppercase">Duração (Dias)</label>
                                            <input
                                              type="number"
                                              value={editingTrialDuration}
                                              onChange={(e) => setEditingTrialDuration(parseInt(e.target.value) || 1)}
                                              className="bg-[#080B11] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none w-full font-bold font-mono"
                                            />
                                          </div>
                                          <div className="space-y-0.5">
                                            <div className="flex items-center justify-between">
                                              <label className="text-[8px] text-gray-400 uppercase">Senha Teste</label>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                                                  const lowers = "abcdefghijklmnopqrstuvwxyz";
                                                  const digits = "0123456789";
                                                  const specials = "@#$!";
                                                  const allChars = uppers + lowers + digits + specials;
                                                  let key = "";
                                                  key += uppers[Math.floor(Math.random() * uppers.length)];
                                                  key += lowers[Math.floor(Math.random() * lowers.length)];
                                                  key += digits[Math.floor(Math.random() * digits.length)];
                                                  key += specials[Math.floor(Math.random() * specials.length)];
                                                  for (let i = 0; i < 8; i++) {
                                                    key += allChars[Math.floor(Math.random() * allChars.length)];
                                                  }
                                                  key = key.split('').sort(() => 0.5 - Math.random()).join('').toUpperCase();
                                                  setEditingTrialPassword(key);
                                                }}
                                                className="text-[8px] text-cyan-400 hover:underline border-none bg-transparent cursor-pointer font-bold font-mono uppercase"
                                              >
                                                GERAR NOVA
                                              </button>
                                            </div>
                                            <input
                                              type="text"
                                              value={editingTrialPassword}
                                              onChange={(e) => setEditingTrialPassword(e.target.value.toUpperCase())}
                                              className="bg-[#080B11] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none w-full font-black text-cyan-400 font-mono tracking-widest"
                                            />
                                          </div>
                                        </div>

                                        <div className="space-y-0.5">
                                          <label className="text-[8px] text-gray-400 uppercase block">Data Inicial</label>
                                          <input
                                            type="date"
                                            value={editingTrialStartDate}
                                            onChange={(e) => setEditingTrialStartDate(e.target.value)}
                                            className="bg-[#080B11] border border-white/10 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none w-full font-bold font-mono"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5 text-[10px]">
                                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                          <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${
                                            shop.systemTestEnabled 
                                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                          }`}>
                                            {shop.systemTestEnabled ? 'TESTE ATIVO' : 'SÓ MENSALIDADES'}
                                          </span>
                                          <span className="bg-[#080B11] border border-white/5 text-cyan-400 px-2 py-0.5 rounded text-[8px] font-bold">
                                            CHAVE TESTE: {shop.systemTestPassword || 'NÃO GERADO'}
                                          </span>
                                        </div>
                                        {shop.systemTestEnabled && (
                                          <p className="text-[9px] text-gray-400 font-mono leading-relaxed">
                                            Duração de <strong>{shop.systemTestDurationDays || 7} dias</strong> {shop.systemTestStartDate ? `(Início: ${new Date(shop.systemTestStartDate).toLocaleDateString('pt-BR')})` : '(Sem data inicial)'}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Monthly license key view / list */}
                                  <div className="border border-white/5 bg-[#080B11]/20 rounded-xl p-2.5 font-mono space-y-1.5 text-left">
                                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                      <span>🔑 Chave Este Mês:</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyKey(`${shop.id}-current`, currentKeyVal)}
                                        className="text-[9px] text-[var(--brand-color)] hover:underline flex items-center gap-1 cursor-pointer font-bold border-none bg-transparent"
                                      >
                                        {copiedKey === `${shop.id}-current` ? 'COPIADO!' : 'COPIAR CHAVE'}
                                      </button>
                                    </div>
                                    <div className="text-xs font-black text-white tracking-widest bg-[#080B11]/80 border border-white/5 py-1 px-2 rounded uppercase select-all text-center">
                                      {currentKeyVal}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setExpandedKeysShopId(expandedKeysShopId === shop.id ? null : shop.id)}
                                      className="w-full text-center text-[8px] font-bold text-gray-400 hover:text-white uppercase pt-1 tracking-wider cursor-pointer border-none bg-transparent block"
                                    >
                                      {expandedKeysShopId === shop.id ? '▲ Recolher Chaves Mensais' : '▼ Ver Todas as Chaves Mensais'}
                                    </button>

                                    {expandedKeysShopId === shop.id && shop.monthlyLicenseKeys && (
                                      <div className="space-y-1 pt-1.5 border-t border-white/5 max-h-[140px] overflow-y-auto pr-1 text-[10px]">
                                        {Object.entries(shop.monthlyLicenseKeys).sort((a,b) => a[0].localeCompare(b[0])).map(([monthKey, monthVal]) => {
                                          const parts = monthKey.split('-');
                                          const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                                          const monthLabel = dateObj.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
                                          const keyId = `${shop.id}-${monthKey}`;
                                          return (
                                            <div key={monthKey} className="flex items-center justify-between bg-[#080B11]/50 p-1 rounded border border-white/5">
                                              <span className="text-[8px] text-gray-400 font-bold uppercase">{monthLabel}</span>
                                              <span className="font-black text-white tracking-wider text-[11px] select-all px-1.5">{monthVal}</span>
                                              <button
                                                type="button"
                                                onClick={() => handleCopyKey(keyId, String(monthVal))}
                                                className="text-[8px] text-[var(--brand-color)] font-bold uppercase hover:underline border-none bg-transparent cursor-pointer"
                                              >
                                                {copiedKey === keyId ? 'COPIADO!' : 'COPIAR'}
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  {/* Inline Editing Controls */}
                                  <div className="flex gap-2 font-mono">
                                    {isEditing ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateShop(
                                            shop.id, 
                                            editingName, 
                                            editingCustomDomain,
                                            editingTrialEnabled,
                                            editingTrialStartDate,
                                            editingTrialDuration,
                                            editingTrialPassword
                                          )}
                                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[9px] uppercase rounded-xl py-2 px-3 flex items-center justify-center gap-1 transition cursor-pointer border-none"
                                        >
                                          <span>SALVAR</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingShopId(null)}
                                          className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[9px] uppercase rounded-xl py-2 px-3 text-center border border-white/5 transition cursor-pointer"
                                        >
                                          <span>CANCELAR</span>
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingShopId(shop.id);
                                          setEditingName(shop.name);
                                          setEditingCustomDomain(shop.customDomain || '');
                                          setEditingTrialEnabled(shop.systemTestEnabled || false);
                                          setEditingTrialStartDate(shop.systemTestStartDate || '');
                                          setEditingTrialDuration(shop.systemTestDurationDays || 7);
                                          setEditingTrialPassword(shop.systemTestPassword || 'TESTE123');
                                        }}
                                        className="w-full bg-white/5 hover:bg-white/10 text-white font-bold text-[9px] uppercase rounded-xl py-2 px-3 text-center border border-white/5 transition flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Settings className="w-3" />
                                        <span>EDITAR DETALHES & TESTE GRÁTIS</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-4 pt-2 border-t border-white/10 space-y-2 font-mono">
                                  <span className="text-[8px] uppercase font-bold text-gray-500 tracking-wider block text-left">
                                    🔗 CANAIS DE ACESSO RÁPIDO:
                                  </span>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <a 
                                      href={accessUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-[#080B11] hover:bg-white/5 border border-white/5 hover:border-[var(--brand-color)]/20 text-white hover:text-[var(--brand-color)] font-bold text-[8px] uppercase text-center rounded-xl py-2 px-1 flex flex-col items-center justify-center gap-1 transition no-underline"
                                      title="Visualizar como Cliente (Agendamento em Espera)"
                                    >
                                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                                      <span>CLIENTE</span>
                                    </a>

                                    <a 
                                      href={barberUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-[#080B11] hover:bg-white/5 border border-white/5 hover:border-[var(--brand-color)]/20 text-white hover:text-[var(--brand-color)] font-bold text-[8px] uppercase text-center rounded-xl py-2 px-1 flex flex-col items-center justify-center gap-1 transition no-underline"
                                      title="Acessar o Painel de Controle do Barbeiro"
                                    >
                                      <Scissors className="w-3 h-3 text-amber-400" />
                                      <span>BARBEIRO</span>
                                    </a>

                                    <a 
                                      href={tvUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="bg-[#080B11] hover:bg-white/5 border border-white/5 hover:border-[var(--brand-color)]/20 text-white hover:text-[var(--brand-color)] font-bold text-[8px] uppercase text-center rounded-xl py-2 px-1 flex flex-col items-center justify-center gap-1 transition no-underline"
                                      title="Painel de Chamadas para TV / Monitor do Estabelecimento"
                                    >
                                      <Tv className="w-3 h-3 text-emerald-400" />
                                      <span>MONITOR TV</span>
                                    </a>
                                  </div>

                                  <div className="flex gap-1.5 flex-wrap pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(accessUrl);
                                        alert(`Link do CLIENTE copiado para esta barbearia:\n${accessUrl}`);
                                      }}
                                      className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 py-1.5 px-2 rounded-xl text-[8px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                      <span>COPIAR CLIENTE</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(barberUrl);
                                        alert(`Link do BARBEIRO copiado para esta barbearia:\n${barberUrl}`);
                                      }}
                                      className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 py-1.5 px-2 rounded-xl text-[8px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                      <span>COPIAR BARBEIRO</span>
                                    </button>

                                    {shop.id !== 'matriz' && shop.id !== 'default' && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteShop(shop.id, shop.name)}
                                        className="bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 px-2 rounded-xl text-[8px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                                        title="Deletar permanentemente esta barbearia"
                                      >
                                        <Trash2 className="w-3 h-3 text-rose-500" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                  {/* ALTERAR CREDENCIAIS DE ACESSO MASTER */}
                  <div className="bg-[#101622] rounded-2xl border border-white/5 p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-black uppercase tracking-wider">
                        <Shield className="w-4 h-4 text-rose-400" />
                        <span>Ajustes de Acesso do Painel Master</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMasterCredsForm(!showMasterCredsForm)}
                        className="bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 rounded-xl px-3 py-1.5 font-mono text-[9px] font-bold uppercase transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {showMasterCredsForm ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>OCULTAR AJUSTES</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>ALTERAR LOGIN MASTER</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[10px] text-gray-400 uppercase font-mono tracking-wide leading-relaxed">
                      Gerencie seu e-mail e sua senha de administrador master. Esses dados são usados para carregar este painel de controle.
                    </p>

                    {showMasterCredsForm && (
                      <div className="space-y-4 pt-1 font-mono">
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            Novo E-mail de Login
                          </label>
                          <input
                            type="email"
                            placeholder="EX: administrador@sistema.com"
                            value={masterNewEmail}
                            onChange={(e) => setMasterNewEmail(e.target.value)}
                            className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold font-mono text-white focus:outline-none focus:border-rose-400"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5 text-left font-mono">
                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                              Nova Senha Secreta
                            </label>
                            <input
                              type="password"
                              placeholder="Mínimo 6 caracteres"
                              value={masterNewPassword}
                              onChange={(e) => setMasterNewPassword(e.target.value)}
                              className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold font-mono text-white focus:outline-none focus:border-rose-400"
                            />
                          </div>

                          <div className="space-y-1.5 text-left font-mono">
                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                              Confirmar Nova Senha
                            </label>
                            <input
                              type="password"
                              placeholder="Digite a senha novamente"
                              value={masterNewPasswordConfirm}
                              onChange={(e) => setMasterNewPasswordConfirm(e.target.value)}
                              className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold font-mono text-white focus:outline-none focus:border-rose-400"
                            />
                          </div>
                        </div>

                        {masterCredsMsg && (
                          <div className={`p-3 rounded-xl text-xs font-mono text-center font-bold ${
                            masterCredsMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
                          }`}>
                            {masterCredsMsg.text}
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleChangeMasterCredentials}
                            className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-3 px-5 font-bold uppercase text-[10px] tracking-wider transition-all cursor-pointer font-mono flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 hover:scale-[1.01] active:scale-[0.99]"
                          >
                            <Save className="w-4 h-4" />
                            <span>Gravar Novas Credenciais Admin</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-center text-gray-600 font-mono tracking-wide leading-relaxed uppercase pt-6">
                    SISTEMA COMPLETO DE GERENCIAMENTO DE ATIVAÇÕES RECORRENTES. O CLIENTE UTILIZA ESSES CÓDIGOS PARA ACESSO MENSAL.
                  </p>
                </div>
              )}

              {/* TAB 2: SAAS MULTI-TENANT */}
              {masterTab === 'tenants' && (
                <div className="space-y-6 animate-fade-in text-left">
                  
                  {/* STATS SUMMARY BOX */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#101622] rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-gray-400 font-mono tracking-wider">Total de Lojas SaaS</span>
                      <span className="text-2xl font-black font-mono mt-1 text-white">{superShops.length}</span>
                    </div>
                    <div className="bg-[#101622] rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider">Lojas Ativas</span>
                      <span className="text-2xl font-black font-mono mt-1 text-emerald-400">
                        {superShops.filter(s => s.active).length}
                      </span>
                    </div>
                    <div className="bg-[#101622] rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-bold text-rose-400 font-mono tracking-wider">Lojas Bloqueadas</span>
                      <span className="text-2xl font-black font-mono mt-1 text-rose-400">
                        {superShops.filter(s => !s.active).length}
                      </span>
                    </div>
                  </div>

                  {/* CADASTRO FORM */}
                  <div className="bg-[#101622] rounded-2xl border border-white/5 p-5 shadow-xl space-y-4">
                    <div className="flex items-center gap-2 text-[var(--brand-color)] font-mono text-xs font-black uppercase tracking-wider">
                      <Plus className="w-4 h-4 text-[var(--brand-color)]" />
                      <span>Cadastrar Nova Barbearia SaaS (Inquilino)</span>
                    </div>

                    {superMsg && (
                      <div className={`p-3 rounded-xl text-xs font-mono text-center font-bold ${
                        superMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
                      }`}>
                        {superMsg.text}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left font-mono">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          Identificador Slug Único (Ex: barbearia-alfa)
                        </label>
                        <input
                          type="text"
                          placeholder="EX: barbearia-muller"
                          value={newShopId}
                          onChange={(e) => setNewShopId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                          className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold font-mono text-white focus:outline-none focus:border-[var(--brand-color)]"
                        />
                        <span className="text-[9px] text-gray-500 uppercase font-mono tracking-wider">
                          Será usado na URL: ?shop=<strong>{newShopId || 'identificador'}</strong>
                        </span>
                      </div>

                      <div className="space-y-1.5 text-left font-mono">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          Nome Oficial da Loja (Nome Comercial)
                        </label>
                        <input
                          type="text"
                          placeholder="EX: Barbearia Muller & Co."
                          value={newShopName}
                          onChange={(e) => setNewShopName(e.target.value)}
                          className="w-full bg-[#080B11] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold font-mono text-white focus:outline-none focus:border-[var(--brand-color)]"
                        />
                      </div>
                    </div>

                    <div className="pt-2 font-mono">
                      <button
                        type="button"
                        onClick={handleCreateShop}
                        className="w-full bg-[var(--brand-color)] hover:bg-[var(--brand-hover)] text-slate-950 rounded-xl py-3.5 px-5 font-black uppercase text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-color)]/10"
                      >
                        <Plus className="w-4 h-4" />
                        <span>CRIAR BARBEARIA MULTI-TENANT</span>
                      </button>
                    </div>
                  </div>

                  {/* TENANTS LIST GRID */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest text-left">
                      Lista de Barbearias Cadastradas ({superShops.length})
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {superShops.map((shop) => {
                        const accessUrl = shop.customDomain 
                          ? `http://${shop.customDomain}` 
                          : `${window.location.origin}/?shop=${shop.id}`;
                        const barberUrl = shop.customDomain 
                          ? `http://${shop.customDomain}/?view=barber` 
                          : `${window.location.origin}/?shop=${shop.id}&view=barber`;
                        const tvUrl = shop.customDomain 
                          ? `http://${shop.customDomain}/?view=tv` 
                          : `${window.location.origin}/?shop=${shop.id}&view=tv`;
                        const isOriginal = shop.id === 'matriz' || shop.id === 'default';

                        return (
                          <div 
                            key={shop.id}
                            className={`bg-[#101622] rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                              shop.active ? 'border-white/5 shadow-xl font-sans' : 'border-rose-500/20 opacity-80 font-sans'
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Header Name & Toggle status */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-left font-mono">
                                  <h4 className="text-sm font-black text-white uppercase tracking-wide">
                                    {shop.name}
                                  </h4>
                                  <span className="text-[9px] text-gray-500 uppercase tracking-wide block">
                                    Slug ID: <strong className="text-[var(--brand-color)]">{shop.id}</strong>
                                  </span>
                                </div>

                                {/* Toggle Action */}
                                {isOriginal ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black tracking-widest font-mono px-2 py-1 rounded-full uppercase scale-90 shrink-0">
                                    SISTEMA PADRÃO
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleShopActive(shop.id, shop.active)}
                                    className={`px-2 py-1 rounded-full text-[8px] font-black tracking-widest font-mono border cursor-pointer transition uppercase shrink-0 scale-90 ${
                                      shop.active 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 hover:scale-95'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400 hover:scale-95'
                                    }`}
                                    title={shop.active ? "Clique para Bloquear" : "Clique para Desbloquear"}
                                  >
                                    {shop.active ? "● ATIVO" : "○ BLOQUEADO"}
                                  </button>
                                )}
                              </div>

                              {/* Custom Domain Info */}
                              <div className="font-mono text-xs text-left bg-[#080B11]/40 border border-white/5 rounded-xl p-2.5">
                                <span className="text-[8px] uppercase font-bold text-gray-400 tracking-wider block mb-0.5">
                                  🌐 Domínio da Barbearia
                                </span>
                                <span className="text-xs text-white break-all block font-bold">
                                  {shop.customDomain ? (
                                    <span className="text-[var(--brand-color)]">{shop.customDomain}</span>
                                  ) : (
                                    <span className="text-gray-500 italic text-[10px]">Utilizando slug /?shop={shop.id}</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Actions block footer */}
                            <div className="mt-4 pt-2 border-t border-white/10 space-y-2 font-mono">
                              <span className="text-[8px] uppercase font-bold text-gray-500 tracking-wider block text-left">
                                🔗 CANAIS DE ACESSO RÁPIDO:
                              </span>
                              <div className="grid grid-cols-3 gap-1.5">
                                <a 
                                  href={accessUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-[#080B11] hover:bg-white/5 border border-white/5 hover:border-[var(--brand-color)]/20 text-white hover:text-[var(--brand-color)] font-bold text-[8px] uppercase text-center rounded-xl py-2 px-1 flex flex-col items-center justify-center gap-1 transition no-underline"
                                  title="Visualizar como Cliente (Agendamento em Espera)"
                                >
                                  <ExternalLink className="w-3 h-3 text-cyan-400" />
                                  <span>CLIENTE</span>
                                </a>

                                <a 
                                  href={barberUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-[#080B11] hover:bg-white/5 border border-white/5 hover:border-[var(--brand-color)]/20 text-white hover:text-[var(--brand-color)] font-bold text-[8px] uppercase text-center rounded-xl py-2 px-1 flex flex-col items-center justify-center gap-1 transition no-underline"
                                  title="Acessar o Painel de Controle do Barbeiro"
                                >
                                  <Scissors className="w-3 h-3 text-amber-400" />
                                  <span>BARBEIRO</span>
                                </a>

                                <a 
                                  href={tvUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-[#080B11] hover:bg-white/5 border border-white/5 hover:border-[var(--brand-color)]/20 text-white hover:text-[var(--brand-color)] font-bold text-[8px] uppercase text-center rounded-xl py-2 px-1 flex flex-col items-center justify-center gap-1 transition no-underline"
                                  title="Painel de Chamadas para TV / Monitor do Estabelecimento"
                                >
                                  <Tv className="w-3 h-3 text-emerald-400" />
                                  <span>MONITOR TV</span>
                                </a>
                              </div>

                              <div className="flex gap-1.5 flex-wrap pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(accessUrl);
                                    alert(`Link do CLIENTE copiado para esta barbearia:\n${accessUrl}`);
                                  }}
                                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 py-1.5 px-2 rounded-xl text-[8px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>COPIAR CLIENTE</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(barberUrl);
                                    alert(`Link do BARBEIRO copiado para esta barbearia:\n${barberUrl}`);
                                  }}
                                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 py-1.5 px-2 rounded-xl text-[8px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>COPIAR BARBEIRO</span>
                                </button>

                                {!isOriginal && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteShop(shop.id, shop.name)}
                                    className="bg-rose-950/20 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 px-2 rounded-xl text-[8px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                                    title="Deletar permanentemente esta barbearia"
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-500" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-gray-600 font-mono tracking-wide leading-relaxed uppercase pt-6">
                    PLATAFORMA MULTI-TENANT ISOLADA. NENHUMA BARBEARIA CADASTRADA POSSUI ACESSO AOS DADOS DE OUTRA.
                  </p>
                </div>
              )}

            </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 📱 PORTAL DO CLIENTE - QR CODE GENERATION MODAL         */}
      {/* ======================================================== */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-5 z-[9999] backdrop-blur-md animate-fade-in">
          <div className="bg-[#101622] border border-[var(--brand-color)]/20 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl relative">
            {/* Close Button Top Right */}
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[#080B11] p-1.5 rounded-full border border-white/5 cursor-pointer transition"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon */}
            <div className="w-14 h-14 bg-[var(--brand-color)]/10 rounded-2xl flex items-center justify-center mx-auto border border-[var(--brand-color)]/20 shadow-lg text-[var(--brand-color)]">
              <QrCode className="w-7 h-7" />
            </div>

            {/* Title */}
            <div>
              <h3 className="text-base font-black uppercase font-mono tracking-wider text-white">
                PORTAL DO CLIENTE QR CODE
              </h3>
              <p className="text-[10px] text-[var(--brand-color)] font-mono tracking-widest uppercase font-bold mt-0.5">
                Aponte a Câmera para Entrar na Fila
              </p>
            </div>

            {/* QR Code Graphic Canvas with high contrast border */}
            <div className="bg-white p-4 rounded-2xl max-w-[200px] mx-auto border-4 border-white/10 shadow-inner flex items-center justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin)}`} 
                alt="QR Code de acesso" 
                className="w-full h-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Instructions */}
            <p className="text-[11px] text-gray-400 leading-relaxed uppercase font-sans font-medium px-2">
              Imprima ou deixe este QR Code disponível na recepção. Seus clientes podem escanear para emitir senhas e acompanhar a espera online!
            </p>

            {/* Copy Button Row */}
            <div className="pt-2 flex flex-col gap-2">
              <div className="bg-[#080B11] border border-white/5 rounded-xl py-2 px-3 flex items-center justify-between gap-2 min-w-0">
                <span className="text-[9px] font-mono text-gray-500 truncate select-all">
                  {window.location.origin}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin);
                    alert("Link do portal copiado para a área de transferência!");
                  }}
                  className="p-1 text-gray-400 hover:text-[var(--brand-color)] transition cursor-pointer"
                  title="Copiar Link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full bg-[var(--brand-color)] hover:bg-[var(--brand-color)]/90 text-[#07090E] font-black uppercase text-xs tracking-wider rounded-xl py-2.5 transition cursor-pointer"
              >
                ENTENDIDO, FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 💈 CHAMADA DE SENHA POPUP (VISUAL NO PAINEL DO ADMIN)     */}
      {/* ======================================================== */}
      {newlyCalledTicket && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-5 z-[9999] backdrop-blur-md animate-fade-in">
          <div className="bg-[#101622] border-2 border-[var(--brand-color)]/40 rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl relative animate-scale-up">
            {/* Close Button Top Right */}
            <button
              onClick={() => setNewlyCalledTicket(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[#080B11] p-1.5 rounded-full border border-white/5 cursor-pointer transition"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

             {/* Decorative Alert Badge */}
            <div className="flex flex-col items-center gap-2">
              <div className="animate-pulse inline-block">
                <span className="bg-[var(--brand-color)]/10 border border-[var(--brand-color)]/20 text-[var(--brand-color)] text-[10px] uppercase font-mono tracking-widest px-4 py-1.5 rounded-full font-black">
                  🔔 PRÓXIMO CLIENTE CHAMADO!
                </span>
              </div>
              <div className="w-full max-w-xs space-y-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 uppercase tracking-widest px-1">
                  <span>Fechando em</span>
                  <span className="text-[var(--brand-color)] font-bold">{adminAnnouncementSeconds}s</span>
                </div>
                <div className="w-full bg-[#080B11] h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="bg-[var(--brand-color)] h-full transition-all duration-75 relative" 
                    style={{ width: `${adminAnnouncementProgress}%` }}
                  >
                    <div className="absolute top-0 right-0 h-full w-4 bg-white/40 blur-[2px]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Huge Ticket Code Display */}
            <div>
              <span className="text-[10px] text-gray-500 font-mono tracking-widest block uppercase font-bold">NÚMERO DA SENHA</span>
              <h2 className="text-7xl md:text-8xl font-mono font-black text-[var(--brand-color)] filter drop-shadow-[0_0_15px_rgba(0,227,150,0.15)] leading-none mt-1">
                {newlyCalledTicket.number}
              </h2>
            </div>

            {/* Customer Details block */}
            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 font-mono tracking-widest block uppercase font-bold">NOME DO CLIENTE</span>
              <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wide truncate max-w-sm mx-auto">
                {newlyCalledTicket.name}
              </h3>
            </div>

            {/* Quantidade de pessoas, Tipo de serviço, Outros agendamentos */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-[#080B11] border border-white/5 rounded-2xl p-3.5 text-center">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block font-mono">TIPO DE SERVIÇO</span>
                <span className="text-xs font-extrabold text-white uppercase block mt-1 truncate">{newlyCalledTicket.serviceName}</span>
              </div>
              <div className="bg-[#080B11] border border-white/5 rounded-2xl p-3.5 text-center">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block font-mono">QTD PESSOAS</span>
                <span className="text-xs font-extrabold text-[var(--brand-color)] uppercase block mt-1 tracking-wider">
                  {((newlyCalledTicket.adultsCount || 0) + (newlyCalledTicket.kidsCount || 0)) || 1} PESSOA(S)
                </span>
              </div>
            </div>

            {/* Fila statistics */}
            <div className="bg-[#080B11]/50 border border-white/5 rounded-2xl p-4 text-center space-y-1">
              <span className="text-[9px] text-gray-500 font-mono block uppercase tracking-widest">SITUAÇÃO DA FILA DE ESPERA</span>
              <div className="flex justify-around items-center pt-1.5 text-xs">
                <div className="text-center">
                  <span className="text-gray-400 font-mono block text-[9px] uppercase">Geral Aguardando:</span>
                  <span className="font-extrabold text-white text-sm font-mono block mt-0.5">
                    {syncState?.tickets.filter(t => t.status === 'AGUARDANDO' && isToday(t.createdAt)).length || 0} Clientes
                  </span>
                </div>
                <div className="w-px h-8 bg-white/5" />
                <div className="text-center">
                  <span className="text-gray-400 font-mono block text-[9px] uppercase">Deste Barbeiro:</span>
                  <span className="font-extrabold text-[var(--brand-color)] text-sm font-mono block mt-0.5">
                    {syncState?.tickets.filter(t => t.barberId === newlyCalledTicket.barberId && t.status === 'AGUARDANDO' && isToday(t.createdAt)).length || 0} Clientes
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="pt-2">
              <button
                onClick={() => setNewlyCalledTicket(null)}
                className="w-full bg-[var(--brand-color)] hover:bg-[var(--brand-color)]/95 text-[#07090E] font-black uppercase text-xs tracking-wider rounded-xl py-3 transition cursor-pointer font-mono"
              >
                INICIAR ATENDIMENTO AGORA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL PWA INSTALLATION HELPER MODAL */}
      {showPwaHelpModal && (
        <div className="fixed inset-0 bg-[#07090E]/95 flex items-center justify-center p-5 z-[9999] backdrop-blur-md">
          <div className="bg-[#101622] border border-[var(--brand-color)]/15 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowPwaHelpModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[#080B11] p-1.5 rounded-full border border-white/5 cursor-pointer transition animate-none"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="w-14 h-14 bg-[var(--brand-color)]/10 rounded-2xl flex items-center justify-center mx-auto border border-[var(--brand-color)]/25 shadow-lg shadow-[var(--brand-color)]/5">
              <Smartphone className="w-7 h-7 text-[var(--brand-color)]" />
            </div>

            <h3 className="text-sm font-black uppercase font-mono tracking-wider text-white">
              {language === 'pt-BR' ? 'Instalar no Celular' : 'Install on Mobile'}
            </h3>

            {/* Platform selection tabs */}
            <div className="grid grid-cols-2 gap-1 bg-[#080B11] p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setPwaActiveTab('android')}
                className={`py-2 rounded-lg text-[10px] font-black font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  pwaActiveTab === 'android'
                    ? 'bg-[var(--brand-color)] text-[#07090E]'
                    : 'text-gray-400 hover:text-white bg-transparent'
                }`}
              >
                🤖 Android
              </button>
              <button
                onClick={() => setPwaActiveTab('ios')}
                className={`py-2 rounded-lg text-[10px] font-black font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  pwaActiveTab === 'ios'
                    ? 'bg-[var(--brand-color)] text-[#07090E]'
                    : 'text-gray-400 hover:text-white bg-transparent'
                }`}
              >
                🍏 iOS / iPhone
              </button>
            </div>

            {/* Instruction Lists */}
            {pwaActiveTab === 'android' ? (
              <div className="text-left bg-[#080B11]/60 rounded-2xl p-4 border border-white/5 font-mono text-[10px] leading-relaxed space-y-3.5 text-gray-300">
                <div className="flex items-start gap-2.5">
                  <span className="bg-[var(--brand-color)] text-[#07090E] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] shrink-0 mt-0.5 font-sans">1</span>
                  <span>
                    {language === 'pt-BR' ? (
                      <span>Abra o link no navegador <strong className="text-[var(--brand-color)]">Google Chrome</strong></span>
                    ) : (
                      <span>Open this link in <strong className="text-[var(--brand-color)]">Google Chrome</strong></span>
                    )}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="bg-[var(--brand-color)] text-[#07090E] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] shrink-0 mt-0.5 font-sans">2</span>
                  <span>
                    {language === 'pt-BR' ? (
                      <>Toque nos <strong className="text-white">três pontos (menu)</strong> no topo ou rodapé do navegador</>
                    ) : (
                      <>Tap the <strong className="text-white">three dots (menu)</strong> beside the address bar</>
                    )}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="bg-[var(--brand-color)] text-[#07090E] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] shrink-0 mt-0.5 font-sans">3</span>
                  <span>
                    {language === 'pt-BR' ? (
                      <>Selecione <strong className="text-[var(--brand-color)]">Instalar aplicativo</strong> ou <strong className="text-[var(--brand-color)]">Adicionar à tela inicial</strong></>
                    ) : (
                      <>Select <strong className="text-[var(--brand-color)]">Install App</strong> or <strong className="text-[var(--brand-color)]">Add to Home screen</strong></>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-left bg-[#080B11]/60 rounded-2xl p-4 border border-white/5 font-mono text-[10px] leading-relaxed space-y-3.5 text-gray-300">
                <div className="flex items-start gap-2.5">
                  <span className="bg-[var(--brand-color)] text-[#07090E] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] shrink-0 mt-0.5 font-sans">1</span>
                  <span>
                    {language === 'pt-BR' ? (
                      <span>Abra o link usando o navegador nativo <strong className="text-[var(--brand-color)]">Safari</strong></span>
                    ) : (
                      <span>Open this link in your native <strong className="text-[var(--brand-color)]">Safari</strong> browser</span>
                    )}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="bg-[var(--brand-color)] text-[#07090E] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] shrink-0 mt-0.5 font-sans">2</span>
                  <span className="flex flex-wrap items-center gap-1">
                    {language === 'pt-BR' ? (
                      <>Toque no botão <strong className="text-white">Compartilhar</strong> (<Share className="w-3.5 h-3.5 inline text-[var(--brand-color)]" />)</>
                    ) : (
                      <>Tap the <strong className="text-white">Share</strong> option (<Share className="w-3.5 h-3.5 inline text-[var(--brand-color)]" />)</>
                    )}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="bg-[var(--brand-color)] text-[#07090E] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] shrink-0 mt-0.5 font-sans">3</span>
                  <span>
                    {language === 'pt-BR' ? (
                      <>Role para baixo e toque em <strong className="text-[var(--brand-color)]">Adicionar à Tela de Início</strong></>
                    ) : (
                      <>Scroll down and tap <strong className="text-[var(--brand-color)]">Add to Home Screen</strong></>
                    )}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowPwaHelpModal(false)}
              className="w-full bg-[var(--brand-color)] hover:bg-[var(--brand-hover)] text-[#07090E] rounded-2xl py-3.5 font-bold uppercase tracking-wider transition cursor-pointer font-mono text-xs shadow-lg shadow-[var(--brand-color)]/10"
            >
              {language === 'pt-BR' ? 'ENTENDI' : 'DONE'}
            </button>
          </div>
        </div>
      )}

      {/* TERMS ACCEPTANCE MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-[#07090E]/95 flex items-center justify-center p-5 z-[10000] backdrop-blur-md font-mono text-center">
          <div className="bg-[#101622] border-2 border-[var(--brand-color)]/20 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative text-left">
            <button
              onClick={() => setShowTermsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[#080B11] p-1.5 rounded-full border border-white/5 cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/25">
              <FileText className="w-6 h-6 text-amber-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {language === 'pt-BR' ? 'Política de Lista de Espera e Termo de Cancelamento' : 'Waitlist Policy and Cancellation Terms'}
              </h3>

              <p className="text-gray-400 text-xs leading-relaxed uppercase">
                {language === 'pt-BR'
                  ? 'Ao entrar na nossa lista de espera, você concorda que um barbeiro estará reservado aguardando a sua chegada. Devido ao tempo exclusivo dedicado ao seu atendimento, esta reserva é estritamente não reembolsável e não transferível caso você cancele ou não compareça.'
                  : 'By entering our waitlist, you agree that a barber will be reserved waiting for your arrival. Due to the exclusive time dedicated to your service, this reservation is strictly non-refundable and non-transferable if you cancel or do not show up.'}
              </p>
            </div>

            {/* Checkbox section */}
            <div className="bg-[#080B11] p-3 rounded-xl border border-white/5 flex items-start gap-3 mt-4">
              <input 
                type="checkbox"
                id="termsCheckbox"
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
                className="mt-0.5 rounded border-white/10 text-[var(--brand-color)] focus:ring-0 bg-[#101622] cursor-pointer w-4 h-4"
              />
              <label htmlFor="termsCheckbox" className="text-[11px] text-gray-300 font-mono uppercase tracking-wider cursor-pointer select-none leading-normal">
                {language === 'pt-BR'
                  ? 'Li e aceito a política de cancelamento.'
                  : 'I read and accept the cancellation policy.'} <span className="text-amber-500 font-bold">*</span>
              </label>
            </div>

            {/* Helper tip for Stripe testing */}
            {!!((syncState?.settings?.stripePublishableKey && syncState.settings.stripePublishableKey.trim() !== '') || (syncState?.settings?.stripeSecretKey && syncState.settings.stripeSecretKey.trim() !== '')) && (
              <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-[9px] text-emerald-400 uppercase leading-normal font-mono text-center">
                {language === 'pt-BR'
                  ? 'DICA DE TESTE: Use o cartão de teste do Stripe (Número: 4242 4242 4242 4242, qualquer data futura e CVC 123) para simular o pagamento e gerar sua senha!'
                  : 'TEST TIP: Use Stripe test card (Number: 4242 4242 4242 4242, any future expiry and CVC 123) to complete the payment and generate your ticket!'}
              </div>
            )}

            <button
              disabled={!termsChecked}
              onClick={() => {
                setShowTermsModal(false);
                handleRequestTicket();
              }}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-black uppercase tracking-widest transition cursor-pointer text-xs shadow-lg border ${
                termsChecked 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400/20 shadow-emerald-950/20 active:scale-[0.99]' 
                  : 'bg-gray-800 text-gray-500 border-white/5 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {!!((syncState?.settings?.stripePublishableKey && syncState.settings.stripePublishableKey.trim() !== '') || (syncState?.settings?.stripeSecretKey && syncState.settings.stripeSecretKey.trim() !== ''))
                  ? (language === 'pt-BR' ? 'CONCORDAR E IR PARA O PAGAMENTO' : 'AGREE AND GO TO PAYMENT')
                  : (language === 'pt-BR' ? 'CONCORDAR E FINALIZAR RESERVA' : 'AGREE AND BOOK NOW')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* EMBEDDED STRIPE CHECKOUT WITH PAYMENT ELEMENT (APPLE PAY & GOOGLE PAY SUPPORT) */}
      {stripeClientSecret && stripePublishableKey && stripeTicketData && (
        <EmbeddedStripeCheckout
          publishableKey={stripePublishableKey}
          clientSecret={stripeClientSecret}
          ticketData={stripeTicketData}
          language={language === 'pt-BR' ? 'pt-BR' : 'en'}
          onClose={() => {
            setStripeClientSecret(null);
            setStripePublishableKey(null);
            setStripeTicketData(null);
          }}
        />
      )}

      {/* STRIPE CHECKOUT REDIRECTION MODAL / OVERLAY FOR IFRAME COMPATIBILITY */}
      {stripeCheckoutUrl && (
        <div className="fixed inset-0 bg-[#07090E]/95 flex items-center justify-center p-5 z-[10000] backdrop-blur-md font-mono text-center">
          <div className="bg-[#101622] border-2 border-[var(--brand-color)]/20 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setStripeCheckoutUrl(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-[#080B11] p-1.5 rounded-full border border-white/5 cursor-pointer transition"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="w-14 h-14 bg-[var(--brand-color)]/10 rounded-2xl flex items-center justify-center mx-auto border border-[var(--brand-color)]/25 animate-pulse">
              <CreditCard className="w-7 h-7 text-[var(--brand-color)]" />
            </div>

            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              {language === 'pt-BR' ? 'PAGAMENTO DA RESERVA' : 'RESERVATION PAYMENT'}
            </h3>

            <p className="text-gray-400 text-xs leading-relaxed uppercase">
              {language === 'pt-BR'
                ? 'Sua reserva foi gerada! Clique no botão abaixo para efetuar o pagamento do sinal de forma totalmente segura:'
                : 'Your booking has been reserved! Click the button below to complete the deposit payment securely:'}
            </p>

            <a
              href={stripeCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setTimeout(() => setStripeCheckoutUrl(null), 1000);
              }}
              className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl py-4 font-black uppercase tracking-widest transition cursor-pointer text-xs shadow-lg shadow-emerald-950/20 active:scale-[0.99] border border-emerald-400/20"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{language === 'pt-BR' ? 'EFETUAR PAGAMENTO DO SINAL' : 'PAY DEPOSIT NOW'}</span>
            </a>

            <div className="bg-[#080B11] p-3 rounded-xl border border-white/5 text-[9px] text-gray-500 uppercase leading-normal">
              {language === 'pt-BR'
                ? 'Nota: Como estamos no editor, navegadores impedem redirecionamentos internos. Ao clicar acima, a página oficial do Stripe Checkout abrirá com segurança em uma nova aba.'
                : 'Note: Since we are running in the editor, browsers block automatic framing. Clicking above opens Stripe Checkout securely in a new tab.'}
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
