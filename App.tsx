import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Toast from './components/Toast';
import { DEPARTMENTS, SERVICES, CONTACT_INFO } from './constants';
import { chatWithGemini, generateSpeech } from './geminiService';
import { Message, Service, AppNotification, NotificationPreferences } from './types';

// Types for User State
type UserType = 'reviewer' | 'manager' | 'serviceProvider';
interface User {
  type: UserType;
  name: string;
  nationalId?: string;
  phone?: string;
  id?: string;
}

// Add types for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Helper functions for audio
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'يا هلا ومسهلا بك في منصة الحلول الرقمية بمكتب الوطن! ✨ تحت إدارة وإشراف الأستاذ ماجد سعود العميري. وش بغيت تسأل عنه اليوم؟ أبشر بعزك وفالك طيب.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  const [showReviewerLoginModal, setShowReviewerLoginModal] = useState(false);
  const [showManagerLoginModal, setShowManagerLoginModal] = useState(false);
  const [showServiceProviderLoginModal, setShowServiceProviderLoginModal] = useState(false);
  const [showRaedCardModal, setShowRaedCardModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    types: { info: true, success: true, warning: true, error: true },
    channels: { inApp: true, email: false }
  });

  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial Welcome Notification
  useEffect(() => {
    const timer = setTimeout(() => {
      addNotification(
        'يا مرحبا حياكم الله',
        'في منصة الحلول الرقمية بمكتب الوطن، تحت إدارة وإشراف الأستاذ ماجد سعود العميري مدير المكتب. نزهلها لك وفالك طيب.',
        'info'
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    // Check preferences
    if (!preferences.types[type] || !preferences.channels.inApp) {
      console.log(`Notification filtered out by user preferences: ${type}`);
      return;
    }

    const newNote: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNote, ...prev]);
    setToasts(prev => [newNote, ...prev]);
    
    if (preferences.channels.email) {
      console.log(`Simulating email notification to ${user?.name || 'Guest'}: ${title}`);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const playResponseAudio = async (text: string) => {
    const base64Audio = await generateSpeech(text);
    if (!base64Audio) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    
    try {
      setIsAudioPlaying(true);
      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsAudioPlaying(false);
      source.start();
    } catch (e) {
      console.error("Audio playback error", e);
      setIsAudioPlaying(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }]
    }));

    const response = await chatWithGemini(userMsg, history);
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
    
    // Play response and notify
    playResponseAudio(response);
    if (messages.length > 2) {
         if (Math.random() > 0.7) {
             setTimeout(() => {
                 addNotification('تم تحديث المحادثة', 'وصلك رد جديد من المساعد الذكي نورة', 'success');
             }, 1000);
         }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e: any) => setInput(e.results[0][0].transcript);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } else {
        addNotification('عفواً', 'متصفحك لا يدعم خدمة التعرف الصوتي', 'warning');
    }
  };

  const handleLogin = (userType: UserType, name: string) => {
      setUser({ type: userType, name });
      addNotification('تم تسجيل الدخول', `أهلاً بك يا ${name}، تم تسجيل دخولك بنجاح.`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    setMessages([{ role: 'assistant', content: 'يا هلا بك مرة ثانية في مكتب الوطن! ننتظر رجعتك.' }]);
    addNotification('تسجيل الخروج', 'تم تسجيل خروجك من النظام بنجاح.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Cairo'] relative">
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(t => (
          <Toast key={t.id} notification={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      <Header 
        onReviewerLoginClick={() => setShowReviewerLoginModal(true)} 
        onManagerLoginClick={() => setShowManagerLoginModal(true)} 
        onServiceProviderLoginClick={() => setShowServiceProviderLoginModal(true)}
        onOpenSettings={() => setShowPreferencesModal(true)}
        user={user}
        onLogout={handleLogout}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onClearNotifications={clearNotifications}
      />

      <main className="flex-grow overflow-x-hidden">
        {/* Hero Section */}
        {!user && (
          <section className="relative pt-24 pb-40 overflow-hidden bg-[#064e3b] text-white">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-400 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-400 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"></div>
            </div>
            
            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-8 border border-white/20">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold tracking-wide uppercase">تحت إشراف الأستاذ ماجد سعود العميري</span>
              </div>
              
              <h2 className="text-4xl md:text-7xl font-black mb-6 leading-[1.15] animate-fade-in-up">
                منصة الحلول الرقمية <br/> 
                <span className="text-emerald-400 text-3xl md:text-5xl">بمكتب الوطن للخدمات المساندة</span>
              </h2>
              
              <p className="text-lg md:text-2xl text-emerald-200 font-bold mb-10 animate-fade-in-up delay-75">
                لجميع المنصات الحكومية والخاصة
              </p>
              
              <p className="text-lg md:text-xl mb-12 max-w-3xl mx-auto text-emerald-10/80 leading-relaxed font-medium animate-fade-in-up delay-100">
                يا مرحبا حياكم الله في وجهتكم الأولى لإنجاز كافة المعاملات الحكومية والخاصة. نحرص على خدمتكم بكفاءة واحترافية تحت إشراف مباشر من مدير المكتب.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-in-up delay-200">
                <button 
                  onClick={() => setShowReviewerLoginModal(true)} 
                  className="w-full sm:w-auto bg-white text-[#064e3b] px-12 py-4 rounded-2xl font-black text-lg shadow-2xl hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
                >
                  بوابة المراجعين 📁
                </button>
                <a 
                  href="#support" 
                  className="w-full sm:w-auto bg-emerald-500 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 border border-emerald-400/30"
                >
                  اسأل نورة ✨
                </a>
              </div>

              <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap justify-center gap-10 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                <span className="font-bold text-lg">أبشر</span>
                <span className="font-bold text-lg">قوى</span>
                <span className="font-bold text-lg">ناجز</span>
                <span className="font-bold text-lg">بلدي</span>
                <span className="font-bold text-lg">إيجار</span>
              </div>
            </div>
          </section>
        )}

        {/* Dashboard for Logged In User */}
        {user && (
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-black text-emerald-900 mb-2">يا هلا، {user.name} 👋</h2>
                <p className="text-gray-500 font-bold">مرحباً بك في منصة الحلول الرقمية بمكتب الوطن</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => addNotification('تم استلام الطلب', 'جاري معالجة طلب الخدمة الجديد رقم #8821', 'info')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all">طلب خدمة جديدة</button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="group bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 transition-all hover:-translate-y-2 hover:shadow-2xl">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🔍</div>
                <h3 className="font-black text-2xl mb-3 text-slate-800">استعلام المعاملات</h3>
                <p className="text-gray-500 font-medium mb-6 leading-relaxed">تابع حالة طلباتك الحالية وتواصل مع المعقب المباشر.</p>
                <button className="text-blue-600 font-black text-sm flex items-center gap-2 hover:gap-4 transition-all">دخول القسم ←</button>
              </div>
              
              <div className="group bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-50 transition-all hover:-translate-y-2 hover:shadow-2xl">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">📄</div>
                <h3 className="font-black text-2xl mb-3 text-slate-800">الأرشفة والوثائق</h3>
                <p className="text-gray-500 font-medium mb-6 leading-relaxed">تحميل كافة الوثائق المنجزة والشهادات الرسمية.</p>
                <button className="text-amber-600 font-black text-sm flex items-center gap-2 hover:gap-4 transition-all">دخول القسم ←</button>
              </div>
              
              <div 
                onClick={() => setShowRaedCardModal(true)}
                className="group bg-emerald-50 p-10 rounded-[2.5rem] shadow-xl shadow-emerald-200/30 border border-emerald-100 transition-all hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
              >
                <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">💳</div>
                <h3 className="font-black text-2xl mb-3 text-emerald-900">بطاقة رائد</h3>
                <p className="text-emerald-700 font-medium mb-6 leading-relaxed">عرض وتحميل بطاقة العمل الحر المعتمدة.</p>
                <button className="text-emerald-600 font-black text-sm flex items-center gap-2 hover:gap-4 transition-all">عرض البطاقة ←</button>
              </div>
            </div>
          </div>
        )}

        {/* Services Section */}
        <section id="services" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-emerald-900 mb-4">قسم الخدمات الإلكترونية المساندة</h2>
              <p className="text-emerald-600 text-xl font-bold max-w-3xl mx-auto">لجميع المنصات الحكومية والخاصة</p>
              <p className="text-gray-500 font-bold max-w-2xl mx-auto mt-4">نغطي كافة المنصات الحكومية والخاصة لضمان لك تجربة سريعة وخالية من المتاعب تحت إشراف الأستاذ ماجد العميري.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {SERVICES.map((service) => (
                <div key={service.id} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:border-emerald-100 group">
                  <div className="text-4xl mb-6 group-hover:scale-125 transition-transform inline-block">{service.icon}</div>
                  <h3 className="text-xl font-black text-emerald-900 mb-3">{service.title}</h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed font-medium">{service.description}</p>
                  <ul className="space-y-2 mb-8">
                    {service.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <span className="text-emerald-500">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                    <span className="text-emerald-700 font-black text-sm">{service.priceRange || 'تواصل معنا'}</span>
                    <a href={CONTACT_INFO.socials.whatsapp} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-200 transition-colors">اطلب الآن</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Nora Support Section */}
        <section id="support" className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black mb-4 inline-block border border-emerald-100">ذكاء اصطناعي سعودي</span>
              <h2 className="text-3xl md:text-5xl font-black text-emerald-900 mb-4">تحدث مع نورة</h2>
              <p className="text-gray-500 font-bold">المساعدة الذكية المتوفرة لخدمتكم على مدار الساعة.</p>
            </div>
            
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[650px] border border-slate-100 relative">
              <div className="bg-[#065f46] p-6 text-white flex justify-between items-center shadow-lg relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl animate-pulse">✨</div>
                  <div>
                    <h3 className="font-black text-lg">نورة | بنت الوطن</h3>
                    <p className="text-emerald-200 text-xs font-bold">متصل الآن - نزهلها لك وفالك طيب</p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setMessages([{ role: 'assistant', content: 'أبشر بعزك، تم تصفير المحادثة. وش بخاطرك تسأل عنه؟' }])} className="text-xs font-black bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20">تصفير ↺</button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fdfdfd] shadow-inner">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                    <div className={`relative max-w-[85%] p-5 rounded-[1.5rem] shadow-sm leading-relaxed text-sm md:text-base font-medium ${
                      msg.role === 'user' 
                        ? 'bg-[#059669] text-white rounded-tr-none shadow-lg shadow-emerald-200' 
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                    }`}>
                      {msg.content}
                      {msg.role === 'assistant' && (
                        <button 
                          onClick={() => playResponseAudio(msg.content)}
                          className="absolute bottom-2 left-2 text-emerald-600 hover:text-emerald-800 opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isAudioPlaying ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 p-5 rounded-[1.5rem] animate-pulse flex items-center gap-2">
                       <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                       <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                       <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-6 bg-white border-t border-slate-50 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 flex items-center bg-[#f8fafc] rounded-2xl border border-slate-200 px-4 py-1 transition-all focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white">
                    <input 
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="اسأل نورة عن أي خدمة (مثلاً: كيف أوثق عقد إيجار؟)..."
                      className="flex-1 bg-transparent py-4 outline-none text-slate-700 text-sm font-bold"
                    />
                    <button 
                      onClick={toggleListening} 
                      className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                        isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      🎤
                    </button>
                  </div>
                  <button 
                    onClick={handleSend} 
                    disabled={isLoading}
                    className="bg-[#059669] text-white px-10 py-5 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    إرسال
                  </button>
                </div>
                <p className="text-[10px] text-center text-gray-400 font-bold">نورة تعتمد على تقنيات الذكاء الاصطناعي المتطورة لخدمتكم</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Numbers Grid */}
        <section className="py-24 bg-emerald-950 text-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black mb-4">فريق خدمة العملاء</h2>
              <p className="text-emerald-300 font-bold">نحن جاهزون لاستقبال اتصالاتكم واستفساراتكم على مدار الساعة</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {CONTACT_INFO.phones.map((phone, i) => (
                <a 
                  key={phone} 
                  href={`tel:${phone}`}
                  className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center hover:bg-white/10 transition-all hover:-translate-y-1 group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📞</div>
                  <div className="text-sm font-black text-emerald-400 mb-1">خدمة العملاء</div>
                  <div className="text-xs font-bold opacity-80">{phone}</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowPreferencesModal(false)} className="absolute top-6 left-6 text-gray-400 hover:text-red-500 transition-colors">✕</button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl">⚙️</div>
              <div>
                <h3 className="text-2xl font-black text-emerald-900 leading-tight">إعدادات الإشعارات</h3>
                <p className="text-slate-400 text-sm font-bold">خصص كيف ومتى نرسل لك التنبيهات</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h4 className="font-black text-emerald-800 text-sm uppercase tracking-widest border-b border-emerald-50 pb-2">أنواع التنبيهات</h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'success', label: 'النجاح', emoji: '✅' },
                    { key: 'info', label: 'المعلومات', emoji: 'ℹ️' },
                    { key: 'warning', label: 'التحذيرات', emoji: '⚠️' },
                    { key: 'error', label: 'الأخطاء', emoji: '❌' }
                  ].map(({ key, label, emoji }) => (
                    <label key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-emerald-50 hover:border-emerald-100 transition-all">
                      <div className="flex items-center gap-2">
                        <span>{emoji}</span>
                        <span className="font-bold text-slate-700 text-sm">{label}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={preferences.types[key as keyof typeof preferences.types]}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          types: { ...preferences.types, [key]: e.target.checked }
                        })}
                        className="w-5 h-5 accent-emerald-600 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-emerald-800 text-sm uppercase tracking-widest border-b border-emerald-50 pb-2">قنوات التنبيه</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-emerald-50 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🔔</span>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">تنبيهات داخل المنصة</p>
                        <p className="text-[10px] text-slate-400 font-medium">عرض التنبيهات والبطاقات المنبثقة</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={preferences.channels.inApp}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        channels: { ...preferences.channels, inApp: e.target.checked }
                      })}
                      className="w-5 h-5 accent-emerald-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-emerald-50 transition-all opacity-60">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">✉️</span>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">البريد الإلكتروني</p>
                        <p className="text-[10px] text-slate-400 font-medium">إرسال ملخص بالمعاملات المنجزة (قريباً)</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={preferences.channels.email}
                      disabled
                      className="w-5 h-5 accent-slate-400 rounded cursor-not-allowed"
                    />
                  </label>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowPreferencesModal(false);
                  addNotification('تم الحفظ', 'تم تحديث إعدادات الإشعارات الخاصة بك بنجاح.', 'success');
                }} 
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modals */}
      {showReviewerLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70] flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[3rem] max-w-md w-full shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowReviewerLoginModal(false)} className="absolute top-8 left-8 text-gray-400 hover:text-red-500 transition-colors text-xl font-bold">✕</button>
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">👤</div>
            <h3 className="text-3xl font-black text-emerald-900 mb-2 text-center">دخول المراجعين</h3>
            <p className="text-center text-gray-500 font-bold text-sm mb-8">أهلاً بك مجدداً في منصة الحلول الرقمية</p>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-wider">رقم الهوية الوطنية</label>
                <input type="text" placeholder="1XXXXXXXXX" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-bold text-lg" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-wider">رقم الجوال</label>
                <input type="tel" placeholder="05XXXXXXXX" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-bold text-lg" />
              </div>
              <button onClick={() => { handleLogin('reviewer', 'عميل الوطن'); setShowReviewerLoginModal(false); }} className="w-full bg-[#059669] text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-95 mt-6">دخول آمن</button>
            </div>
            <p className="mt-8 text-center text-xs text-gray-400 font-bold leading-relaxed">من خلال تسجيل الدخول، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بمكتب الوطن.</p>
          </div>
        </div>
      )}

      {/* Raed Card Modal */}
      {showRaedCardModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[80] flex items-center justify-center p-6">
          <div className="bg-white p-1 rounded-[2.5rem] max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.3)] relative animate-fade-in-up overflow-hidden">
             <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-10 text-center relative overflow-hidden rounded-[2.4rem]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <button onClick={() => setShowRaedCardModal(false)} className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors">✕</button>
                
                <div className="w-28 h-28 bg-white p-1 rounded-full mx-auto mb-6 shadow-2xl relative z-10">
                  <div className="w-full h-full bg-emerald-50 rounded-full flex items-center justify-center text-5xl">👨‍💻</div>
                </div>
                
                <h3 className="font-black text-2xl text-white mb-1 relative z-10">{CONTACT_INFO.ceo.name}</h3>
                <p className="text-emerald-100 text-sm font-bold mb-8 opacity-80 relative z-10">برمجة نظم المعلومات - SAP</p>
                
                <div className="bg-white p-6 rounded-3xl shadow-inner mb-6 flex flex-col items-center">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_Sample.svg" alt="QR" className="w-40 h-40" />
                  <p className="mt-4 text-[10px] text-gray-400 font-black">رقم الوثيقة: FL-298374-HW</p>
                </div>
                
                <div className="space-y-2 text-white/80 font-bold text-xs uppercase tracking-widest">
                  <p>Freelancer License</p>
                  <p className="text-[10px] opacity-60">Verified by Ministry of Human Resources</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <a 
        href={CONTACT_INFO.socials.whatsapp} 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 left-8 z-[100] bg-emerald-500 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl hover:scale-110 hover:bg-emerald-600 transition-all active:scale-90"
        title="تواصل واتساب"
      >
        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-2.32 0-4.208 1.887-4.208 4.208 0 2.32 1.888 4.208 4.208 4.208 2.32 0 4.208-1.888 4.208-4.208 0-2.32-1.888-4.208-4.208-4.208zm0 6.641c-1.341 0-2.433-1.092-2.433-2.433 0-1.341 1.092-2.433 2.433-2.433 1.341 0 2.433 1.092 2.433 2.433 0 1.341-1.092 2.433-2.433 2.433zm.103-9.813C6.315 3 1.5 7.815 1.5 13.604c0 1.851.482 3.587 1.325 5.099L1.5 24l5.441-1.428c1.42.748 3.033 1.173 4.742 1.173 5.799 0 10.513-4.715 10.513-10.141 0-5.789-4.715-10.604-10.065-10.604zm-.103 18.784c-1.613 0-3.123-.427-4.444-1.177l-.319-.181-3.301.866.881-3.213-.199-.316a8.55 8.55 0 0 1-1.311-4.521c0-4.746 3.857-8.604 8.604-8.604 4.746 0 8.604 3.858 8.604 8.604.001 4.746-3.857 8.604-8.604 8.604z"/></svg>
      </a>

      {/* Footer */}
      <footer className="bg-slate-900 text-white pt-24 pb-12 rounded-t-[5rem]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-black">و</div>
                 <h2 className="text-2xl font-black">منصة الوطن</h2>
              </div>
              <p className="text-slate-400 font-bold leading-relaxed">
                شريككم الموثوق للتحول الرقمي والخدمات المساندة في المملكة العربية السعودية.
              </p>
              <div className="flex gap-4">
                <a href={CONTACT_INFO.socials.x} target="_blank" className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors">𝕏</a>
                <a href={CONTACT_INFO.socials.facebook} target="_blank" className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-colors">f</a>
              </div>
            </div>
            
            <div>
              <h4 className="text-xl font-black mb-8">روابط سريعة</h4>
              <ul className="space-y-4 font-bold text-slate-400">
                <li><a href="#" className="hover:text-emerald-500 transition-colors">الرئيسية</a></li>
                <li><a href="#services" className="hover:text-emerald-500 transition-colors">خدماتنا</a></li>
                <li><a href="#about" className="hover:text-emerald-500 transition-colors">من نحن</a></li>
                <li><a href="#support" className="hover:text-emerald-500 transition-colors">الدعم الذكي</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xl font-black mb-8">أهم الخدمات</h4>
              <ul className="space-y-4 font-bold text-slate-400">
                <li><a href="#" className="hover:text-emerald-500 transition-colors">توثيق عقود إيجار</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">خدمات أبشر وقوى</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">تأسيس المنشآت</a></li>
                <li><a href="#" className="hover:text-emerald-500 transition-colors">التعقيب الميداني</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xl font-black mb-8">معلومات رسمية</h4>
               <ul className="space-y-4 font-bold text-slate-400 text-xs">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  عقد اتفاق رقم: <span>---</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  بتاريخ: <span>---</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  بموجب تفويض رقم: <span>---</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-500 font-bold text-xs flex flex-col md:flex-row justify-between items-center gap-4">
             <p>© 2024 مكتب الوطن. جميع الحقوق محفوظة.</p>
             <p>مرخص من وزارة الموارد البشرية والتنمية الاجتماعية</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;