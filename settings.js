// settings.js — LCARS Messenger | Nastavení barev přes Firestore
// Žádný localStorage — vše v cloudu!

import { db } from './firebase-config.js';
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Výchozí LCARS hodnoty
export const VYCHOZI_NASTAVENI = {
  lcarsOrange:     "#FF9900",
  lcarsSecondary:  "#99CCFF",
  lcarsBg:         "#111111",
  zpravaMoje:      "#7a3800",
  zpravaJina:      "#1a1a2e",
  lcarsText:       "#FFCC00",
  lcarsPurple:     "#9999CC"
};

// Načíst nastavení z Firestore
export async function nacistNastaveni(userId) {
  try {
    const snap = await getDoc(doc(db, "settings", userId));
    if (snap.exists()) {
      return { ...VYCHOZI_NASTAVENI, ...snap.data() };
    }
  } catch (e) {
    console.warn("Nastavení nenalezeno, výchozí hodnoty:", e.message);
  }
  return { ...VYCHOZI_NASTAVENI };
}

// Uložit nastavení do Firestore
export async function ulozitNastaveni(userId, nastaveni) {
  await setDoc(doc(db, "settings", userId), nastaveni, { merge: true });
}

// Aplikovat barvy jako CSS proměnné na :root
export function aplikovatBarvy(n) {
  const r = document.documentElement;
  r.style.setProperty("--lcars-primary",     n.lcarsOrange);
  r.style.setProperty("--lcars-secondary",   n.lcarsSecondary);
  r.style.setProperty("--lcars-bg",          n.lcarsBg);
  r.style.setProperty("--msg-moje",          n.zpravaMoje);
  r.style.setProperty("--msg-jina",          n.zpravaJina);
  r.style.setProperty("--lcars-text",        n.lcarsText);
  r.style.setProperty("--lcars-purple",      n.lcarsPurple);
}

// Vykreslit panel nastavení do containeru
export function vykresitNastaveni(nastaveni, container) {
  const polozky = [
    { id: "lcarsOrange",    label: "PRIMÁRNÍ BARVA",    help: "Hlavní LCARS oranžová" },
    { id: "lcarsSecondary", label: "SEKUNDÁRNÍ BARVA",  help: "Modré akcenty" },
    { id: "lcarsBg",        label: "POZADÍ APLIKACE",   help: "Tmavé pozadí" },
    { id: "zpravaMoje",     label: "MOJE ZPRÁVY",       help: "Bubliny vpravo" },
    { id: "zpravaJina",     label: "CIZÍ ZPRÁVY",       help: "Bubliny vlevo" },
    { id: "lcarsText",      label: "BARVA TEXTU",        help: "Nadpisy a labely" },
    { id: "lcarsPurple",    label: "FIALOVÉ AKCENTY",   help: "Navigační tlačítka" }
  ];

  container.innerHTML = `
    <div class="settings-grid">
      ${polozky.map(p => `
        <div class="settings-item">
          <div class="settings-label">${p.label}</div>
          <div class="settings-help">${p.help}</div>
          <div class="settings-color-row">
            <input type="color" class="settings-color" id="sc-${p.id}"
                   value="${nastaveni[p.id] || VYCHOZI_NASTAVENI[p.id]}">
            <span class="settings-hex" id="sh-${p.id}">
              ${nastaveni[p.id] || VYCHOZI_NASTAVENI[p.id]}
            </span>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="settings-preview">
      <div class="preview-label">NÁHLED ZPRÁV</div>
      <div class="preview-msg-cizi">Ahoj Jiříku! 👋</div>
      <div class="preview-msg-moje">Zdravím posádko! 🖖</div>
    </div>
    <button class="lcars-btn-primary settings-save" id="btnUlozitNastaveni">
      ULOŽIT NASTAVENÍ DO DATABÁZE
    </button>
    <button class="lcars-btn-secondary settings-reset" id="btnResetNastaveni">
      OBNOVIT VÝCHOZÍ LCARS BARVY
    </button>
  `;

  // Live preview při změně barvy
  polozky.forEach(p => {
    const input = document.getElementById(`sc-${p.id}`);
    const hex   = document.getElementById(`sh-${p.id}`);
    if (!input) return;
    input.addEventListener("input", () => {
      hex.textContent = input.value;
      // Okamžitý preview v aplikaci
      const tmpNastaveni = ziskatHodnotyZFormulare(polozky);
      aplikovatBarvy(tmpNastaveni);
    });
  });
}

// Získat hodnoty z formuláře
export function ziskatHodnotyZFormulare(polozky) {
  if (!polozky) {
    polozky = [
      "lcarsOrange","lcarsSecondary","lcarsBg",
      "zpravaMoje","zpravaJina","lcarsText","lcarsPurple"
    ].map(id => ({ id }));
  }
  const result = {};
  polozky.forEach(p => {
    const el = document.getElementById(`sc-${p.id}`);
    result[p.id] = el ? el.value : VYCHOZI_NASTAVENI[p.id];
  });
  return result;
}
