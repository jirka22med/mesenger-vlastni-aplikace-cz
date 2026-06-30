// script.js — LCARS Messenger | Hlavní orchestrátor v2
// OPRAVA: odstraněn redirect handling, popup funguje přímo

import { prihlasitGooglem, odhlasit, sledovatPrihlaseni } from './auth.js';
import {
  odesilatTextZpravu,
  odesilatObrazekZpravu,
  sledovatZpravy,
  odpojitChat,
  formatovatCas,
  formatovatDatum
} from './chat.js';
import {
  pridatDoGalerie,
  sledovatGalerii,
  smazatZGalerie,
  odpojitGalerii,
  inicializovatModal,
  otevritModal,
  zavritModal
} from './gallery.js';
import {
  nacistNastaveni,
  ulozitNastaveni,
  aplikovatBarvy,
  vykresitNastaveni,
  ziskatHodnotyZFormulare,
  VYCHOZI_NASTAVENI
} from './settings.js';

// Globální stav
let aktualniUser      = null;
let aktualniNastaveni = { ...VYCHOZI_NASTAVENI };

// ════════════════════════════════════════════════════
//  INICIALIZACE
// ════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  inicializovatModal();
  navButtony();
  chatButtony();
  galerieButtony();
  prihlasovaniButtony();

  let prvniKontrola = true;

  // Sledovat stav přihlášení
  sledovatPrihlaseni(async (user) => {
    if (user) {
      aktualniUser = user;
      aktualniNastaveni = await nacistNastaveni(user.uid);
      aplikovatBarvy(aktualniNastaveni);
      zobrazitApp(user);
      spustitListenery();
    } else {
      aktualniUser = null;
      odpojitChat();
      odpojitGalerii();
      zobrazitLogin();
    }

    // Loading screen schováme až po PRVNÍM ověření — ne při každé změně
    if (prvniKontrola) {
      document.getElementById("loadingScreen").style.display = "none";
      prvniKontrola = false;
    }
  });
});

// ════════════════════════════════════════════════════
//  PŘIHLAŠOVÁNÍ TLAČÍTKA
// ════════════════════════════════════════════════════
function prihlasovaniButtony() {
  document.getElementById("btnPrihlasit").addEventListener("click", async () => {
    const errorEl = document.getElementById("loginError");
    errorEl.style.display = "none";
    const btn = document.getElementById("btnPrihlasit");
    btn.textContent = "PŘIPOJUJI K FLOTILE...";
    btn.disabled = true;

    try {
      await prihlasitGooglem();
      // onAuthStateChanged se postará o zbytek
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
      btn.innerHTML = '<span class="btn-icon">G</span> PŘIHLÁSIT SE PŘES GOOGLE';
      btn.disabled = false;
    }
  });

  document.getElementById("btnOdhlasit").addEventListener("click", async () => {
    await odhlasit();
  });
}

// ════════════════════════════════════════════════════
//  ZOBRAZENÍ
// ════════════════════════════════════════════════════
function zobrazitApp(user) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appContainer").style.display = "flex";

  const avatar = user.photoURL
    ? `<img src="${user.photoURL}" class="user-avatar" alt="${user.displayName}">`
    : `<div class="user-avatar-placeholder">${user.displayName.charAt(0)}</div>`;

  document.getElementById("headerUserInfo").innerHTML = `
    ${avatar}
    <span class="user-display-name">${user.displayName}</span>
  `;
}

function zobrazitLogin() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("appContainer").style.display = "none";
  document.getElementById("headerUserInfo").innerHTML = "";

  const btn = document.getElementById("btnPrihlasit");
  if (btn) {
    btn.innerHTML = '<span class="btn-icon">G</span> PŘIHLÁSIT SE PŘES GOOGLE';
    btn.disabled = false;
  }
}

// ════════════════════════════════════════════════════
//  NAVIGACE
// ════════════════════════════════════════════════════
function navButtony() {
  document.querySelectorAll(".nav-btn[data-sekce]").forEach(btn => {
    btn.addEventListener("click", () => prepinatSekci(btn.dataset.sekce));
  });
}

