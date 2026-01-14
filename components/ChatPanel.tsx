
import React, { useState, useEffect, useRef } from 'react';
import { Message, User, UserRole } from '../types';
import { Send, Users, ShieldAlert, Info, ChevronDown, ChevronUp, Minimize2, Maximize2 } from 'lucide-react';

interface Props {
  user: User;
  messages: Message[];
  onSendMessage: (text: string) => void;
  className?: string;
}

export const ChatPanel: React.FC<Props> = ({ user, messages, onSendMessage, className = '' }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!isMinimized) {
        scrollToBottom();
    }
  }, [messages, isMinimized]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  /**
   * PRIVACY WALL LOGIC
   * Masks identities based on who is viewing (currentUser.role) and who sent the message (msg.senderRole).
   */
  const getDisplayName = (msg: Message) => {
    if (msg.senderId === user.id) return "You";

    // --- OPERATOR VIEWING ---
    // Rule: Hide Agent names. Show Staff names (as "Staff: [Name]" or similar).
    if (user.role === UserRole.OPERATOR) {
      if (msg.senderRole === UserRole.AGENT) return "Agent Reply"; // Mask Agent Name
      if (msg.senderRole === UserRole.ADMIN) return "Staff: Admin";
      if (msg.senderRole === UserRole.STAFF) return `Staff: ${msg.senderName}`; 
      return "Colleague";
    }

    // --- AGENT VIEWING ---
    // Rule: Never show Operator's real name.
    if (user.role === UserRole.AGENT) {
      if (msg.senderRole === UserRole.OPERATOR) return "Operator"; // Mask Operator Name
      if (msg.senderRole === UserRole.ADMIN) return "Staff: Admin"; 
      if (msg.senderRole === UserRole.STAFF) return `Staff: ${msg.senderName}`;
      return "Platform";
    }

    // --- STAFF/ADMIN VIEWING (See Everything) ---
    return `${msg.senderName} (${msg.senderRole})`;
  };

  const getMessageColor = (msg: Message) => {
      const isMe = msg.senderId === user.id;
      if (isMe) return 'bg-brand-600 text-white';
      
      if (msg.senderRole === UserRole.OPERATOR) return 'bg-amber-100 text-amber-900 border border-amber-200';
      if (msg.senderRole === UserRole.AGENT) return 'bg-slate-100 text-slate-800 border border-slate-200';
      if (msg.senderRole === UserRole.STAFF || msg.senderRole === UserRole.ADMIN) return 'bg-blue-50 text-blue-900 border border-blue-100';
      
      return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col transition-all duration-300 ${isMinimized ? 'h-auto' : className}`}>
      
      {/* Header */}
      <div 
        className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center cursor-pointer hover:bg-slate-100 transition"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
            <Users size={18} className="text-slate-500"/> 
            <div>
                <h2 className="font-bold text-slate-900 text-sm">
                {user.role === UserRole.OPERATOR ? 'Operations Channel' : 'Team Chat'}
                </h2>
                {!isMinimized && (
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    {user.role === UserRole.OPERATOR ? (
                        <><ShieldAlert size={10} /> Identities anonymized.</>
                    ) : (
                        "Official communication channel."
                    )}
                    </p>
                )}
            </div>
        </div>
        <button 
            className="text-slate-400 hover:text-slate-600 p-1"
            title={isMinimized ? "Maximize" : "Minimize"}
        >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
        </button>
      </div>
      
      {/* Body (Collapsible) */}
      {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
                {messages.length === 0 && (
                    <div className="text-center text-slate-400 text-xs py-10">
                        No messages yet. Start the conversation.
                    </div>
                )}
                {messages.map((msg) => {
                if (msg.isSystem) {
                    return (
                        <div key={msg.id} className="flex justify-center my-3">
                            <span className="text-[10px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 italic flex items-center gap-1.5 shadow-sm">
                                <Info size={10} className="text-slate-400"/>
                                {msg.content}
                            </span>
                        </div>
                    );
                }

                const isMe = msg.senderId === user.id;
                return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-3 text-sm shadow-sm ${getMessageColor(msg)}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
                        {getDisplayName(msg)} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    </div>
                );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl">
                <div className="flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={user.role === UserRole.OPERATOR ? "Type to Admin..." : "Type message..."}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                />
                <button onClick={handleSend} className="bg-brand-600 text-white p-2.5 rounded-lg hover:bg-brand-700 transition shadow-sm">
                    <Send size={18} />
                </button>
                </div>
            </div>
          </>
      )}
    </div>
  );
};
