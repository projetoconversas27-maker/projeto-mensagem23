import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, MessageRole, Attachment, Event, GeoLocation, Establishment, Product, CartItem, FeedItem, UserProfile } from '../types';
import { fileToBase64, blobToBase64, getMediaTypeFromMime } from '../utils/fileUtils';
import ChatMessage from './ChatMessage';
import { SendIcon, PhotoIcon, VideoIcon, MicIcon, XMarkIcon, MapPinIcon, PlusIcon, HeartIcon, ChatBubbleIcon, InfoIcon, StarIcon, FoodIcon, StoreIcon, SearchIcon, ShoppingBagIcon, BanIcon, UserCircleIcon, EnvelopeIcon, LockIcon, TrashIcon } from './Icons';

declare global {
  interface Window {
    L: any;
  }
}

const ChatInterface: React.FC = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth Form State
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authConfirmPass, setAuthConfirmPass] = useState('');
  const [authPhoto, setAuthPhoto] = useState<string | null>(null);

  // --- Global App State ---
  const [activeTab, setActiveTab] = useState<'chat' | 'events' | 'food'>('chat');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Chat States ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: MessageRole.OTHER,
      senderName: 'OmniBot',
      senderId: 'omnibot',
      text: 'Olá! Bem-vindo ao TUPÃ Chat.',
      timestamp: Date.now(),
    },
    {
        id: '2',
        role: MessageRole.OTHER,
        senderName: 'Usuário Chato',
        senderId: 'user_chato',
        text: 'Spam spam spam...',
        timestamp: Date.now() + 1000,
    }
  ]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // --- Data State (Events & Establishments) ---
  const [events, setEvents] = useState<Event[]>([
    {
      id: 'evt1',
      type: 'event',
      title: 'Luau na Praia',
      description: 'Música ao vivo e fogueira.',
      locationName: 'Praia Central',
      time: '20:00',
      image: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?auto=format&fit=crop&q=80&w=600&h=400',
      creatorName: 'Ana',
      creatorId: 'ana_123',
      likes: 3,
      likedByMe: false,
      comments: []
    }
  ]);

  const [establishments, setEstablishments] = useState<Establishment[]>([
    {
        id: 'est1',
        type: 'establishment',
        name: 'Burger Kingo',
        description: 'Os melhores hambúrgueres artesanais.',
        image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&q=80&w=600&h=400',
        whatsappContact: '5511999999999',
        creatorName: 'Carlos Burger',
        creatorId: 'carlos_123',
        hasCatalog: true,
        products: [
            { id: 'p1', name: 'X-Tudo', price: 25.00 },
            { id: 'p2', name: 'Coca Cola', price: 6.00 },
            { id: 'p3', name: 'Batata Frita', price: 12.00 },
            { id: 'p4', name: 'Molho Especial' } 
        ],
        likes: 15,
        likedByMe: false
    },
    {
        id: 'est2',
        type: 'establishment',
        name: 'Pizza da Tia',
        description: 'Pizzas caseiras deliciosas.',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600&h=400',
        whatsappContact: '5511888888888',
        creatorName: 'Tia Maria',
        creatorId: 'tia_123',
        hasCatalog: false, 
        products: [],
        likes: 42,
        likedByMe: true
    }
  ]);

  // --- Favorites & Cart ---
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [locationName, setLocationName] = useState("Localizando...");
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);
  
  // --- Create Item States (Event or Store) ---
  const [isCreating, setIsCreating] = useState(false);
  const [createType, setCreateType] = useState<'event' | 'establishment'>('event');
  
  // Common Form Fields
  const [formTitle, setFormTitle] = useState(''); // Title or Name
  const [formDesc, setFormDesc] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formWhatsapp, setFormWhatsapp] = useState('');
  
  // Store Specific (Creation & Profile Management)
  const [storeHasCatalog, setStoreHasCatalog] = useState(false);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [tempProdName, setTempProdName] = useState('');
  const [tempProdPrice, setTempProdPrice] = useState('');

  // --- Profile Product Management ---
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // --- Map States ---
  const [showMapModal, setShowMapModal] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<GeoLocation | null>(null);
  const [pinnedAddress, setPinnedAddress] = useState<string>("");
  const [mapType, setMapType] = useState<'light' | 'satellite'>('light');

  // --- Details Modal State ---
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({});

  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const authImageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Effects ---
  useEffect(() => {
    if (activeTab === 'chat') scrollToBottom();
  }, [messages, activeTab]);

  useEffect(() => {
    const storedUser = localStorage.getItem('tupa_user_active');
    if (storedUser) {
        try { setCurrentUser(JSON.parse(storedUser)); } catch(e) {}
    }
    const storedFavs = localStorage.getItem('tupa_favorites');
    if (storedFavs) {
      try { setFavoriteIds(JSON.parse(storedFavs)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`);
            const data = await response.json();
            setLocationName(`${data.city || data.locality || 'Minha Cidade'}`);
          } catch (e) { setLocationName("Sua Cidade"); }
        },
        (error) => setLocationName("Localização Indisponível")
      );
    }
  }, []);

  // --- Auth Handlers ---
  const handleAuthImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        try {
           const b64 = await fileToBase64(e.target.files[0]);
           setAuthPhoto(`data:${e.target.files[0].type};base64,${b64}`);
        } catch(err){}
    }
  }

  const handleRegister = () => {
    if (!authName || !authEmail || !authPass || !authConfirmPass || !authPhoto) {
        alert("Por favor, preencha todos os campos e adicione uma foto.");
        return;
    }
    if (authPass !== authConfirmPass) {
        alert("As senhas não coincidem!");
        return;
    }
    if (!authEmail.includes('@') || !authEmail.includes('gmail')) {
        alert("Por favor, use um Gmail válido.");
        return;
    }

    const newUser: UserProfile = {
        id: Date.now().toString(),
        name: authName,
        email: authEmail,
        avatar: authPhoto
    };

    localStorage.setItem('tupa_user_active', JSON.stringify(newUser));
    localStorage.setItem(`user_${authEmail}`, JSON.stringify({...newUser, pass: authPass}));
    
    setCurrentUser(newUser);
    setShowAuthModal(false);
  };

  const handleLogin = () => {
      if (!authEmail || !authPass) return;
      
      const stored = localStorage.getItem(`user_${authEmail}`);
      if (stored) {
          const userObj = JSON.parse(stored);
          if (userObj.pass === authPass) {
              const { pass, ...profile } = userObj;
              setCurrentUser(profile);
              localStorage.setItem('tupa_user_active', JSON.stringify(profile));
              setShowAuthModal(false);
          } else {
              alert("Senha incorreta.");
          }
      } else {
          alert("Usuário não encontrado. Faça cadastro.");
      }
  }

  const handleLogout = () => {
      if(confirm("Deseja sair da sua conta?")) {
          localStorage.removeItem('tupa_user_active');
          setCurrentUser(null);
          setShowProfileModal(false);
      }
  }

  // --- Blocking Logic ---
  const handleBlockUser = (userId: string) => {
      if(confirm("Bloquear mensagens deste usuário?")) {
          setBlockedUsers(prev => [...prev, userId]);
      }
  }

  // --- Cart Logic ---
  const addToCart = (product: Product, establishmentId: string) => {
      if (!product.price) return;
      setCart(prev => {
          if(prev.length > 0 && prev[0].establishmentId !== establishmentId) {
             if(!confirm("Seu carrinho tem itens de outra loja. Deseja limpar e adicionar este?")) return prev;
             return [{ productId: product.id, productName: product.name, price: product.price!, quantity: 1, establishmentId }];
          }
          const existing = prev.find(item => item.productId === product.id);
          if (existing) return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
          return [...prev, { productId: product.id, productName: product.name, price: product.price!, quantity: 1, establishmentId }];
      });
  };

  const removeFromCart = (productId: string) => {
      setCart(prev => prev.filter(p => p.productId !== productId));
  }

  const handleCheckout = (establishment: Establishment) => {
      if(cart.length === 0) return;
      let message = `*Novo Pedido via TUPÃ Food*\n\n`;
      message += `Cliente: ${currentUser?.name || 'Visitante'}\n`;
      message += `Loja: ${establishment.name}\n---------------------------\n`;
      let total = 0;
      cart.forEach(item => {
          const subtotal = item.price * item.quantity;
          total += subtotal;
          message += `${item.quantity}x ${item.productName} (R$ ${item.price.toFixed(2)})\n`;
      });
      message += `---------------------------\n*Total: R$ ${total.toFixed(2)}*\n\nAguardo confirmação!`;
      const url = `https://wa.me/${establishment.whatsappContact}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      setCart([]);
  };

  // --- Profile Product Management Logic ---
  const handleAddProductFromProfile = (estId: string) => {
      if(!tempProdName || !tempProdPrice) return;
      
      const newProduct: Product = { 
          id: Date.now().toString(), 
          name: tempProdName, 
          price: parseFloat(tempProdPrice) 
      };

      setEstablishments(prev => prev.map(est => {
          if (est.id === estId) {
              return { ...est, products: [...est.products, newProduct] };
          }
          return est;
      }));

      setTempProdName('');
      setTempProdPrice('');
      setIsAddingProduct(false);
  };

  const handleDeleteProduct = (estId: string, prodId: string) => {
      if(!confirm("Excluir este produto?")) return;
      setEstablishments(prev => prev.map(est => {
          if (est.id === estId) {
              return { ...est, products: est.products.filter(p => p.id !== prodId) };
          }
          return est;
      }));
  }

  // --- Creation Logic ---
  const handleAddProduct = () => {
      if(!tempProdName || !tempProdPrice) return;
      setNewProducts(prev => [...prev, { id: Date.now().toString(), name: tempProdName, price: parseFloat(tempProdPrice) }]);
      setTempProdName('');
      setTempProdPrice('');
  };

  const handleCreateButton = () => {
      if (!currentUser) {
          alert("Você precisa se cadastrar ou entrar para criar Eventos ou Empresas!");
          setShowAuthModal(true);
          return;
      }
      setIsCreating(true);
      resetForm();
  };

  const handleCreateSubmit = () => {
      if (!formTitle || !formImage) { alert("Nome e Imagem são obrigatórios!"); return; }
      if (createType === 'event') {
          const evt: Event = {
              id: Date.now().toString(), type: 'event',
              title: formTitle, description: formDesc, locationName: formLocation || 'Local Definido',
              time: formTime || 'Agora', image: formImage, creatorName: currentUser?.name || 'Anônimo', creatorId: currentUser?.id, likes: 0, comments: [],
              whatsappContact: formWhatsapp.replace(/\D/g, '') || undefined
          };
          setEvents(p => [evt, ...p]);
      } else {
          if(!formWhatsapp) { alert("Empresas precisam de WhatsApp!"); return; }
          const est: Establishment = {
              id: Date.now().toString(), type: 'establishment',
              name: formTitle, description: formDesc, image: formImage,
              whatsappContact: formWhatsapp.replace(/\D/g, ''),
              creatorName: currentUser?.name || 'Anônimo', creatorId: currentUser?.id, likes: 0,
              hasCatalog: storeHasCatalog,
              products: newProducts 
          };
          setEstablishments(p => [est, ...p]);
      }
      setIsCreating(false);
      resetForm();
  };

  const resetForm = () => {
      setFormTitle(''); setFormDesc(''); setFormLocation(''); setFormTime(''); setFormImage(null); setFormWhatsapp('');
      setStoreHasCatalog(false); setNewProducts([]); setTempProdName(''); setTempProdPrice('');
  };

  // --- Filtered Data ---
  const getFilteredEvents = () => {
      let data = events;
      if (searchQuery) data = data.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      return data;
  };

  const getFilteredEstablishments = () => {
      let data = establishments;
      if (searchQuery) data = data.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      return data;
  };

  // --- Render Helpers ---
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          try {
             const b64 = await fileToBase64(e.target.files[0]);
             setFormImage(`data:${e.target.files[0].type};base64,${b64}`);
          } catch(err){}
      }
  }

  // --- Chat ---
  const handleSendMessage = () => {
      if ((!inputText.trim() && attachments.length === 0)) return;
      const msg: Message = { id: Date.now().toString(), role: MessageRole.USER, senderId: currentUser?.id, senderName: currentUser?.name || 'Visitante', avatar: currentUser?.avatar, text: inputText, attachments: [...attachments], timestamp: Date.now() };
      setMessages(p => [...p, msg]);
      setInputText(''); setAttachments([]);
  };

  const visibleMessages = messages.filter(m => !m.senderId || !blockedUsers.includes(m.senderId));

  // --- Profile Helpers ---
  const myEstablishments = establishments.filter(e => e.creatorId === currentUser?.id);

  // --------------------------------------------------------------------------
  // MAIN APP VIEW
  // --------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-hidden relative font-sans">
      
      {/* --- HEADER --- */}
      <header className="flex-none bg-gray-800/80 backdrop-blur-md border-b border-gray-700/50 p-3 shadow-lg z-20 flex justify-between items-center sticky top-0">
        <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 tracking-tight">
            TUPÃ chat
        </h1>
        <div className="flex gap-2 items-center">
            <button 
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-full transition-colors ${showSearch ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
                <SearchIcon />
            </button>
            <button 
                onClick={handleCreateButton}
                className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform shadow-[0_0_10px_rgba(37,99,235,0.4)]"
            >
                <PlusIcon />
                <span className="hidden sm:inline">Criar</span>
            </button>
            <button 
                onClick={() => currentUser ? setShowProfileModal(true) : setShowAuthModal(true)}
                className="w-9 h-9 rounded-full border-2 border-gray-600 overflow-hidden ml-1 flex items-center justify-center bg-gray-800 hover:border-gray-400 transition-colors" 
                title={currentUser ? `Perfil de ${currentUser.name}` : 'Entrar'}
            >
                {currentUser ? (
                     <img src={currentUser.avatar} className="w-full h-full object-cover" />
                ) : (
                     <UserCircleIcon />
                )}
            </button>
        </div>
      </header>

      {/* --- SEARCH BAR (Collapsible) --- */}
      {showSearch && (
          <div className="bg-gray-800 border-b border-gray-700 p-3 animate-in slide-in-from-top-5">
              <input 
                  type="text" 
                  placeholder="Pesquisar Eventos ou Comidas..." 
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
          </div>
      )}

      {/* --- PROFESSIONAL NAVIGATION TABS --- */}
      <div className="flex-none pt-3 pb-2 bg-gray-900 px-4 z-10">
         <div className="flex bg-gray-800/50 p-1.5 rounded-2xl border border-gray-700/50 backdrop-blur-md relative shadow-lg">
             <button 
                onClick={() => setActiveTab('chat')} 
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    activeTab === 'chat' 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-[1.02]' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
            >
                💬 Conversas
             </button>
             <button 
                onClick={() => setActiveTab('events')} 
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    activeTab === 'events' 
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] scale-[1.02]' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
            >
                📅 Eventos
             </button>
             <button 
                onClick={() => setActiveTab('food')} 
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    activeTab === 'food' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] scale-[1.02]' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
            >
                🍔 Tupã Food
             </button>
         </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto scrollbar-hide bg-gray-900 relative">
        
        {/* TAB: CHAT */}
        {activeTab === 'chat' && (
            <div className="flex flex-col min-h-full">
                
                {/* --- FEATURED EVENTS CAROUSEL (HIGHLIGHTS) --- */}
                <div className="mt-2 mb-1">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-5 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse box-shadow-[0_0_10px_orange]"/> 
                        Em Alta 🔥
                    </h3>
                    <div className="flex overflow-x-auto px-4 gap-3 scrollbar-hide pb-4">
                        {events.slice(0, 10).map(evt => (
                            <div 
                                key={evt.id} 
                                onClick={() => setSelectedItem(evt)} 
                                className="min-w-[140px] w-[140px] h-[200px] rounded-2xl overflow-hidden relative shadow-lg border border-gray-700/50 shrink-0 cursor-pointer transform transition-all hover:scale-105 group"
                            >
                                 <img src={evt.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"/>
                                 
                                 <div className="absolute top-2 right-2 bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                    HOJE
                                 </div>

                                 <div className="absolute bottom-3 left-3 right-3">
                                     <p className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow-md mb-0.5">{evt.title}</p>
                                     <div className="flex items-center gap-1 text-[10px] text-gray-300">
                                         <div className="w-1.5 h-1.5 bg-green-500 rounded-full"/>
                                         {evt.time}
                                     </div>
                                 </div>
                            </div>
                        ))}
                         {events.length === 0 && (
                            <div className="w-full text-center text-gray-500 text-xs py-8 border-2 border-dashed border-gray-700 rounded-2xl">
                                Sem eventos em alta.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 px-4 space-y-4 pb-24 border-t border-gray-800 pt-4">
                    {visibleMessages.map((msg) => (
                        <div key={msg.id} className="group relative">
                            <ChatMessage message={msg} />
                            {msg.role === MessageRole.OTHER && msg.senderId && (
                                <button 
                                    onClick={() => handleBlockUser(msg.senderId!)}
                                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 bg-gray-800 rounded text-gray-500 hover:text-red-500 transition-opacity"
                                    title="Bloquear Usuário"
                                >
                                    <BanIcon />
                                </button>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        )}

        {/* TAB: EVENTS (LIST VIEW) */}
        {activeTab === 'events' && (
             <div className="p-4 space-y-6 pb-24">
                <div className="flex justify-between items-end mb-2 px-2">
                    <h2 className="text-2xl font-bold text-white">Próximos Eventos</h2>
                    <span className="text-xs text-gray-400">{getFilteredEvents().length} encontrados</span>
                </div>
                {getFilteredEvents().map(evt => (
                    <div key={evt.id} className="bg-gray-800 rounded-3xl border border-gray-700 overflow-hidden shadow-xl hover:shadow-2xl transition-shadow cursor-pointer group" onClick={() => setSelectedItem(evt)}>
                        <div className="h-48 w-full relative overflow-hidden">
                            <img src={evt.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/>
                            <div className="absolute bottom-4 left-4">
                                <h3 className="text-white font-bold text-xl drop-shadow-lg">{evt.title}</h3>
                                <div className="flex items-center gap-2 text-gray-200 text-xs mt-1">
                                    <span className="bg-white/20 backdrop-blur px-2 py-0.5 rounded text-white flex items-center gap-1"><MapPinIcon /> {evt.locationName}</span>
                                    <span className="bg-orange-600/80 backdrop-blur px-2 py-0.5 rounded text-white">{evt.time}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-800">
                             <p className="text-gray-400 text-sm line-clamp-2">{evt.description}</p>
                             {evt.whatsappContact && (
                                 <div className="mt-3 flex items-center gap-2 text-xs font-bold text-green-400 uppercase tracking-wide">
                                     <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/> Ingressos Disponíveis
                                 </div>
                             )}
                        </div>
                    </div>
                ))}
             </div>
        )}

        {/* TAB: FOOD (TUPÃ FOOD) */}
        {activeTab === 'food' && (
            <div className="p-4 space-y-4 pb-24">
                <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-800 rounded-2xl p-6 text-center mb-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <h3 className="text-green-400 font-extrabold text-lg tracking-tight mb-1">TUPÃ FOOD 🍔</h3>
                        <p className="text-gray-300 text-sm">Os melhores sabores da cidade em um só lugar.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-5">
                    {getFilteredEstablishments().map(est => (
                        <div key={est.id} className="bg-gray-800 rounded-3xl border border-gray-700 overflow-hidden shadow-lg flex flex-col cursor-pointer group hover:border-gray-600 transition-colors" onClick={() => setSelectedItem(est)}>
                            <div className="h-52 w-full relative overflow-hidden">
                                <img src={est.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent"></div>
                                <div className="absolute bottom-4 left-4 right-16">
                                    <h3 className="text-white font-bold text-2xl leading-none mb-1">{est.name}</h3>
                                    <p className="text-gray-300 text-xs line-clamp-1">{est.description}</p>
                                </div>
                                <div className="absolute top-3 right-3 bg-gray-900/60 backdrop-blur p-2 rounded-full text-white border border-white/10 shadow-lg">
                                    {est.hasCatalog ? <StoreIcon /> : <PhotoIcon />}
                                </div>
                            </div>
                            <div className="p-3 bg-gray-800 flex justify-between items-center border-t border-gray-700">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2">{est.hasCatalog ? 'Cardápio Digital' : 'Vitrine'}</span>
                                <button className="text-xs bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold transition-colors shadow-lg shadow-green-900/50">
                                    Ver Loja
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </main>

      {/* --- GLOBAL INPUT AREA (Chat Only) --- */}
      {activeTab === 'chat' && (
          <div className="flex-none bg-gray-800 border-t border-gray-700 p-3 z-30">
             {attachments.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    {attachments.map((att, i) => (
                        <div key={i} className="relative h-16 w-16 bg-gray-700 rounded-md overflow-hidden shrink-0 border border-gray-600">
                             <img src={att.previewUrl || ''} className="h-full w-full object-cover" />
                            <button onClick={() => setAttachments(p => p.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl-md"><XMarkIcon /></button>
                        </div>
                    ))}
                </div>
             )}
             <div className="max-w-4xl mx-auto flex items-end gap-2">
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                     if(e.target.files?.[0]) fileToBase64(e.target.files[0]).then(b64 => setAttachments(p => [...p, {mimeType: e.target.files![0].type, data: b64, type: 'image', previewUrl: URL.createObjectURL(e.target.files![0])}]))
                }} accept="image/*" />
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"><PhotoIcon /></button>
                <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-700 focus-within:border-blue-500 transition-colors">
                    <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Digite sua mensagem..." className="w-full bg-transparent text-white p-3 max-h-32 focus:outline-none resize-none placeholder-gray-500" rows={1} />
                </div>
                <button onClick={handleSendMessage} className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg active:scale-95 transition-all"><SendIcon /></button>
             </div>
          </div>
      )}

      {/* --- MODAL: AUTHENTICATION --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XMarkIcon /></button>
                
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-1">Bem-vindo ao TUPÃ</h2>
                    <p className="text-gray-400 text-xs">Crie eventos e divulgue sua empresa.</p>
                </div>

                {/* Toggle */}
                <div className="flex bg-gray-900/50 p-1 rounded-xl mb-6">
                    <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${authMode === 'login' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-500'}`}>Entrar</button>
                    <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${authMode === 'register' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>Cadastrar</button>
                </div>

                {authMode === 'register' ? (
                    // REGISTER FORM
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-center mb-2">
                             <div onClick={() => authImageInputRef.current?.click()} className="w-20 h-20 rounded-full bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-500 transition-colors relative group">
                                <input ref={authImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleAuthImageSelect} />
                                {authPhoto ? (
                                    <img src={authPhoto} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-400 flex flex-col items-center">
                                        <PhotoIcon />
                                    </div>
                                )}
                             </div>
                        </div>

                        <div className="space-y-3">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><UserCircleIcon /></div>
                                <input type="text" placeholder="Nome" value={authName} onChange={e => setAuthName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><EnvelopeIcon /></div>
                                <input type="email" placeholder="Gmail" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><LockIcon /></div>
                                <input type="password" placeholder="Senha" value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><LockIcon /></div>
                                <input type="password" placeholder="Confirmar Senha" value={authConfirmPass} onChange={e => setAuthConfirmPass(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 outline-none" />
                            </div>
                        </div>

                        <button onClick={handleRegister} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-2 transition-colors">
                            Criar Conta
                        </button>
                    </div>
                ) : (
                    // LOGIN FORM
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 pt-2">
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><EnvelopeIcon /></div>
                                <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 outline-none" />
                            </div>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><LockIcon /></div>
                                <input type="password" placeholder="Senha" value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                        <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4 transition-colors">
                            Entrar
                        </button>
                    </div>
                )}
             </div>
        </div>
      )}

      {/* --- MODAL: USER PROFILE & STORE MANAGER --- */}
      {showProfileModal && currentUser && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-gray-800 w-full h-[90vh] sm:h-auto sm:max-h-[85vh] sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-2xl">
                  <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XMarkIcon /></button>
                  
                  <div className="flex flex-col items-center mb-6 border-b border-gray-700 pb-6">
                      <div className="w-24 h-24 rounded-full border-4 border-gray-700 overflow-hidden mb-3">
                          <img src={currentUser.avatar} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-xl font-bold text-white">{currentUser.name}</h2>
                      <p className="text-gray-500 text-sm">{currentUser.email}</p>
                      <button onClick={handleLogout} className="mt-3 text-red-400 text-xs hover:underline">Sair da conta</button>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-hide space-y-6">
                      <div className="bg-gray-700/30 rounded-xl p-4">
                          <h3 className="text-white font-bold mb-3 flex items-center gap-2"><StoreIcon /> Meu Negócio</h3>
                          
                          {myEstablishments.length === 0 ? (
                              <div className="text-center py-6 bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl border border-gray-600 shadow-inner">
                                  <div className="text-4xl mb-2">🍔</div>
                                  <h4 className="text-white font-bold">Quer vender no Tupã Food?</h4>
                                  <p className="text-gray-400 text-xs mb-4 px-4">Crie sua loja, adicione seu cardápio e comece a receber pedidos pelo WhatsApp.</p>
                                  <button 
                                    onClick={() => { setShowProfileModal(false); setIsCreating(true); setCreateType('establishment'); resetForm(); }}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-2 px-6 rounded-full shadow-lg active:scale-95 transition-transform"
                                  >
                                    Criar minha Loja agora
                                  </button>
                              </div>
                          ) : (
                              myEstablishments.map(est => (
                                  <div key={est.id} className="space-y-4">
                                      <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg">
                                          <img src={est.image} className="w-12 h-12 rounded object-cover" />
                                          <div>
                                              <div className="text-white font-bold text-sm">{est.name}</div>
                                              <div className="text-green-400 text-xs">Ativo no Tupã Food</div>
                                          </div>
                                      </div>

                                      <div className="border-t border-gray-600 pt-4">
                                          <div className="flex justify-between items-center mb-2">
                                              <span className="text-gray-300 text-sm font-bold">Gerenciar Cardápio</span>
                                              <button onClick={() => setIsAddingProduct(!isAddingProduct)} className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                                                  {isAddingProduct ? 'Cancelar' : '+ Novo Produto'}
                                              </button>
                                          </div>

                                          {/* Add Product Form */}
                                          {isAddingProduct && (
                                              <div className="bg-gray-900 p-3 rounded-lg mb-4 animate-in fade-in zoom-in-95">
                                                  <h5 className="text-xs text-gray-400 mb-2 font-bold uppercase">Adicionar Item</h5>
                                                  <div className="flex gap-2 mb-2">
                                                      <input type="text" placeholder="Nome do prato" value={tempProdName} onChange={e => setTempProdName(e.target.value)} className="flex-1 bg-gray-800 text-white text-sm rounded p-2 outline-none border border-gray-700 focus:border-green-500"/>
                                                      <input type="number" placeholder="Preço" value={tempProdPrice} onChange={e => setTempProdPrice(e.target.value)} className="w-20 bg-gray-800 text-white text-sm rounded p-2 outline-none border border-gray-700 focus:border-green-500"/>
                                                  </div>
                                                  <p className="text-[10px] text-gray-500 mb-2">Quer adicionar seus produtos? Preencha acima.</p>
                                                  <button onClick={() => handleAddProductFromProfile(est.id)} className="w-full bg-green-600 text-white text-xs font-bold py-2 rounded hover:bg-green-500">
                                                      Salvar Produto
                                                  </button>
                                              </div>
                                          )}

                                          {/* Product List */}
                                          <div className="space-y-2">
                                              {est.products.map(prod => (
                                                  <div key={prod.id} className="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700">
                                                      <span className="text-gray-300 text-sm">{prod.name}</span>
                                                      <div className="flex items-center gap-3">
                                                          <span className="text-green-400 font-bold text-sm">R$ {prod.price?.toFixed(2)}</span>
                                                          <button onClick={() => handleDeleteProduct(est.id, prod.id)} className="text-gray-500 hover:text-red-500 p-1">
                                                              <TrashIcon />
                                                          </button>
                                                      </div>
                                                  </div>
                                              ))}
                                              {est.products.length === 0 && !isAddingProduct && (
                                                  <p className="text-center text-gray-500 text-xs py-2">Nenhum produto cadastrado ainda.</p>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: CREATE ITEM (Event or Store) --- */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-gray-800 w-full max-h-[90vh] sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">O que você vai criar?</h2>
                    <button onClick={() => setIsCreating(false)}><XMarkIcon /></button>
                </div>
                
                {/* Type Toggle */}
                <div className="flex bg-gray-700 rounded-lg p-1 mb-4">
                    <button onClick={() => setCreateType('event')} className={`flex-1 py-2 rounded-md text-sm font-bold ${createType === 'event' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}>Evento</button>
                    <button onClick={() => setCreateType('establishment')} className={`flex-1 py-2 rounded-md text-sm font-bold ${createType === 'establishment' ? 'bg-green-600 text-white' : 'text-gray-400'}`}>Empresa</button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
                    <div onClick={() => imageInputRef.current?.click()} className="h-32 bg-gray-700 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-600 cursor-pointer relative overflow-hidden">
                        <input ref={imageInputRef} type="file" className="hidden" onChange={handleImageSelect} accept="image/*"/>
                        {formImage ? <img src={formImage} className="w-full h-full object-cover"/> : <span className="text-gray-400 text-sm flex gap-2"><PhotoIcon /> Capa</span>}
                    </div>

                    <input type="text" placeholder={createType === 'event' ? "Nome do Evento" : "Nome da Empresa"} value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white"/>
                    <textarea placeholder="Descrição" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white" rows={2}/>
                    
                    {createType === 'event' && (
                        <div className="flex gap-2">
                             <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-white"/>
                             <input type="text" placeholder="Local" value={formLocation} onChange={e => setFormLocation(e.target.value)} className="flex-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white"/>
                        </div>
                    )}

                    <input type="tel" placeholder="WhatsApp (Obrigatório para vendas)" value={formWhatsapp} onChange={e => setFormWhatsapp(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white"/>

                    {createType === 'establishment' && (
                        <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-white text-sm font-bold">Cadastrar Produtos?</span>
                                <button onClick={() => setStoreHasCatalog(!storeHasCatalog)} className={`w-10 h-5 rounded-full p-1 transition-colors ${storeHasCatalog ? 'bg-green-500' : 'bg-gray-600'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${storeHasCatalog ? 'translate-x-5' : 'translate-x-0'}`}/>
                                </button>
                            </div>
                            
                            {storeHasCatalog && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Produto" value={tempProdName} onChange={e => setTempProdName(e.target.value)} className="flex-1 bg-gray-800 rounded p-2 text-sm text-white"/>
                                        <input type="number" placeholder="R$" value={tempProdPrice} onChange={e => setTempProdPrice(e.target.value)} className="w-20 bg-gray-800 rounded p-2 text-sm text-white"/>
                                        <button onClick={handleAddProduct} className="bg-blue-600 text-white p-2 rounded"><PlusIcon /></button>
                                    </div>
                                    <div className="space-y-1 mt-2">
                                        {newProducts.map((p, i) => (
                                            <div key={i} className="flex justify-between text-xs text-gray-300 bg-gray-800 p-2 rounded">
                                                <span>{p.name}</span>
                                                <span>R$ {p.price?.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {!storeHasCatalog && <p className="text-[10px] text-gray-400">Modo Simples: Apenas fotos e link para WhatsApp.</p>}
                        </div>
                    )}
                </div>
                <button onClick={handleCreateSubmit} className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-xl">Publicar</button>
            </div>
        </div>
      )}

      {/* --- MODAL: DETAILS (Event or Establishment) --- */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
             <div className="bg-gray-800 w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl relative flex flex-col overflow-hidden">
                <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full"><XMarkIcon /></button>
                
                <div className="flex-1 overflow-y-auto scrollbar-hide pb-20 sm:pb-6">
                    <img src={selectedItem.image} className="w-full h-56 object-cover" />
                    
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                             <div>
                                <h2 className="text-2xl font-bold text-white">{('title' in selectedItem) ? selectedItem.title : selectedItem.name}</h2>
                                <p className="text-gray-400 text-sm">{selectedItem.description}</p>
                             </div>
                        </div>

                        {/* --- STORE LOGIC --- */}
                        {selectedItem.type === 'establishment' && (
                            <div className="space-y-4">
                                {!selectedItem.hasCatalog ? (
                                    // NO CATALOG VIEW
                                    <button 
                                        onClick={() => {
                                            const text = `Olá, estou interessado em tal item do cardápio.`;
                                            window.open(`https://wa.me/${selectedItem.whatsappContact}?text=${encodeURIComponent(text)}`, '_blank');
                                        }}
                                        className="w-full bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                                    >
                                        <ChatBubbleIcon /> Falar no WhatsApp
                                    </button>
                                ) : (
                                    // CATALOG VIEW
                                    <div className="space-y-3">
                                        <h3 className="font-bold text-white border-b border-gray-700 pb-2">Cardápio</h3>
                                        {selectedItem.products.filter(p => p.price !== undefined).map(prod => (
                                            <div key={prod.id} className="flex justify-between items-center bg-gray-700/30 p-3 rounded-lg">
                                                <div>
                                                    <div className="text-white font-medium">{prod.name}</div>
                                                    <div className="text-green-400 font-bold text-sm">R$ {prod.price!.toFixed(2)}</div>
                                                </div>
                                                <button 
                                                    onClick={() => addToCart(prod, selectedItem.id)}
                                                    className="bg-blue-600 text-white p-2 rounded-full active:scale-90 transition-transform"
                                                >
                                                    <PlusIcon />
                                                </button>
                                            </div>
                                        ))}
                                        {selectedItem.products.length === 0 && <p className="text-gray-500 text-sm">Nenhum produto cadastrado.</p>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- EVENT LOGIC --- */}
                        {selectedItem.type === 'event' && selectedItem.whatsappContact && (
                            <button 
                                onClick={() => {
                                    const text = `Olá! Quero comprar ingresso para o evento *${selectedItem.title}*.`;
                                    window.open(`https://wa.me/${selectedItem.whatsappContact}?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl"
                            >
                                Comprar Ingresso
                            </button>
                        )}
                    </div>
                </div>

                {/* --- CART FOOTER (If Store with Catalog) --- */}
                {selectedItem.type === 'establishment' && selectedItem.hasCatalog && cart.length > 0 && cart[0].establishmentId === selectedItem.id && (
                    <div className="bg-gray-900 border-t border-gray-700 p-4 absolute bottom-0 left-0 right-0">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-white font-bold flex items-center gap-2"><ShoppingBagIcon /> Carrinho</span>
                            <span className="text-green-400 font-bold">R$ {cart.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}</span>
                        </div>
                        <div className="max-h-24 overflow-y-auto mb-3 space-y-1">
                            {cart.map(item => (
                                <div key={item.productId} className="flex justify-between text-xs text-gray-300">
                                    <span>{item.quantity}x {item.productName}</span>
                                    <button onClick={() => removeFromCart(item.productId)} className="text-red-400 font-bold">X</button>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => handleCheckout(selectedItem as Establishment)}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl"
                        >
                            Fazer pedido agora
                        </button>
                    </div>
                )}
             </div>
        </div>
      )}

    </div>
  );
};

export default ChatInterface;