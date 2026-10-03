/* ════════════════════════════════
   REACTION ICONS — keep only the like icon
════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reaction-icons').forEach(container => {
        container.innerHTML = '<span class="react-like"></span>';
    });
});

/* ════════════════════════════════
   VIEWER COUNTER
   topViewerCount  → viewers shown in the red live bar (slightly higher)
   bottomViewerCount → "people are watching now" bar (base count)
   Both driven by the same variable; top = base + offset so they
   always differ but move together.
════════════════════════════════ */
const VIEWER_MIN    = 650;
const VIEWER_MAX    = 750;
const VIEWER_INIT   = 682;   // base starting count
const VIEWER_OFFSET = 8;     // top bar always shows this many more
const VIEWER_TICK   = 3500;  // ms between updates

let viewerCount = VIEWER_INIT;

const elBottom = document.getElementById('bottomViewerCount');
const elTop    = document.getElementById('topViewerCount');

function renderCounts() {
    if (elBottom) elBottom.textContent = viewerCount;
    if (elTop)    elTop.textContent    = viewerCount;
}

function updateViewerCount() {
    const delta = Math.floor(Math.random() * 7) - 3; // –3 to +3
    viewerCount = Math.max(VIEWER_MIN, Math.min(VIEWER_MAX, viewerCount + delta));
    renderCounts();
}

renderCounts();                           // set both on first paint
setInterval(updateViewerCount, VIEWER_TICK);

/* ════════════════════════════════
   SOCIAL PROOF NOTIFICATIONS
   Sequência de NOTIF_TOTAL notificações que começa no minuto
   NOTIF_VIDEO_TIME do vídeo e se encaixa no tempo que resta dele.
════════════════════════════════ */
/* Modo de teste: abrir a página com ?notif_test=10 dispara aos 10s de vídeo */
const notifTestParam   = new URLSearchParams(location.search).get('notif_test');
const NOTIF_VIDEO_TIME = notifTestParam
    ? parseInt(notifTestParam, 10)
    : 20 * 60 + 43; // 20:43 do vídeo (em segundos)
const NOTIF_TOTAL      = 18;           // total de notificações da sequência
const NOTIF_DURATION   = 6000;         // 6s visível na tela
const NOTIF_FADE       = 800;          // entrada + saída da animação

/* Pisos usados só quando a sequência precisa encolher para caber no vídeo */
const NOTIF_GAP_MIN      = 4000;       // intervalo mínimo de tela limpa
const NOTIF_DURATION_MIN = 3500;       // tempo mínimo visível
const NOTIF_SLACK        = 500;        // folga antes do fim do vídeo

/* Intervalo VARIÁVEL de TELA LIMPA, em segundos: a contagem só começa
   depois que a notificação anterior sai da tela.
   17 intervalos para 18 notificações (a 1ª sai assim que o gatilho bate).
   Editar à vontade — a lista é percorrida em ordem. */
const NOTIF_GAPS = [
    10, 13, 11, 12, 10, 13, 11, 10, 12,
    13, 11, 10, 13, 12, 11, 10, 13,
];

/* 18 nomes, um para cada notificação — nenhum repete os comentários da página */
const NOTIF_NAMES = [
    'Emily Parker', 'Andrew Collins', 'Olivia Bennett',
    'Ryan Mitchell', 'Grace Sullivan', 'Nathan Brooks',
    'Chloe Reed', 'Ethan Foster', 'Victoria Hayes',
    'Benjamin Carter', 'Hannah Morgan', 'Lucas Cooper',
    'Natalie Edwards', 'Samuel Turner', 'Rebecca Phillips',
    'Owen Richardson', 'Rachel Simmons', 'Aaron Campbell',
];

let notifQueue     = [];   // nomes embaralhados, consumidos um a um
let notifSent      = 0;    // quantas já foram exibidas
let notifContainer = null;

/* Valores EFETIVOS — os de cima são o ideal, estes são o que roda de fato.
   fitNotifsToVideo() encolhe estes se o vídeo acabar antes da sequência. */
let notifTotal     = NOTIF_TOTAL;
let notifDuration  = NOTIF_DURATION;
let notifGaps      = NOTIF_GAPS.map(g => g * 1000);

/* ── Encaixe no tempo que resta de vídeo ──────────────────────────
   Comprime nesta ordem, para preservar o que mais importa:
     1. encurta os intervalos de tela limpa   (piso NOTIF_GAP_MIN)
     2. encurta o tempo visível de cada uma   (piso NOTIF_DURATION_MIN)
     3. corta as últimas notificações
   Se a duração do vídeo for desconhecida, mantém tudo como está. */
