import React, { useEffect } from 'react';
import { AppNotification } from '../types';

interface ToastProps {
  notification: AppNotification;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose, notification]);

  const bgColors = {
    info: 'bg-blue-50 border-blue-100 text-blue-900',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    warning: 'bg-amber-50 border-amber-100 text-amber-900',
    error: 'bg-red-50 border-red-100 text-red-900',
  };

  const icons = {
    info: '📢',
    success: '🎉',
    warning: '⚠️',
    error: '🛑',
  };

  return (
    <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border shadow-xl ring-1 ring-black ring-opacity-5 transition-all transform animate-fade-in-up ${bgColors[notification.type]} mb-3 backdrop-blur-md`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-2xl ml-3">
            {icons[notification.type]}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-black">{notification.title}</p>
            <p className="mt-1 text-xs font-medium opacity-90 leading-relaxed">{notification.message}</p>
          </div>
          <div className="mr-4 flex flex-shrink-0">
            <button
              type="button"
              className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">إغلاق</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;