import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageRole, Attachment, Event, Product, ProductGroup, ReplyData, Mention } from '../types';
import { fileToBase64, getMediaTypeFromMime } from '../utils/fileUtils';
import ChatMessage from './ChatMessage';
import { 
  SendIcon, PhotoIcon, VideoIcon, MicIcon, XMarkIcon, PlusIcon, 
  MapPinIcon, TrashIcon, ShoppingBagIcon, UserCircleIcon, MenuIcon, EditIcon
} from './Icons';
import { supabase } from '../services/supabaseClient';

declare var L: any;

const ChatInterface: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'events' | 'products' | 'my-events' | 'my-products'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<any>(null);
  const [userToken, setUserToken] = useState<string>('');
  
  // UI States
  const [isSending, setIsSending] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<'event' | 'product' | null>(null);
  
  // Form States
  const [formData, setFormData] = useState<any>({ 
    latitude: -23.5505, 
    longitude: -46.6333, 
    category: 'Comidas',
    date: new Date().toISOString().split('T')[0],
    time: '20:00'
  });
  const [editingItem, setEditingItem] = useState<any>(null);

  // Chat
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [inputText, setInputText] = useState('');
  const [chatAttachments, setChatAttachments] = useState<Attachment[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));

    let token = localStorage.getItem('tupa_user_token');
    if (!token) {
      token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('tupa_user_token', token);
    }
    setUserToken(token);

    fetchMessages();
    fetchEvents();
    fetchProducts();
  }, []);

  // Map Initialization
  useEffect(() => {
    if (isCreateModalOpen === 'event') {
      const timer = setTimeout(() => {
        const initialLat = formData.latitude || -23.5505;
        const initialLng = formData.longitude || -46.6333;

        if (mapRef.current) return;

        mapRef.current = L.map('map-create', { zoomControl: false }).setView([initialLat, initialLng], 15);

        const lightGray = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');

        lightGray.addTo(mapRef.current);

        const baseMaps = {
          "Cinza Claro": lightGray,
          "Satélite": satellite
        };

        L.control.layers(baseMaps, {}, { position: 'bottomright', collapsed: false }).addTo(mapRef.current);
        L.control.zoom({ position: 'topright' }).addTo(mapRef.current);

        markerRef.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapRef.current);
        
        markerRef.current.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          setFormData((prev: any) => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
        });

        if (!editingItem && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            if (mapRef.current) {
              mapRef.current.setView([latitude, longitude], 15);
              markerRef.current.setLatLng([latitude, longitude]);
              setFormData((prev: any) => ({ ...prev, latitude, longitude }));
            }
          });
        }
      }, 500);
      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }
  }, [isCreateModalOpen]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('start_time', { ascending: true });
    setEvents(data || []);
  };

  const fetchMessages = async (polling = false) => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) {
      const mapped = data.reverse().map((m: any) => ({
        ...m,
        senderName: m.sender_name || "Visitante",
        role: m.creator_token === userToken ? MessageRole.USER : MessageRole.OTHER,
        timestamp: new Date(m.created_at).getTime(),
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
      }));
      setMessages(mapped);
      if (!polling) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      const mimeType = file.type;
      const type = getMediaTypeFromMime(mimeType);
      newAttachments.push({
        mimeType,
        data: base64,
        type,
        previewUrl: `data:${mimeType};base64,${base64}`
      });
    }
    setChatAttachments([...chatAttachments, ...newAttachments]);
  };

  const handleFormFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, [field]: `data:${file.type};base64,${base64}` });
    }
  };

  const handleSubmitEvent = async () => {
    if (!formData.title || !formData.image_url || !formData.whatsapp_contact || !formData.date || !formData.time) {
      return alert("Preencha todos os campos obrigatórios (Título, Foto, WhatsApp, Dia e Hora)!");
    }
    setIsSending(true);
    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}:00`).toISOString();
      
      const payload: any = {
        title: formData.title,
        description: formData.description || "",
        image_url: formData.image_url,
        location_name: formData.location_name || "Local não informado",
        latitude: parseFloat(formData.latitude) || -23.5505,
        longitude: parseFloat(formData.longitude) || -46.6333,
        start_time: startDateTime,
        whatsapp_contact: formData.whatsapp_contact,
        has_tickets: !!formData.has_tickets,
        ticket_price: parseFloat(formData.ticket_price) || 0,
        creator_token: userToken,
      };

      if (session?.user?.id) payload.creator_id = session.user.id;

      // Usando a tabela 'events' (sempre verifique se a tabela existe no Supabase)
      const { error } = editingItem 
        ? await supabase.from('events').update(payload).eq('id', editingItem.id)
        : await supabase.from('events').insert([payload]);

      if (error) throw error;
      
      setIsCreateModalOpen(null);
      setEditingItem(null);
      setFormData({ 
        latitude: -23.5505, 
        longitude: -46.6333, 
        category: 'Comidas',
        date: new Date().toISOString().split('T')[0],
        time: '20:00'
      });
      fetchEvents();
      setActiveTab('events');
    } catch (e: any) { alert("Erro ao salvar evento: " + e.message); }
    finally { setIsSending(false); }
  };

  const handleSubmitProduct = async () => {
    if (!formData.name || !formData.price || !formData.image_url || !formData.whatsapp_contact) {
      return alert("Nome, Preço, Foto e WhatsApp são obrigatórios!");
    }
    setIsSending(true);
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || "",
        price: parseFloat(formData.price),
        image_url: formData.image_url,
        category: formData.category || 'Comidas',
        whatsapp_contact: formData.whatsapp_contact,
        creator_token: userToken,
      };

      if (session?.user?.id) payload.creator_id = session.user.id;

      const { error } = editingItem 
        ? await supabase.from('products').update(payload).eq('id', editingItem.id)
        : await supabase.from('products').insert([payload]);

      if (error) throw error;
      
      setIsCreateModalOpen(null);
      setEditingItem(null);
      setFormData({ latitude: -23.5505, longitude: -46.6333, category: 'Comidas' });
      fetchProducts();
      setActiveTab('products');
    } catch (e: any) { alert("Erro ao salvar item: " + e.message); }
    finally { setIsSending(false); }
  };

  const handleDelete = async (id: string, table: 'events' | 'products') => {
    if (!confirm("Deseja mesmo apagar este item?")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) table === 'events' ? fetchEvents() : fetchProducts();
    else alert("Erro ao apagar.");
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && chatAttachments.length === 0) return;
    setIsSending(true);
    const { error } = await supabase.from('messages').insert([{
      sender_name: session?.user?.email?.split('@')[0] || "Visitante",
      text: inputText,
      attachments: chatAttachments,
      creator_token: userToken,
      reply_to: replyingTo ? { messageId: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : null,
    }]);
    if (!error) {
      setInputText(''); setChatAttachments([]); setReplyingTo(null);
      fetchMessages();
    }
    setIsSending(false);
  };

  const myEvents = events.filter(e => e.creator_token === userToken || e.creator_id === session?.user?.id);
  const myProducts = products.filter(p => (p as any).creator_token === userToken || p.creator_id === session?.user?.id);

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative">
      <header className="flex-none glass-header p-6 pb-0 sticky top-0 z-[60] shadow-2xl flex flex-col items-center">
        <div className="corner-light light-left"></div>
        <div className="corner-light light-right"></div>
        <div className="w-full max-w-lg flex justify-between items-center relative mb-6 pt-2 z-10">
           <button onClick={() => setIsSideMenuOpen(true)} className="p-3 text-white bg-zinc-900/50 rounded-2xl border border-zinc-800 backdrop-blur-md">
             <MenuIcon className="w-7 h-7" />
           </button>
           <h1 className="text-4xl font-royal font-black blue-fire-text select-none py-1">TUPÃ</h1>
           <div className="w-12"></div> {/* Spacer */}
        </div>
        <div className="flex gap-1 bg-zinc-900/80 p-1.5 rounded-[22px] border border-zinc-800 w-full max-w-xs shadow-inner mb-4 z-10 backdrop-blur-md">
           {(['chat', 'events', 'products'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'tab-active' : 'text-zinc-500 hover:text-white'}`}>
               {tab === 'chat' ? 'Chat' : tab === 'events' ? 'Festas' : 'Market'}
             </button>
           ))}
        </div>
        <div className="animated-line w-full opacity-30"></div>
      </header>

      {/* MENU LATERAL */}
      {isSideMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl animate-fade-in" onClick={() => setIsSideMenuOpen(false)}>
           <div className="w-72 h-full bg-zinc-950 p-8 flex flex-col border-r border-zinc-800 animate-slide-up" onClick={e => e.stopPropagation()}>
              <h3 className="font-royal text-white text-xl font-black mb-10 border-b border-zinc-800 pb-4">GERENCIAR</h3>
              <div className="space-y-3 flex-1">
                 <button onClick={() => { setActiveTab('chat'); setIsSideMenuOpen(false); }} className="w-full text-left p-4 rounded-2xl bg-zinc-900 font-bold text-xs text-zinc-300 flex items-center gap-3">💬 Conversar</button>
                 <button onClick={() => { setActiveTab('my-events'); setIsSideMenuOpen(false); }} className="w-full text-left p-4 rounded-2xl bg-zinc-900 font-bold text-xs text-white flex items-center gap-3 border border-blue-500/30">🔥 Meus Eventos</button>
                 <button onClick={() => { setActiveTab('my-products'); setIsSideMenuOpen(false); }} className="w-full text-left p-4 rounded-2xl bg-zinc-900 font-bold text-xs text-white flex items-center gap-3 border border-cyan-500/30">🛵 Meus Produtos</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CRIAR/EDITAR */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-2xl flex flex-col p-6 overflow-y-auto animate-slide-up">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-white uppercase tracking-widest">{editingItem ? 'Editar' : 'Criar'} {isCreateModalOpen === 'event' ? 'Evento' : 'Produto'}</h2>
              <button onClick={() => {setIsCreateModalOpen(null); setEditingItem(null); setFormData({latitude:-23.5505, longitude:-46.6333, date: new Date().toISOString().split('T')[0], time: '20:00'});}} className="p-2 text-white bg-zinc-900 rounded-full"><XMarkIcon /></button>
           </div>
           
           <div className="space-y-5 max-w-md mx-auto w-full pb-10">
              <div className="relative aspect-video bg-zinc-900 rounded-3xl overflow-hidden border-2 border-dashed border-zinc-800 flex items-center justify-center group shadow-inner">
                 {formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center gap-2"><PhotoIcon className="w-12 h-12 text-zinc-700" /><span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Adicionar Foto</span></div>}
                 <input type="file" accept="image/*" onChange={e => handleFormFileChange(e, 'image_url')} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>

              <input value={formData.title || formData.name || ''} onChange={e => setFormData({...formData, [isCreateModalOpen==='event'?'title':'name']: e.target.value})} placeholder={isCreateModalOpen==='event'?'Nome da Festa':'Nome do Produto'} className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 text-white font-bold outline-none focus:border-blue-500 transition-colors" />
              
              {isCreateModalOpen === 'product' && (
                <div className="flex gap-3">
                   <input type="number" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Preço R$" className="flex-1 bg-zinc-900 p-5 rounded-2xl border border-zinc-800 text-white font-bold outline-none" />
                   <select value={formData.category || 'Comidas'} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-zinc-900 px-4 rounded-2xl border border-zinc-800 text-white font-bold outline-none">
                      <option>Comidas</option><option>Farmácia</option><option>Lojas</option>
                   </select>
                </div>
              )}

              {isCreateModalOpen === 'event' && (
                <div className="flex gap-3">
                   <div className="flex-1 flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-500 font-black uppercase px-2">Dia do Evento</span>
                      <input type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 text-white font-bold outline-none" />
                   </div>
                   <div className="flex-1 flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-500 font-black uppercase px-2">Horário</span>
                      <input type="time" value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 text-white font-bold outline-none" />
                   </div>
                </div>
              )}

              <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Mais detalhes (descrição)..." className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 text-white min-h-[80px] outline-none" />
              
              <div className="space-y-1">
                <span className="text-[10px] font-black text-zinc-500 uppercase px-2 tracking-widest">WhatsApp (DDD + Número)</span>
                <input value={formData.whatsapp_contact || ''} onChange={e => setFormData({...formData, whatsapp_contact: e.target.value})} placeholder="Ex: 11988887777" className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 text-white outline-none" />
              </div>

              {isCreateModalOpen === 'event' && (
                <div className="space-y-6">
                   <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 space-y-4">
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-black uppercase text-white tracking-widest">Vender Ingressos?</span>
                         <input type="checkbox" checked={!!formData.has_tickets} onChange={e => setFormData({...formData, has_tickets: e.target.checked})} className="w-6 h-6 accent-blue-600 rounded" />
                      </div>
                      {formData.has_tickets && (
                         <div className="animate-slide-up">
                            <input type="number" value={formData.ticket_price || ''} onChange={e => setFormData({...formData, ticket_price: e.target.value})} placeholder="Valor do Ingresso R$" className="w-full bg-zinc-900 p-4 rounded-xl border border-zinc-800 text-white font-bold outline-none" />
                         </div>
                      )}
                   </div>

                   <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase text-zinc-500 px-2 flex items-center gap-2 tracking-widest">📍 Localização (Arraste o pin)</span>
                      <div id="map-create" className="w-full h-72 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl relative bg-zinc-100"></div>
                      <input value={formData.location_name || ''} onChange={e => setFormData({...formData, location_name: e.target.value})} placeholder="Nome do local / endereço curto" className="w-full bg-zinc-900 p-5 rounded-2xl border border-zinc-800 text-white outline-none" />
                   </div>
                </div>
              )}

              <button onClick={isCreateModalOpen === 'event' ? handleSubmitEvent : handleSubmitProduct} disabled={isSending} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
                {isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Publicar Agora'}
              </button>
           </div>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-32">
        <div className="max-w-lg mx-auto p-4">
          
          {activeTab === 'chat' && (
            <div className="px-4 space-y-2 mt-4">
              {messages.map(m => <ChatMessage key={m.id} message={m} currentUserId={userToken} />)}
              <div ref={messagesEndRef} />
            </div>
          )}

          {activeTab === 'events' && (
             <div className="grid grid-cols-2 gap-4 animate-fade-in pt-4">
                <div onClick={() => setIsCreateModalOpen('event')} className="aspect-[3/4] bg-zinc-900/40 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-blue-500/50 transition-all cursor-pointer group">
                   <PlusIcon className="w-8 h-8 text-blue-500" />
                   <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Novo Evento</span>
                </div>
                {events.map(e => (
                   <div key={e.id} className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 flex flex-col shadow-lg h-full">
                      <div className="relative aspect-square">
                         <img src={e.image_url} className="w-full h-full object-cover" />
                         {e.has_tickets && <div className="absolute top-2 right-2 bg-blue-600 text-[7px] font-black px-2 py-1 rounded-md text-white uppercase shadow-lg">Tickets R${e.ticket_price}</div>}
                         <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[8px] font-black text-white">
                            {new Date(e.start_time).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})} - {new Date(e.start_time).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                         </div>
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                         <h4 className="text-[11px] font-black text-white truncate uppercase mb-1">{e.title}</h4>
                         <p className="text-[8px] text-zinc-500 truncate flex items-center gap-1 font-bold tracking-tighter"><MapPinIcon className="w-2 h-2" /> {e.location_name}</p>
                         <div className="mt-auto pt-3">
                            <button onClick={() => window.open(`https://wa.me/${e.whatsapp_contact?.replace(/\D/g, '')}?text=Oi! Vi seu evento no TUPÃ: ${e.title}`)} className="w-full py-2.5 bg-zinc-800 text-[8px] font-black uppercase text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                               {e.has_tickets ? 'Comprar Ingresso' : 'WhatsApp'}
                            </button>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          )}

          {activeTab === 'products' && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in pt-4">
               {products.map(p => (
                  <div key={p.id} className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 flex flex-col shadow-lg">
                     <div className="relative aspect-square overflow-hidden">
                        <img src={p.image_url} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5">
                           <span className="text-blue-400 font-black text-[9px]">R$ {p.price?.toFixed(2)}</span>
                        </div>
                     </div>
                     <div className="p-3 flex flex-col">
                        <h4 className="text-[10px] font-black text-white truncate uppercase mb-1">{p.name}</h4>
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{p.category}</span>
                        <button onClick={() => window.open(`https://wa.me/${p.whatsapp_contact?.replace(/\D/g, '')}?text=Quero comprar ${p.name}`)} className="mt-4 w-full py-3 bg-blue-600 text-[9px] font-black uppercase text-white rounded-xl flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
                           <ShoppingBagIcon className="w-4 h-4" /> Comprar
                        </button>
                     </div>
                  </div>
               ))}
            </div>
          )}

          {activeTab === 'my-events' && (
            <div className="space-y-4 animate-fade-in pt-4 px-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black text-white uppercase tracking-widest border-l-4 border-blue-600 pl-3">Suas Festas</h2>
                <button onClick={() => setIsCreateModalOpen('event')} className="bg-white text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">+ Criar</button>
              </div>
              {myEvents.length === 0 ? <p className="text-zinc-500 text-center py-20 font-black text-[9px] uppercase tracking-widest">Nenhuma festa criada ainda.</p> :
                myEvents.map(e => (
                  <div key={e.id} className="bg-zinc-900 p-4 rounded-3xl flex items-center gap-4 border border-zinc-800 shadow-2xl">
                    <img src={e.image_url} className="w-14 h-14 rounded-2xl object-cover shadow-lg border border-white/10" />
                    <div className="flex-1 overflow-hidden">
                       <h4 className="font-black text-white truncate text-xs uppercase">{e.title}</h4>
                       <p className="text-[8px] text-zinc-500 font-bold uppercase truncate">{e.location_name}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingItem(e); setFormData({...e, date: e.start_time.split('T')[0], time: e.start_time.split('T')[1].substring(0,5)}); setIsCreateModalOpen('event'); }} className="p-3 bg-zinc-800 text-blue-400 rounded-xl active:scale-90"><EditIcon className="w-4 h-4" /></button>
                       <button onClick={() => handleDelete(e.id, 'events')} className="p-3 bg-zinc-800 text-red-500 rounded-xl active:scale-90"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {activeTab === 'my-products' && (
            <div className="space-y-4 animate-fade-in pt-4 px-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-black text-white uppercase tracking-widest border-l-4 border-cyan-500 pl-3">Meus Itens</h2>
                <button onClick={() => setIsCreateModalOpen('product')} className="bg-white text-black px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">+ Novo Item</button>
              </div>
              {myProducts.length === 0 ? <p className="text-zinc-500 text-center py-20 font-black text-[9px] uppercase tracking-widest">Nenhum item cadastrado.</p> :
                myProducts.map(p => (
                  <div key={p.id} className="bg-zinc-900 p-4 rounded-3xl flex items-center gap-4 border border-zinc-800 shadow-2xl">
                    <img src={p.image_url} className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                    <div className="flex-1 overflow-hidden">
                       <h4 className="font-black text-white truncate text-xs uppercase">{p.name}</h4>
                       <p className="text-[9px] text-blue-400 font-black tracking-widest uppercase">R$ {p.price?.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingItem(p); setFormData(p); setIsCreateModalOpen('product'); }} className="p-3 bg-zinc-800 text-blue-400 rounded-xl active:scale-90"><EditIcon className="w-4 h-4" /></button>
                       <button onClick={() => handleDelete(p.id, 'products')} className="p-3 bg-zinc-800 text-red-500 rounded-xl active:scale-90"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </main>

      {/* INPUT DO CHAT COM MULTIMÍDIA */}
      {activeTab === 'chat' && (
        <div className="p-4 pb-8 glass-header border-t border-zinc-800 fixed bottom-0 left-0 right-0 z-50">
          <div className="max-w-lg mx-auto flex flex-col gap-2">
             {chatAttachments.length > 0 && (
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 {chatAttachments.map((a, i) => (
                   <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0">
                     {a.type === 'image' && <img src={a.previewUrl} className="w-full h-full object-cover" />}
                     {a.type !== 'image' && <div className="w-full h-full flex items-center justify-center text-zinc-500">
                       {a.type === 'video' ? <VideoIcon /> : <MicIcon />}
                     </div>}
                     <button onClick={() => setChatAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 p-1 bg-black/60 text-white"><XMarkIcon className="w-3 h-3" /></button>
                   </div>
                 ))}
               </div>
             )}
             <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-900/80 rounded-3xl border border-zinc-800 px-2">
                   <label className="p-2 cursor-pointer text-zinc-500 hover:text-white transition-colors">
                     <PhotoIcon className="w-5 h-5" />
                     <input type="file" multiple accept="image/*,video/*,audio/*" onChange={handleFileSelect} className="hidden" />
                   </label>
                </div>
                <div className="flex-1 bg-zinc-900/80 rounded-3xl border border-zinc-800 flex items-center px-4 py-1 shadow-inner backdrop-blur-md">
                   <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Mensagem..." className="flex-1 bg-transparent p-3 text-sm text-white outline-none font-bold" />
                   <button onClick={handleSendMessage} disabled={isSending} className="p-3 bg-white rounded-full text-black shadow-lg active:scale-90 transition-all">
                     {isSending ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <SendIcon className="w-5 h-5" />}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;