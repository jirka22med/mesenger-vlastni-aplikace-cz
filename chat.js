// chat.js — LCARS Messenger | Chatovací logika
// Realtime zprávy přes Firestore onSnapshot

import { db } from './firebase-config.js';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const ZPRAVY_LIMIT = 150;
let unsubscribeChat = null;

// Odeslat textovou zprávu
export async function odesilatTextZpravu(user, text) {
  const cistyText = text.trim();
  if (!cistyText) return;

  await addDoc(collection(db, "messages"), {
    senderId:    user.uid,
    senderName:  user.displayName,
    senderPhoto: user.photoURL,
    text:        cistyText,
    imageUrl:    null,
    typ:         "text",
    timestamp:   serverTimestamp()
  });
}

// Odeslat zprávu s URL obrázku
export async function odesilatObrazekZpravu(user, imageUrl) {
  const cistyUrl = imageUrl.trim();
  if (!cistyUrl) throw new Error("URL nesmí být prázdná!");
  if (!cistyUrl.match(/^https?:\/\/.+/)) {
    throw new Error("Neplatná URL — musí začínat https://");
  }

  await addDoc(collection(db, "messages"), {
    senderId:    user.uid,
    senderName:  user.displayName,
    senderPhoto: user.photoURL,
    text:        null,
    imageUrl:    cistyUrl,
    typ:         "image",
    timestamp:   serverTimestamp()
  });
}

// Spustit realtime listener na zprávy
export function sledovatZpravy(callback) {
  const q = query(
    collection(db, "messages"),
    orderBy("timestamp", "asc"),
    limit(ZPRAVY_LIMIT)
  );

  unsubscribeChat = onSnapshot(q, (snapshot) => {
    const zpravy = [];
    snapshot.forEach((docSnap) => {
      zpravy.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(zpravy);
  }, (err) => {
    console.error("Chat listener chyba:", err);
  });

  return unsubscribeChat;
}

// Odpojit listener (při odhlášení)
export function odpojitChat() {
  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }
}

// Formátovat Firebase timestamp na čas HH:MM
export function formatovatCas(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString("cs-CZ", {
    hour:   "2-digit",
    minute: "2-digit"
  });
}

// Formátovat datum pro oddělovač dnů
export function formatovatDatum(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("cs-CZ", {
    weekday: "long",
    day:     "numeric",
    month:   "long"
  });
}
