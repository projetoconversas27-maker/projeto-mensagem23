export enum MessageRole {
  USER = 'user',
  OTHER = 'other',
}

export type MediaType = 'image' | 'video' | 'audio';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64 string
  type: MediaType;
  previewUrl?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  senderName?: string;
  senderId?: string; // ID único do remetente para bloqueio
  avatar?: string;
  text: string;
  attachments?: Attachment[];
  timestamp: number;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface Event {
  id: string;
  type: 'event';
  title: string;
  description?: string;
  image: string;
  locationName: string;
  coordinates?: GeoLocation;
  time: string;
  creatorName: string;
  creatorId?: string; // ID do criador
  likes: number;
  likedByMe?: boolean;
  comments: Comment[];
  whatsappContact?: string;
}

export interface Product {
  id: string;
  name: string;
  price?: number; // Opcional, mas só exibe se tiver
  image?: string; // Foto do produto
}

export interface Establishment {
  id: string;
  type: 'establishment';
  name: string;
  description?: string;
  image: string;
  whatsappContact: string;
  creatorName: string;
  creatorId?: string; // ID do dono da empresa
  hasCatalog: boolean; // Se tem produtos ou só foto
  products: Product[];
  likes: number;
  likedByMe?: boolean;
}

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  establishmentId: string;
}

export type FeedItem = Event | Establishment;