function prepinatSekci(sekce) {
  document.querySelectorAll(".nav-btn[data-sekce]").forEach(b => {
    b.classList.toggle("active", b.dataset.sekce === sekce);
  });
  document.querySelectorAll(".sekce").forEach(s => {
    s.classList.toggle("active", s.id === `sekce-${sekce}`);
  });

  if (sekce === "nastaveni" && aktualniUser) {
    vykresitNastaveni(aktualniNastaveni, document.getElementById("settingsPanel"));
    nastavitSettingsButtony();
  }
}

// ════════════════════════════════════════════════════
//  CHAT TLAČÍTKA
// ════════════════════════════════════════════════════
function chatButtony() {
  document.getElementById("msgInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      odplatZpravu();
    }
  });

  document.getElementById("btnOdeslat").addEventListener("click", odplatZpravu);

  document.getElementById("btnObrazekChat").addEventListener("click", () => {
    document.getElementById("imageUrlModal").classList.add("active");
    document.getElementById("imageUrlInput").focus();
  });

  document.getElementById("btnOdeslatObrazek").addEventListener("click", odplatObrazek);

  document.getElementById("imageUrlInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") odplatObrazek();
  });

  document.getElementById("btnZavritImageModal").addEventListener("click", () => {
    document.getElementById("imageUrlModal").classList.remove("active");
    document.getElementById("imageUrlInput").value = "";
  });
}

async function odplatZpravu() {
  if (!aktualniUser) return;
  const input = document.getElementById("msgInput");
  const text  = input.value.trim();
  if (!text) return;
  try {
    await odesilatTextZpravu(aktualniUser, text);
    input.value = "";
  } catch (err) {
    alert("Chyba při odesílání: " + err.message);
  }
}

async function odplatObrazek() {
  if (!aktualniUser) return;
  const input = document.getElementById("imageUrlInput");
  const url   = input.value.trim();
  try {
    await odesilatObrazekZpravu(aktualniUser, url);
    input.value = "";
    document.getElementById("imageUrlModal").classList.remove("active");
  } catch (err) {
    alert(err.message);
  }
}

// ════════════════════════════════════════════════════
//  GALERIE TLAČÍTKA
// ════════════════════════════════════════════════════
function galerieButtony() {
  document.getElementById("btnPridatObrazekGalerie").addEventListener("click", async () => {
    if (!aktualniUser) return;
    const url   = document.getElementById("galleryUrlInput").value;
    const popis = document.getElementById("galleryPopisInput").value;
    try {
      await pridatDoGalerie(aktualniUser, url, popis);
      document.getElementById("galleryUrlInput").value  = "";
      document.getElementById("galleryPopisInput").value = "";
    } catch (err) {
      alert(err.message);
    }
  });
}

// ════════════════════════════════════════════════════
//  NASTAVENÍ TLAČÍTKA
// ════════════════════════════════════════════════════
function nastavitSettingsButtony() {
  const btnUlozit = document.getElementById("btnUlozitNastaveni");
  const btnReset  = document.getElementById("btnResetNastaveni");

  if (btnUlozit) {
    btnUlozit.onclick = async () => {
      const nova = ziskatHodnotyZFormulare();
      await ulozitNastaveni(aktualniUser.uid, nova);
      aktualniNastaveni = nova;
      aplikovatBarvy(nova);
      btnUlozit.textContent = "✓ ULOŽENO!";
      setTimeout(() => { btnUlozit.textContent = "ULOŽIT NASTAVENÍ DO DATABÁZE"; }, 2000);
    };
  }

  if (btnReset) {
    btnReset.onclick = async () => {
      await ulozitNastaveni(aktualniUser.uid, VYCHOZI_NASTAVENI);
      aktualniNastaveni = { ...VYCHOZI_NASTAVENI };
      aplikovatBarvy(aktualniNastaveni);
      vykresitNastaveni(aktualniNastaveni, document.getElementById("settingsPanel"));
      nastavitSettingsButtony();
    };
  }
}

