import React, { useState, useRef, useEffect } from 'react';
import { AppNotification } from '../types';

interface HeaderProps {
  onReviewerLoginClick: () => void;
  onManagerLoginClick: () => void;
  onServiceProviderLoginClick: () => void;
  onOpenSettings: () => void;
  user: { type: 'reviewer' | 'manager' | 'serviceProvider'; name: string } | null;
  onLogout: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearNotifications: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onReviewerLoginClick, 
  onManagerLoginClick, 
  onServiceProviderLoginClick, 
  onOpenSettings,
  user, 
  onLogout,
  notifications,
  onMarkAsRead,
  onClearNotifications
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-emerald-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          <div className="flex items-center gap-2 md:hidden">
            <button 
              className="text-emerald-900 p-2 hover:bg-emerald-50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
              </svg>
            </button>
            <div className="relative">
               {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left md:text-right cursor-pointer" onClick={() => window.location.href = '/'}>
              <h1 className="text-lg md:text-xl font-black text-emerald-900 leading-none">منصة الحلول الرقمية</h1>
              <p className="text-[9px] md:text-[10px] text-emerald-600 font-bold mt-1 tracking-tight">بمكتب الوطن للخدمات المساندة</p>
            </div>
            <div 
              className="w-10 h-10 md:w-12 md:h-12 bg-[#059669] rounded-xl flex items-center justify-center text-white shadow-lg cursor-pointer hover:rotate-3 transition-transform overflow-hidden" 
              onClick={() => window.location.href = '/'}
            >
              <span className="text-xl md:text-2xl font-black">و</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {!user && (
              <>
                <a href="#about" className="text-gray-600 hover:text-emerald-600 font-semibold transition-colors">عن المنصة</a>
                <a href="#departments" className="text-gray-600 hover:text-emerald-600 font-semibold transition-colors">الأقسام</a>
                <a href="#services" className="text-gray-600 hover:text-emerald-600 font-semibold transition-colors">الخدمات</a>
              </>
            )}

            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
                className="relative p-2 text-gray-500 hover:text-emerald-600 transition-colors rounded-xl hover:bg-emerald-50 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute top-full left-0 mt-4 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[60] animate-fade-in-up">
                  <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                       <h3 className="font-black text-emerald-900">الإشعارات</h3>
                       <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{unreadCount} جديد</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setIsNotificationsOpen(false); onOpenSettings(); }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="إعدادات الإشعارات"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      <button onClick={onClearNotifications} className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">مسح الكل</button>
                    </div>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center flex flex-col items-center gap-3">
                        <span className="text-4xl grayscale opacity-30">🔕</span>
                        <p className="text-gray-400 text-sm font-bold">لا توجد إشعارات جديدة</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => onMarkAsRead(n.id)} className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!n.read ? 'bg-emerald-50/30' : ''}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-xl mt-1 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">{n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : n.type === 'error' ? '❌' : 'ℹ️'}</span>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <p className={`font-bold text-sm mb-1 ${!n.read ? 'text-emerald-900' : 'text-slate-700'}`}>{n.title}</p>
                                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">{formatDate(n.timestamp)}</span>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed font-medium">{n.message}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 bg-emerald-500 rounded-full mt-2 self-center"></span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 bg-slate-50 text-center">
                    <button className="text-[10px] text-emerald-600 font-black hover:underline">عرض كل الأرشيف</button>
                  </div>
                </div>
              )}
            </div>
            
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                  <div className="w-8 h-8 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-sm">
                    <p className="text-gray-500 text-[10px] font-bold">يا هلا،</p>
                    <p className="text-emerald-900 font-black text-xs">{user.name}</p>
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors"
                >
                  خروج
                </button>
              </div>
            ) : (
              <div className="relative group">
                <button className="text-gray-600 hover:text-emerald-600 font-semibold transition-colors flex items-center gap-1">
                  دخول النظام
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 z-50">
                  <button onClick={onReviewerLoginClick} className="block w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold transition-colors">بوابة المراجعين</button>
                  <button onClick={onServiceProviderLoginClick} className="block w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold transition-colors">بوابة مزودي الخدمات</button>
                  <button onClick={onManagerLoginClick} className="block w-full text-right px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold transition-colors">بوابة المدير</button>
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-emerald-50 animate-fade-in-up">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <button 
              onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50/50 rounded-xl text-emerald-900 font-bold"
            >
              <div className="flex items-center gap-2">
                <span>🔔</span>
                <span>الإشعارات</span>
              </div>
              {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
            </button>

            {!user ? (
              <>
                <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-600 font-bold hover:bg-emerald-50 rounded-xl transition-colors">عن المنصة</a>
                <a href="#departments" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-600 font-bold hover:bg-emerald-50 rounded-xl transition-colors">الأقسام</a>
                <a href="#services" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-gray-600 font-bold hover:bg-emerald-50 rounded-xl transition-colors">الخدمات</a>
                <div className="pt-2 border-t border-gray-100">
                  <button onClick={() => { onReviewerLoginClick(); setIsMobileMenuOpen(false); }} className="block w-full text-right px-4 py-3 text-emerald-700 font-black">بوابة المراجعين</button>
                  <button onClick={() => { onServiceProviderLoginClick(); setIsMobileMenuOpen(false); }} className="block w-full text-right px-4 py-3 text-emerald-700 font-black">بوابة مزودي الخدمات</button>
                  <button onClick={() => { onManagerLoginClick(); setIsMobileMenuOpen(false); }} className="block w-full text-right px-4 py-3 text-emerald-700 font-black">بوابة المدير</button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="px-4 py-3 bg-emerald-50 rounded-xl">
                  <p className="text-gray-500 text-xs font-bold">مرحباً بك،</p>
                  <p className="text-emerald-900 font-black">{user.name}</p>
                </div>
                <button 
                  onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                  className="w-full text-center text-red-600 font-bold py-3 bg-red-50 rounded-xl"
                >
                  تسجيل خروج
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;