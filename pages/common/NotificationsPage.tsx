
import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { UserNotification } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
    Bell, CheckCircle, AlertTriangle, Info, CreditCard, 
    Calendar, Trash2, Check, Filter, Search, ArrowRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type FilterType = 'ALL' | 'UNREAD' | 'BOOKING' | 'PAYMENT' | 'ALERT';

export const NotificationsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user]);

    const loadNotifications = async () => {
        if (!user) return;
        setLoading(true);
        const data = await notificationService.getNotifications(user.id);
        setNotifications(data);
        setLoading(false);
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        if (confirm('Mark all notifications as read?')) {
            await notificationService.markAllAsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
    };

    const handleClearHistory = async () => {
        if (!user) return;
        if (confirm('Delete all READ notifications? This cannot be undone.')) {
            await notificationService.clearAllRead(user.id);
            loadNotifications();
        }
    };

    const handleClick = async (notif: UserNotification) => {
        if (!notif.isRead) {
            await notificationService.markAsRead(notif.id);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        }
        if (notif.link) {
            navigate(notif.link);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await notificationService.deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // Filter Logic
    const filteredNotifications = notifications.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                              n.message.toLowerCase().includes(search.toLowerCase());
        
        let matchesFilter = true;
        if (filter === 'UNREAD') matchesFilter = !n.isRead;
        else if (filter !== 'ALL') matchesFilter = n.type === filter;

        return matchesSearch && matchesFilter;
    });

    const getIcon = (type: string) => {
        switch(type) {
            case 'BOOKING': return <Calendar size={20} className="text-blue-500" />;
            case 'PAYMENT': return <CreditCard size={20} className="text-green-500" />;
            case 'ALERT': 
            case 'WARNING': return <AlertTriangle size={20} className="text-red-500" />;
            case 'SUCCESS': return <CheckCircle size={20} className="text-emerald-500" />;
            default: return <Info size={20} className="text-slate-400" />;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="text-brand-600" /> Notifications
                    </h1>
                    <p className="text-slate-500">Manage your alerts and activity history.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition"
                    >
                        <Check size={16} /> Mark All Read
                    </button>
                    <button 
                        onClick={handleClearHistory}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition"
                    >
                        <Trash2 size={16} /> Clear History
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 overflow-x-auto w-full md:w-auto">
                        {(['ALL', 'UNREAD', 'BOOKING', 'PAYMENT', 'ALERT'] as FilterType[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${filter === f ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400">Loading notifications...</div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-12 text-slate-400">
                            <Bell size={48} className="mb-4 opacity-20" />
                            <p>No notifications found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredNotifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => handleClick(n)}
                                    className={`p-4 flex gap-4 hover:bg-slate-50 transition cursor-pointer group ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                                >
                                    <div className={`mt-1 p-2 rounded-full h-fit shrink-0 ${!n.isRead ? 'bg-white shadow-sm border border-slate-100' : 'bg-slate-100'}`}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                {n.title}
                                            </h4>
                                            <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                                {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{n.message}</p>
                                    </div>
                                    <div className="flex flex-col items-end justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {n.link && (
                                            <button className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1">
                                                View <ArrowRight size={12} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => handleDelete(e, n.id)}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    {!n.isRead && (
                                        <div className="w-2 h-2 rounded-full bg-brand-600 mt-2 shrink-0 self-center"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