function notifGapSum() {
    return notifGaps.slice(0, notifTotal - 1).reduce((a, b) => a + b, 0);
}

function notifNeededMs() {
    return notifTotal * (notifDuration + NOTIF_FADE) + notifGapSum();
}

/* Reescala os intervalos para ocupar só o espaço que sobra do tempo em tela.
   Nunca aumenta (scale <= 1) e nunca desce abaixo do piso. */
function compressGaps(budgetMs) {
    const room   = budgetMs - notifTotal * (notifDuration + NOTIF_FADE);
    const gapSum = notifGapSum();
    if (gapSum <= 0 || room <= 0) return;
    const scale = Math.min(1, room / gapSum);
    notifGaps = notifGaps.map(g => Math.max(NOTIF_GAP_MIN, Math.floor(g * scale)));
}

function fitNotifsToVideo(remainingMs) {
    if (!isFinite(remainingMs) || remainingMs <= 0) return;

    const budget = remainingMs - NOTIF_SLACK;            // margem de segurança
    if (notifNeededMs() <= budget) return;               // já cabe, nada a fazer

    compressGaps(budget);                                // 1. aperta os intervalos

    if (notifNeededMs() > budget) {                      // 2. encurta o tempo em tela
        const each = (budget - notifGapSum()) / notifTotal - NOTIF_FADE;
        notifDuration = Math.max(NOTIF_DURATION_MIN, Math.floor(each));
        compressGaps(budget);                            // 3. reaperta, já com tela menor
    }

    // 4. só então corta as últimas — reapertando os intervalos a cada corte,
    //    já que cada notificação a menos libera espaço para as que ficam
    while (notifTotal > 1 && notifNeededMs() > budget) {
        notifTotal--;
        compressGaps(budget);
    }
}

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getNextName() {
    if (!notifQueue.length) notifQueue = shuffle(NOTIF_NAMES);
    return notifQueue.shift();
}

function getTimeLabel() {
    const opts = ['now', '1 min ago', '2 min ago', '3 min ago'];
    return opts[Math.floor(Math.random() * opts.length)];
}

function showNotif() {
    if (!notifContainer) return;

    const name = getNextName();
    const el   = document.createElement('div');
    el.className = 'notif';
    el.innerHTML = `
        <div class="notif-inner">
            <span class="notif-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
            </span>
            <div class="notif-text">
                <span class="notif-name">${name}</span>
                <span class="notif-action">just purchased the Ancient Manuscript</span>
            </div>
            <span class="notif-time">${getTimeLabel()}</span>
            <button class="notif-close" aria-label="Close">✕</button>
        </div>
        <div class="notif-bar"><div class="notif-bar-fill"></div></div>
    `;

    notifContainer.appendChild(el);

    // slide in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('notif--show'));
    });

    // start draining bar after slide-in
    const fill = el.querySelector('.notif-bar-fill');
    setTimeout(() => {
        fill.style.transitionDuration = notifDuration + 'ms';
        fill.classList.add('notif-bar--drain');
    }, 400);

    // auto-dismiss
    const autoClose = setTimeout(() => dismiss(el), notifDuration + 400);

    // manual close
    el.querySelector('.notif-close').addEventListener('click', () => {
        clearTimeout(autoClose);
        dismiss(el);
    });
}

function dismiss(el) {
    el.classList.add('notif--hide');
    setTimeout(() => el.remove(), 400);
}

function startNotifications() {
    notifContainer = document.createElement('div');
    notifContainer.className = 'notif-container';
    document.body.appendChild(notifContainer);

    notifQueue = shuffle(NOTIF_NAMES);
    showNotif();      // primeira imediata ao iniciar
    notifSent = 1;
}

/* ════════════════════════════════
   COMENTÁRIOS PROGRAMADOS
   Os <article> já estão no index.html, ocultos por .comment--timed.
   Cada um é revelado quando o vídeo chega no seu horário.
   MANTER EM ORDEM CRONOLÓGICA — a fila é consumida de cima para baixo.
     at   = segundo do vídeo em produção
     test = segundos após o gatilho das notificações, no modo ?notif_test
════════════════════════════════ */
const TIMED_COMMENTS = [
    { id: 'commentRachel', at: 20 * 60 + 45, test: 2  },  // 20:45 — Rachel Adams
    { id: 'commentSarah', at: 20 * 60 + 52, test: 9  },  // 20:52 — Sarah Walker (resposta)
];

let commentIdx = 0;   // próximo da fila

function commentTimeOf(c) {
    return notifTestParam ? NOTIF_VIDEO_TIME + c.test : c.at;
}