// ════════════════════════════════════════════════════
//  REALTIME LISTENERY
// ════════════════════════════════════════════════════
function spustitListenery() {
  sledovatZpravy((zpravy) => vykresitZpravy(zpravy));
  sledovatGalerii((obrazky) => vykresitGalerii(obrazky));
}

// ════════════════════════════════════════════════════
//  VYKRESLENÍ ZPRÁV
// ════════════════════════════════════════════════════
function vykresitZpravy(zpravy) {
  const container = document.getElementById("messagesContainer");
  const byloNaDne = jeDole(container);

  let prevDatum = null;
  const html = zpravy.map(z => {
    const jaMohu  = z.senderId === aktualniUser?.uid;
    const initial = (z.senderName || "?").charAt(0).toUpperCase();
    const cas     = formatovatCas(z.timestamp);
    const datum   = z.timestamp ? formatovatDatum(z.timestamp) : null;
    let oddelovac = "";

    if (datum && datum !== prevDatum) {
      oddelovac = `<div class="date-separator"><span>${datum}</span></div>`;
      prevDatum = datum;
    }

    const bubble = z.typ === "image"
      ? `<img src="${z.imageUrl}" class="msg-image"
               alt="Obrázek"
               onclick="window.__otevritModal('${z.imageUrl.replace(/'/g,"\\'")}', 'Obrázek od ${escHtml(z.senderName)}')"
               onerror="this.outerHTML='<div class=\\"msg-broken\\">[Nedostupný obrázek]</div>'">`
      : `<div class="msg-text">${escHtml(z.text || "")}</div>`;

    return `${oddelovac}
      <div class="message ${jaMohu ? "moje" : "cizi"}">
        <div class="msg-avatar" title="${escHtml(z.senderName)}">${initial}</div>
        <div class="msg-bubble">
          <div class="msg-sender">${escHtml(z.senderName)}</div>
          ${bubble}
          <div class="msg-cas">${cas}</div>
        </div>
      </div>`;
  }).join("");

  container.innerHTML = html;
  if (byloNaDne) container.scrollTop = container.scrollHeight;
}

function jeDole(el) {
  return el.scrollHeight - el.clientHeight - el.scrollTop < 60;
}

// ════════════════════════════════════════════════════
//  VYKRESLENÍ GALERIE
// ════════════════════════════════════════════════════
function vykresitGalerii(obrazky) {
  const grid = document.getElementById("galleryGrid");

  if (!obrazky.length) {
    grid.innerHTML = `<div class="gallery-empty">DATABÁZE PRÁZDNÁ — PŘIDEJ PRVNÍ OBRÁZEK</div>`;
    return;
  }

  grid.innerHTML = obrazky.map(o => {
    const mohuSmazat = o.pridalId === aktualniUser?.uid;
    return `
      <div class="gallery-item"
           onclick="window.__otevritModal('${o.url.replace(/'/g,"\\'")}', '${escHtml(o.popis)}', '${escHtml(o.pridalJmeno)}')">
        <img src="${o.url}" alt="${escHtml(o.popis)}"
             onerror="this.parentElement.classList.add('gallery-item-broken')">
        <div class="gallery-item-overlay">
          <div class="gallery-popis">${escHtml(o.popis)}</div>
          <div class="gallery-autor">${escHtml(o.pridalJmeno)}</div>
        </div>
        ${mohuSmazat ? `
          <button class="gallery-del-btn"
                  onclick="event.stopPropagation(); window.__smazatGalerie('${o.id}')"
                  title="Smazat">✕</button>` : ""}
      </div>`;
  }).join("");
}

// ════════════════════════════════════════════════════
//  GLOBÁLNÍ FUNKCE (onclick v dynamickém HTML)
// ════════════════════════════════════════════════════
window.__otevritModal  = (url, popis, autor) => otevritModal(url, popis, autor);
window.__smazatGalerie = async (id) => {
  if (confirm("Smazat obrázek z galerie?")) await smazatZGalerie(id);
};

// ════════════════════════════════════════════════════
//  HELPER
// ════════════════════════════════════════════════════
function escHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
