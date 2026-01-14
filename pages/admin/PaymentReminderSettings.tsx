
import React, { useState } from 'react';
import { paymentReminderService } from '../../services/paymentReminderService';
import { ReminderConfig } from '../../types';
import { Save, Bell, Clock, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PaymentReminderSettings: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ReminderConfig>(paymentReminderService.getConfig());
  const [lastRunCount, setLastRunCount] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleSave = () => {
    paymentReminderService.updateConfig(config);
    alert("Settings saved successfully.");
  };

  const handleRunNow = async () => {
      if (!user) return;
      setIsRunning(true);
      const count = await paymentReminderService.processAutomatedReminders(user);
      setLastRunCount(count);
      setIsRunning(false);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="text-brand-600" /> Automated Payment Reminders
        </h1>
        <p className="text-slate-500">Configure when and how clients are notified about pending payments.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8">
        
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
                <h3 className="font-bold text-slate-900">Enable Automated Reminders</h3>
                <p className="text-sm text-slate-500">System will check daily for eligible bookings.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={config.enabled} 
                    onChange={e => setConfig({...config, enabled: e.target.checked})}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
        </div>

        {/* Schedule Config */}
        <div className={`space-y-6 transition-opacity ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} /> Schedule Strategy
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">1st Reminder (Gentle)</label>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">T +</span>
                        <input 
                            type="number" 
                            min="0"
                            value={config.firstReminderDays}
                            onChange={e => setConfig({...config, firstReminderDays: Number(e.target.value)})}
                            className="w-20 border border-slate-300 rounded-lg p-2 text-center font-bold"
                        />
                        <span className="text-sm text-slate-500">Days</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Days after booking creation</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">2nd Reminder (Follow-up)</label>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">T +</span>
                        <input 
                            type="number" 
                            min="1"
                            value={config.secondReminderDays}
                            onChange={e => setConfig({...config, secondReminderDays: Number(e.target.value)})}
                            className="w-20 border border-slate-300 rounded-lg p-2 text-center font-bold"
                        />
                        <span className="text-sm text-slate-500">Days</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Final Reminder (Urgent)</label>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">T +</span>
                        <input 
                            type="number" 
                            min="2"
                            value={config.finalReminderDays}
                            onChange={e => setConfig({...config, finalReminderDays: Number(e.target.value)})}
                            className="w-20 border border-slate-300 rounded-lg p-2 text-center font-bold"
                        />
                        <span className="text-sm text-slate-500">Days</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Channels */}
        <div className={`space-y-4 pt-4 border-t border-slate-100 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare size={18} /> Delivery Channels
            </h4>
            <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked disabled className="rounded text-brand-600" /> 
                    <span className="text-sm font-medium text-slate-700">Email (Mandatory)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={config.includeWhatsApp} 
                        onChange={e => setConfig({...config, includeWhatsApp: e.target.checked})}
                        className="rounded text-green-600 focus:ring-green-500" 
                    /> 
                    <span className="text-sm font-medium text-slate-700">WhatsApp (Opt-in)</span>
                </label>
            </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleSave}
                    className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-brand-700 transition flex items-center gap-2"
                >
                    <Save size={18} /> Save Settings
                </button>
                <button 
                    onClick={handleRunNow}
                    disabled={isRunning || !config.enabled}
                    className="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg font-medium border border-slate-200 hover:bg-slate-50 transition text-sm disabled:opacity-50"
                >
                    {isRunning ? 'Processing...' : 'Run Manually Now'}
                </button>
            </div>
            
            {lastRunCount !== null && (
                <span className="text-sm text-green-600 font-bold animate-in fade-in">
                    Processed: {lastRunCount} reminders sent.
                </span>
            )}
        </div>

      </div>
    </div>
  );
};