function revealCommentsIfTime(t) {
    if (typeof t !== 'number' || isNaN(t)) return;

    while (commentIdx < TIMED_COMMENTS.length) {
        const c = TIMED_COMMENTS[commentIdx];
        if (t < commentTimeOf(c)) return;           // ainda não é hora

        const el = document.getElementById(c.id);
        if (el) el.classList.add('comment--shown');

        // "Mostrando 11 de 1.247" → +1, para bater com o que está na tela
        const header = document.querySelector('.comments-visible-count');
        if (header) header.textContent = String(Number(header.textContent) + 1);

        commentIdx++;
    }
}

/* Dispara quando o VÍDEO chega em NOTIF_VIDEO_TIME (20:43).
   O <video> do Vturb fica dentro de shadow DOM, então eventos de mídia
   não chegam ao document. Usamos dois métodos:
   1. API oficial do smartplayer (global exposto pela ConverteAI)
   2. Fallback: polling que varre a página (incluindo shadow roots
      abertos) atrás do <video> e lê currentTime diretamente.
   Em ambos os casos o relógio é o do próprio vídeo — pausou, parou.
   A sequência INTEIRA anda por esse relógio, não por setTimeout: se o
   visitante pausar, as notificações esperam junto e nunca vazam para
   além do fim do vídeo. */
let notifStarted = false;
let notifNextAt  = 0;   // instante do VÍDEO (s) em que a próxima deve aparecer

/* Passo até a próxima: tempo em tela + intervalo de tela limpa */
function notifStepSec(i) {
    return (notifDuration + NOTIF_FADE + notifGaps[i % notifGaps.length]) / 1000;
}

function notifClockTick(t, duration) {
    if (typeof t !== 'number' || isNaN(t)) return;

    if (!notifStarted) {
        if (t < NOTIF_VIDEO_TIME) return;
        notifStarted = true;
        fitNotifsToVideo((duration - t) * 1000);  // encaixa no que resta de vídeo
        startNotifications();
        notifNextAt = t + notifStepSec(0);
        return;
    }

    if (notifSent >= notifTotal) return;          // sequência encerrada
    if (t >= notifNextAt) {
        showNotif();
        notifSent++;
        notifNextAt = t + notifStepSec(notifSent - 1);
    }
}

/* Tudo que é agendado pelo relógio do vídeo passa por aqui */
function videoClockTick(t, duration) {
    notifClockTick(t, duration);
    revealCommentsIfTime(t);
}

/* Já terminou tudo? (usado para desligar o polling) */
function videoClockDone() {
    return notifStarted && notifSent >= notifTotal && commentIdx >= TIMED_COMMENTS.length;
}

/* Método 1 — API oficial do smartplayer */
(function hookSmartplayer(attempts) {
    if (typeof smartplayer === 'undefined' || !smartplayer.instances || !smartplayer.instances.length) {
        if (attempts >= 60) return; // desiste após ~60s (fallback continua ativo)
        return setTimeout(() => hookSmartplayer(attempts + 1), 1000);
    }
    smartplayer.instances[0].on('timeupdate', () => {
        const inst = smartplayer.instances[0];
        const t = inst.video
            ? inst.video.currentTime
            : (typeof inst.currentTime === 'function' ? inst.currentTime() : null);
        const d = inst.video
            ? inst.video.duration
            : (typeof inst.duration === 'function' ? inst.duration() : undefined);
        videoClockTick(t, d);
    });
})(0);

/* Método 2 — fallback por polling (cobre shadow DOM aberto) */
function findVideo(root) {
    if (root.querySelector) {
        const direct = root.querySelector('video');
        if (direct) return direct;
    }
    const all = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of all) {
        if (el.shadowRoot) {
            const v = findVideo(el.shadowRoot);
            if (v) return v;
        }
    }
    return null;
}

let notifVideoEl = null;
const notifPoll = setInterval(() => {
    if (videoClockDone()) { clearInterval(notifPoll); return; }
    if (!notifVideoEl || !notifVideoEl.isConnected) notifVideoEl = findVideo(document);
    if (notifVideoEl) videoClockTick(notifVideoEl.currentTime, notifVideoEl.duration);
}, 500);

/* ════════════════════════════════
   DYNAMIC EXPIRY DATE
   Always shows tomorrow's date in MM/DD/YYYY format
════════════════════════════════ */
function setTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const day   = String(tomorrow.getDate()).padStart(2, '0');
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const year  = tomorrow.getFullYear();

    const dateEl = document.querySelector('.warning-box .date');
    if (dateEl) dateEl.textContent = `${month}/${day}/${year}`;
}

setTomorrowDate();
