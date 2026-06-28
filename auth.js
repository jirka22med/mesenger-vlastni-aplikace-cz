// auth.js — LCARS Messenger | Google přihlášení + whitelist
// Používá signInWithRedirect — nutné pro GitHub Pages (žádné popup bloky!)

import { auth, db } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
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

// Spustit Google přihlášení (redirect — stránka se reload)
export async function prihlasitGooglem() {
  await signInWithRedirect(auth, provider);
}

// Zavolat ihned při načtení stránky — zpracuje výsledek redirectu
export async function zpracovatRedirectVysledek() {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;  // žádný redirect neprobíhal

    const user = result.user;

    // Kontrola whitelistu
    if (!POVOLENI_UZIVATELE.includes(user.email)) {
      await signOut(auth);
      return { chyba: `Přístup odepřen: ${user.email} není v seznamu posádky!` };
    }

    // Uložit profil do Firestore
    await ulozitProfil(user);
    return { uzivatel: user };

  } catch (err) {
    console.error("Redirect error:", err);
    return { chyba: err.message };
  }
}

// Odhlásit
export async function odhlasit() {
  await signOut(auth);
}

// Sledovat stav přihlášení (listener)
export function sledovatPrihlaseni(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Aktualizovat lastSeen při každém načtení
      await setDoc(doc(db, "users", user.uid), {
        lastSeen: serverTimestamp()
      }, { merge: true });
    }
    callback(user);
  });
}

// Interní — uložit/aktualizovat profil
async function ulozitProfil(user) {
  await setDoc(doc(db, "users", user.uid), {
    email:       user.email,
    displayName: user.displayName,
    photoURL:    user.photoURL,
    lastSeen:    serverTimestamp()
  }, { merge: true });
}
