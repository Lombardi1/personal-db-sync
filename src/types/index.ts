export interface Chat {
  id: string;
  created_at: string;
  participant_ids: string[]; // Array of UUIDs of participants
  participant_usernames?: string[]; // Populated by frontend for display
  last_message_content?: string | null;
  last_message_at?: string | null;
  unread_count?: number; // NUOVO: Conteggio messaggi non letti per l'utente corrente
  name?: string; // NEW: Optional name for the chat
}

export interface Message {
  id: string;
  created_at: string;
  chat_id: string;
  sender_id: string;
  sender_username?: string; // Populated by frontend for display
  content: string;
}

export interface ChatRing {
  id: string;
  created_at: string;
  chat_id: string;
  sender_id: string;
}