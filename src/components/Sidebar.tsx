import React from 'react';
import { LayoutElement, ElementType, VenueDimensions, WeddingLayout } from '../types';
import { Square, Circle, Layout, Users, Trash2, Plus, Wine, Utensils, Heart, Star, Columns, Armchair, Palette, Ruler, Save, Download, LogOut, LogIn, FileText, Loader2, Copy, ClipboardPaste, Triangle, Hexagon } from 'lucide-react';
import { User } from 'firebase/auth';

interface SidebarProps {
  onAddElement: (type: ElementType) => void;
  onAddTemplate: (name: string) => void;
  selectedElement: LayoutElement | null;
  onDelete: (id: string) => void;
  onUpdate: (id: string, attrs: Partial<LayoutElement>) => void;
  multiSelectedCount: number;
  onDeleteSelected: () => void;
  isRulerActive: boolean;
  onToggleRuler: () => void;
  venueDimensions: VenueDimensions;
  onUpdateVenue: (dims: VenueDimensions) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  savedLayouts: WeddingLayout[];
  onSave: (name: string) => void;
  onLoad: (layout: WeddingLayout) => void;
  onDeleteLayout: (id: string) => void;
  isSaving: boolean;
  onExportPDF: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onCopy: () => void;
  onPaste: () => void;
  hasClipboard: boolean;
  hasGroupedSelection: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onAddElement, 
  onAddTemplate, 
  selectedElement, 
  onDelete,
  onUpdate,
  multiSelectedCount,
  onDeleteSelected,
  isRulerActive,
  onToggleRuler,
  venueDimensions,
  onUpdateVenue,
  user,
  onLogin,
  onLogout,
  savedLayouts,
  onSave,
  onLoad,
  onDeleteLayout,
  isSaving,
  onExportPDF,
  onGroup,
  onUngroup,
  onCopy,
  onPaste,
  hasClipboard,
  hasGroupedSelection
}) => {
  const [layoutName, setLayoutName] = React.useState('My Wedding Layout');
  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full flex flex-col shadow-sm z-10">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-serif italic text-[#d4af37] mb-1">Wedding Planner</h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">Venue Layout Tool</p>
          </div>
          {user ? (
            <button 
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#d4af37] text-white rounded-full text-[10px] font-bold uppercase hover:bg-[#b8962e] transition-colors"
            >
              <LogIn className="w-3 h-3" /> Login
            </button>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <img src={user.photoURL || ''} alt="" className="w-6 h-6 rounded-full" />
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold truncate">{user.displayName}</p>
              <p className="text-[8px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Save & Export Section */}
        <section>
          <h2 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">Save & Export</h2>
          <div className="space-y-3">
            {user ? (
              <>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={layoutName}
                    onChange={(e) => setLayoutName(e.target.value)}
                    placeholder="Layout Name"
                    className="flex-1 p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#d4af37]"
                  />
                  <button 
                    onClick={() => onSave(layoutName)}
                    disabled={isSaving}
                    className="p-2 bg-[#d4af37] text-white rounded-lg hover:bg-[#b8962e] disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
                
                {savedLayouts.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {savedLayouts.map((layout) => (
                      <div key={layout.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group">
                        <button 
                          onClick={() => {
                            onLoad(layout);
                            setLayoutName(layout.name);
                          }}
                          className="flex-1 text-left overflow-hidden"
                        >
                          <p className="text-[10px] font-bold truncate">{layout.name}</p>
                          <p className="text-[8px] text-gray-400">
                            {layout.updatedAt?.toDate ? layout.updatedAt.toDate().toLocaleDateString() : 'Just now'}
                          </p>
                        </button>
                        <button 
                          onClick={() => onDeleteLayout(layout.id!)}
                          className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                <p className="text-[10px] text-orange-800 text-center leading-relaxed">
                  Login to save your layouts and access them from any device.
                </p>
              </div>
            )}

            <button 
              onClick={onExportPDF}
              className="w-full flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Download className="w-4 h-4 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-xs font-bold">Download as PDF</span>
            </button>
          </div>
        </section>
        {/* Venue Settings Section */}
        <section>
          <h2 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">Venue Settings</h2>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Width (m)</label>
                <input 
                  type="number" 
                  value={venueDimensions.width} 
                  onChange={(e) => onUpdateVenue({ ...venueDimensions, width: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#d4af37]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Height (m)</label>
                <input 
                  type="number" 
                  value={venueDimensions.height} 
                  onChange={(e) => onUpdateVenue({ ...venueDimensions, height: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>
            <p className="text-[9px] text-gray-400 italic">Adjust the total area of your wedding venue.</p>
          </div>
        </section>

        {/* Furniture Section */}
        <section>
          <h2 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">Furniture & Tables</h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onAddElement('round-table')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Circle className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Round Table</span>
            </button>
            <button 
              onClick={() => onAddElement('long-table')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Square className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Long Table</span>
            </button>
            <button 
              onClick={() => onAddElement('chair')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Armchair className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Single Chair</span>
            </button>
            <button 
              onClick={() => onAddElement('vip-table')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Star className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Bridal Table</span>
            </button>
            <button 
              onClick={() => onAddElement('cake-table')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Circle className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37] fill-yellow-50" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Cake Table</span>
            </button>
          </div>
        </section>

        {/* Ceremony Section */}
        <section>
          <h2 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">Ceremony & Decor</h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onAddElement('stage')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Layout className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Stage</span>
            </button>
            <button 
              onClick={() => onAddElement('arch')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Heart className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Wedding Arch</span>
            </button>
            <button 
              onClick={() => onAddElement('aisle')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Columns className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Aisle Runner</span>
            </button>
            <button 
              onClick={() => onAddElement('centerpiece')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Plus className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Centerpiece</span>
            </button>
          </div>
        </section>

        {/* Service Section */}
        <section>
          <h2 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">Service & Fun</h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onAddElement('buffet')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Utensils className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Buffet</span>
            </button>
            <button 
              onClick={() => onAddElement('bar')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Wine className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37]" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Bar</span>
            </button>
            <button 
              onClick={() => onAddElement('dance-floor')}
              className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group"
            >
              <Square className="w-6 h-6 mb-2 text-gray-400 group-hover:text-[#d4af37] fill-gray-50" />
              <span className="text-[10px] font-medium uppercase tracking-tighter">Dance Floor</span>
            </button>
          </div>
        </section>

        {/* Tools Section */}
        <section>
          <h2 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">Tools</h2>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={onToggleRuler}
              className={`flex items-center p-3 border rounded-xl transition-all group ${isRulerActive ? 'bg-[#d4af37] border-[#d4af37] text-white' : 'border-gray-100 hover:border-[#d4af37] hover:bg-orange-50 text-gray-600'}`}
            >
              <Ruler className={`w-5 h-5 mr-3 ${isRulerActive ? 'text-white' : 'text-gray-400 group-hover:text-[#d4af37]'}`} />
              <div>
                <span className="block text-xs font-bold">Measurement Ruler</span>
                <span className={`block text-[10px] ${isRulerActive ? 'text-white/80' : 'text-gray-400'}`}>Click and drag to measure distance</span>
              </div>
            </button>
          </div>
        </section>

        {/* Custom Shapes Section */}
        <section>
          <h2 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">Custom Shapes</h2>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onAddElement('custom-rect')} className="flex items-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:border-[#d4af37] hover:shadow-md transition-all group">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-[#fdf8e6]">
                <Square className="w-4 h-4 text-gray-400 group-hover:text-[#d4af37]" />
              </div>
              <span className="text-xs font-medium text-gray-600">Rectangle</span>
            </button>
            <button onClick={() => onAddElement('custom-triangle')} className="flex items-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:border-[#d4af37] hover:shadow-md transition-all group">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-[#fdf8e6]">
                <Triangle className="w-4 h-4 text-gray-400 group-hover:text-[#d4af37]" />
              </div>
              <span className="text-xs font-medium text-gray-600">Triangle</span>
            </button>
            <button onClick={() => onAddElement('custom-hexagon')} className="flex items-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:border-[#d4af37] hover:shadow-md transition-all group">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-[#fdf8e6]">
                <Hexagon className="w-4 h-4 text-gray-400 group-hover:text-[#d4af37]" />
              </div>
              <span className="text-xs font-medium text-gray-600">Hexagon</span>
            </button>
          </div>
        </section>

        {/* Templates Section */}
        <section>
          <h2 className="text-xs font-mono text-gray-400 uppercase tracking-wider mb-4">Templates</h2>
          <div className="space-y-3">
            <button 
              onClick={() => onAddTemplate('theater')}
              className="w-full flex items-center p-3 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group text-left"
            >
              <Users className="w-5 h-5 mr-3 text-gray-400 group-hover:text-[#d4af37]" />
              <div>
                <span className="block text-xs font-bold">Theater Setup</span>
                <span className="block text-[10px] text-gray-400">Rows of chairs for ceremony</span>
              </div>
            </button>
            <button 
              onClick={() => onAddTemplate('banquet')}
              className="w-full flex items-center p-3 border border-gray-100 rounded-xl hover:border-[#d4af37] hover:bg-orange-50 transition-all group text-left"
            >
              <Circle className="w-5 h-5 mr-3 text-gray-400 group-hover:text-[#d4af37]" />
              <div>
                <span className="block text-xs font-bold">Banquet Setup</span>
                <span className="block text-[10px] text-gray-400">Grid of round tables</span>
              </div>
            </button>
          </div>
        </section>

        {/* Properties Section */}
        { (multiSelectedCount > 0 || hasClipboard) && (
          <section className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Selection ({multiSelectedCount})</h2>
              <div className="flex gap-2 flex-wrap">
                {multiSelectedCount > 0 && (
                  <button 
                    onClick={onCopy}
                    className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                    title="Copy Selection (Ctrl+C)"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                )}
                {hasClipboard && (
                  <button 
                    onClick={onPaste}
                    className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                    title="Paste Selection (Ctrl+V)"
                  >
                    <ClipboardPaste className="w-3 h-3" /> Paste
                  </button>
                )}
                {multiSelectedCount > 1 && !hasGroupedSelection && (
                  <button 
                    onClick={onGroup}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                    title="Group Elements"
                  >
                    <Plus className="w-3 h-3" /> Group
                  </button>
                )}
                {hasGroupedSelection && (
                  <button 
                    onClick={onUngroup}
                    className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                    title="Ungroup Elements"
                  >
                    <Trash2 className="w-3 h-3" /> Ungroup
                  </button>
                )}
                {multiSelectedCount > 0 && (
                  <button 
                    onClick={onDeleteSelected}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                    title="Delete Selection"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
            
            {multiSelectedCount > 1 && (
              <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                  Multiple elements selected. Drag any selected element to move the entire group.
                  {hasGroupedSelection ? ' These elements are currently grouped.' : ' You can group them to move them together in the future.'}
                </p>
              </div>
            )}
          </section>
        )}

        {selectedElement && multiSelectedCount === 1 && (
          <section className="pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Properties</h2>
              <button 
                onClick={() => onDelete(selectedElement.id)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Label</label>
                <input 
                  type="text" 
                  value={selectedElement.label || ''} 
                  onChange={(e) => onUpdate(selectedElement.id, { label: e.target.value })}
                  className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Rotation (deg)</label>
                <input 
                  type="number" 
                  value={selectedElement.rotation} 
                  onChange={(e) => onUpdate(selectedElement.id, { rotation: parseFloat(e.target.value) })}
                  className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              {(selectedElement.type === 'round-table' || selectedElement.type === 'cake-table' || selectedElement.type === 'custom-triangle' || selectedElement.type === 'custom-hexagon') && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                    {selectedElement.type === 'custom-triangle' || selectedElement.type === 'custom-hexagon' ? 'Size (Radius m)' : 'Diameter (m)'}
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={selectedElement.type === 'custom-triangle' || selectedElement.type === 'custom-hexagon' ? selectedElement.radius : (selectedElement.radius || 0) * 2} 
                    onChange={(e) => onUpdate(selectedElement.id, { radius: selectedElement.type === 'custom-triangle' || selectedElement.type === 'custom-hexagon' ? parseFloat(e.target.value) : parseFloat(e.target.value) / 2 })}
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              )}

              {(selectedElement.type === 'long-table' || 
                selectedElement.type === 'stage' || 
                selectedElement.type === 'dance-floor' || 
                selectedElement.type === 'aisle' || 
                selectedElement.type === 'arch' || 
                selectedElement.type === 'buffet' || 
                selectedElement.type === 'bar' || 
                selectedElement.type === 'vip-table' ||
                selectedElement.type === 'centerpiece' ||
                selectedElement.type === 'custom-rect' ||
                selectedElement.type === 'chair') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Width (m)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={selectedElement.width} 
                      onChange={(e) => onUpdate(selectedElement.id, { width: parseFloat(e.target.value) })}
                      className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Height (m)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={selectedElement.height} 
                      onChange={(e) => onUpdate(selectedElement.id, { height: parseFloat(e.target.value) })}
                      className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>
              )}

              {(selectedElement.type === 'round-table' || selectedElement.type === 'long-table' || selectedElement.type === 'vip-table') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Chair Count</label>
                    <input 
                      type="number" 
                      value={selectedElement.chairCount || 0} 
                      onChange={(e) => onUpdate(selectedElement.id, { chairCount: parseInt(e.target.value) })}
                      className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                  
                  {selectedElement.chairCount && selectedElement.chairCount > 0 && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-2 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Seating List (Guest Names)
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {Array.from({ length: selectedElement.chairCount }).map((_, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-gray-400 w-4">{i + 1}</span>
                            <input 
                              type="text" 
                              placeholder={`Guest Name ${i + 1}`}
                              value={selectedElement.chairLabels?.[i] || ''} 
                              onChange={(e) => {
                                const newLabels = [...(selectedElement.chairLabels || [])];
                                newLabels[i] = e.target.value;
                                onUpdate(selectedElement.id, { chairLabels: newLabels });
                              }}
                              className="flex-1 p-1.5 text-[10px] border border-gray-200 rounded-md focus:outline-none focus:border-[#d4af37] bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Color
                </label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {['#ffffff', '#f3f4f6', '#fee2e2', '#fef3c7', '#ecfdf5', '#eff6ff', '#faf5ff'].map(color => (
                    <button
                      key={color}
                      onClick={() => onUpdate(selectedElement.id, { color })}
                      className={`w-6 h-6 rounded-full border ${selectedElement.color === color ? 'border-[#d4af37] ring-1 ring-[#d4af37]' : 'border-gray-200'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={selectedElement.color || '#ffffff'} 
                    onChange={(e) => onUpdate(selectedElement.id, { color: e.target.value })}
                    className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
      
      <div className="p-6 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center text-[10px] text-gray-400 font-mono">
          <div className="w-2 h-2 bg-[#d4af37] rounded-full mr-2"></div>
          1 Grid Square = 1 Meter
        </div>
      </div>
    </div>
  );
};
