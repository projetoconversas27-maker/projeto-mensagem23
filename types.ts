export enum MessageRole {
  USER = 'user',
  OTHER = 'other',
}

export interface Attachment {
  mimeType: string;
  data: string;
  type: 'image' | 'video' | 'audio';
  previewUrl?: string;
}

export interface Mention {
  id: string;
  type: 'event' | 'product';
  label: string;
  image?: string;
}

export interface ReplyData {
  text: string;
  senderName: string;
  messageId: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  senderName: string;
  sender_id?: string; // Se presente, é um usuário logado
  text: string;
  attachments?: Attachment[];
  timestamp: number;
  creator_token?: string;
  reply_to?: ReplyData;
  mentions?: Mention[];
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  location_name: string;
  latitude: number;
  longitude: number;
  start_time: string;
  creatorName: string;
  creator_token?: string;
  has_tickets: boolean;
  ticket_price?: number;
  whatsappContact?: string;
}

export type ProductGroup = 'Comidas' | 'Farmácia' | 'Lojas';

export interface ProductOption {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url: string;
  category: ProductGroup;
  has_options: boolean;
  options: ProductOption[];
  creator_id?: string;
  whatsapp_contact: string;
  created_at?: string;
}