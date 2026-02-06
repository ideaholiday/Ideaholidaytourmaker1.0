
import React, { useState, useEffect, useRef } from 'react';
import { notificationService } from '../services/notificationService';
import { UserNotification } from '../types';
import { Bell, CheckCircle, AlertTriangle, Info, CreditCard, Calendar, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '../services/firebase';

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time Listener
  useEffect(() => {
    if (!user) return;

    // Create a query against the collection
    const q = query(
        collection(db, 'user_notifications'),
        where('recipientId', '==', user.id)
    );

    // Subscribe to updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as UserNotification);
        // Sort client-side to avoid composite index requirement issues
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
    }, (error) => {
        console.error("Notification listener error:", error);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: UserNotification) => {
      if (!notif.isRead) {
          await notificationService.markAsRead(notif.id);
          // Local state updates automatically via snapshot listener
      }
      setIsOpen(false);
      if (notif.link) navigate(notif.link);
  };

  const handleMarkAllRead = async () => {
      if (!user) return;
      await notificationService.markAllAsRead(user.id);
  };

  const handleViewAll = () => {
      setIsOpen(false);
      navigate('/notifications');
  };

  if (!user) return null;

  const getIcon = (type: string) => {
      switch(type) {
          case 'BOOKING': return <Calendar size={16} className="text-blue-500" />;
          case 'PAYMENT': return <CreditCard size={16} className="text-green-500" />;
          case 'ALERT': 
          case 'WARNING': return <AlertTriangle size={16} className="text-red-500" />;
          case 'SUCCESS': return <CheckCircle size={16} className="text-emerald-500" />;
          default: return <Info size={16} className="text-slate-400" />;
      }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-full transition-all"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse shadow-sm border border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
            </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-sm text-slate-800">Notifications</h3>
                {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                        Mark all read
                    </button>
                )}
            </div>

            <div className="max-h-[350px] overflow-y-auto">
                {recentNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                        <Bell size={32} className="mx-auto mb-2 opacity-20" />
                        No notifications yet.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {recentNotifications.map(n => (
                            <div 
                                key={n.id} 
                                onClick={() => handleNotificationClick(n)}
                                className={`p-3 hover:bg-slate-50 cursor-pointer transition flex gap-3 ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                            >
                                <div className={`mt-1 p-1.5 rounded-full shrink-0 ${!n.isRead ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                    <p className="text-[10px] text-slate-400 mt-1.5">{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                </div>
                                {!n.isRead && (
                                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 shrink-0"></div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <button 
                    onClick={handleViewAll} 
                    className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center justify-center gap-1 w-full py-1"
                >
                    View All Notifications <ArrowRight size={12}/>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
