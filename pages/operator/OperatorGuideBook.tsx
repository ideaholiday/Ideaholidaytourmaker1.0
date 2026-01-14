
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { guideBookService } from '../../services/guideBookService';
import { GuideBookEntry, UserRole } from '../../types';
import { Book, Search, ArrowLeft, ChevronRight, Bookmark, Tag, Calendar } from 'lucide-react';

export const OperatorGuideBook: React.FC = () => {
  const navigate = useNavigate();
  const [guides, setGuides] = useState<GuideBookEntry[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<GuideBookEntry | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    // Fetch guides relevant for Operators
    setGuides(guideBookService.getGuides(UserRole.OPERATOR));
  }, []);

  const categories = ['ALL', ...Array.from(new Set(guides.map(g => g.category)))];

  const filteredGuides = guides.filter(g => {
      const matchesSearch = g.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || g.category === categoryFilter;
      return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/operator/dashboard')} className="text-slate-500 hover:text-slate-800">
            <ArrowLeft size={20} />
        </button>
        <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Book className="text-brand-600" /> Operator Handbook
            </h1>
            <p className="text-slate-500">Operational procedures, inventory management, and policy guides.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: Navigation & List */}
          <div className={`space-y-6 ${selectedGuide ? 'hidden lg:block' : 'block'}`}>
              
              {/* Search */}
              <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input 
                      type="text" 
                      placeholder="Search handbook..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                  />
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            categoryFilter === cat 
                            ? 'bg-brand-600 text-white shadow-sm' 
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300'
                        }`}
                      >
                          {cat}
                      </button>
                  ))}
              </div>

              {/* List */}
              <div className="space-y-3">
                  {filteredGuides.map(guide => (
                      <div 
                        key={guide.id}
                        onClick={() => setSelectedGuide(guide)}
                        className={`p-4 rounded-xl border cursor-pointer transition hover:shadow-md ${
                            selectedGuide?.id === guide.id 
                            ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' 
                            : 'bg-white border-slate-200 hover:border-brand-300'
                        }`}
                      >
                          <div className="flex justify-between items-start mb-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                  guide.category === 'Inventory Management' ? 'bg-purple-100 text-purple-700' :
                                  guide.category === 'Policy' ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-700'
                              }`}>
                                  {guide.category}
                              </span>
                              <ChevronRight size={16} className="text-slate-400" />
                          </div>
                          <h3 className="font-bold text-slate-800">{guide.title}</h3>
                          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                              <Calendar size={12} /> Updated: {new Date(guide.lastUpdated).toLocaleDateString()}
                          </p>
                      </div>
                  ))}
                  {filteredGuides.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">
                          No guides found.
                      </div>
                  )}
              </div>
          </div>

          {/* RIGHT: Content Viewer */}
          <div className={`lg:col-span-2 ${selectedGuide ? 'block' : 'hidden lg:block'}`}>
              {selectedGuide ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
                      
                      {/* Mobile Back Button */}
                      <div className="lg:hidden p-4 border-b border-slate-100">
                          <button onClick={() => setSelectedGuide(null)} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                              <ArrowLeft size={16} /> Back to List
                          </button>
                      </div>

                      <div className="p-8">
                          <div className="mb-6 border-b border-slate-100 pb-6">
                              <div className="flex gap-3 mb-4">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <Tag size={12} /> {selectedGuide.category}
                                </span>
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <Calendar size={12} /> {new Date(selectedGuide.lastUpdated).toLocaleDateString()}
                                </span>
                              </div>
                              <h2 className="text-3xl font-bold text-slate-900">{selectedGuide.title}</h2>
                          </div>
                          
                          <div className="prose prose-slate max-w-none">
                              {/* Simple Markdown-like rendering */}
                              {selectedGuide.content.split('\n').map((line, idx) => {
                                  if (line.startsWith('### ')) return <h3 key={idx} className="text-xl font-bold text-slate-800 mt-6 mb-3">{line.replace('### ', '')}</h3>;
                                  if (line.startsWith('#### ')) return <h4 key={idx} className="text-lg font-bold text-slate-700 mt-4 mb-2">{line.replace('#### ', '')}</h4>;
                                  if (line.startsWith('**')) return <p key={idx} className="font-bold text-slate-800 mb-2">{line.replace(/\*\*/g, '')}</p>;
                                  if (line.startsWith('* ')) return <li key={idx} className="ml-4 list-disc text-slate-600 mb-1">{line.replace('* ', '')}</li>;
                                  if (line.startsWith('> ')) return <div key={idx} className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4 text-blue-800 italic rounded-r">{line.replace('> ', '')}</div>;
                                  if (line.match(/^\d\./)) return <div key={idx} className="ml-4 mb-2 font-medium text-slate-700">{line}</div>;
                                  return <p key={idx} className="text-slate-600 mb-4 leading-relaxed">{line}</p>;
                              })}
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 h-full flex flex-col items-center justify-center text-slate-400 p-8">
                      <Bookmark size={48} className="mb-4 opacity-50" />
                      <h3 className="text-lg font-bold text-slate-500">Select a guide to read</h3>
                      <p className="text-sm">Choose a topic from the list to view details.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
