// auth.js — LCARS Messenger | Google přihlášení + whitelist
// OPRAVA v2: signInWithPopup místo Redirect — spolehlivější na GitHub Pages!

import { auth, db } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ╔══════════════════════════════════════════════════╗
// ║  WHITELIST — povolení uživatelé                  ║
// ║  Přidej Jardův email až ho budeš mít!            ║
// ╚══════════════════════════════════════════════════╝
const POVOLENI_UZIVATELE = [
  "jirkamed66@gmail.com",
  "jakesjardajak@gmail.com"    // ← ⚠️ DOPLNIT!
];

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// Přihlásit přes Google popup
export async function prihlasitGooglem() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Kontrola whitelistu
  if (!POVOLENI_UZIVATELE.includes(user.email)) {
    await signOut(auth);
    throw new Error(`Přístup odepřen: ${user.email} není v seznamu posádky!`);
  }

  // Uložit profil do Firestore
  await setDoc(doc(db, "users", user.uid), {
    email:       user.email,
    displayName: user.displayName,
    photoURL:    user.photoURL,
    lastSeen:    serverTimestamp()
  }, { merge: true });

  return user;
}

// Odhlásit
export async function odhlasit() {
  await signOut(auth);
}

// Sledovat stav přihlášení (listener — volá se při každé změně)
export function sledovatPrihlaseni(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Aktualizovat lastSeen
      await setDoc(doc(db, "users", user.uid), {
        lastSeen: serverTimestamp()
      }, { merge: true });
    }
    callback(user);
  });
}
