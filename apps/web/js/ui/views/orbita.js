// Tela Orbita: o VEOS no centro e cada setor em orbita. Um campo de "celulas"
// (como o grafo do conhecimento) se agrupa em cada setor e acende quando ele e
// ativado; conexoes mostram os fluxos reais entre setores.
// Canvas para as celulas; botoes reais para os setores (teclado e leitor de tela).
// Posicoes via CSSOM (el.style), compativel com a CSP sem estilo embutido.
import { clear, h } from "../dom.js";

// Fluxos entre setores (quem entrega trabalho a quem). Direcao e Secretaria
// coordenam todos.
const FLUXOS = {
  financas: ["vendas", "operacoes", "direcao", "pessoas"],
  vendas: ["financas", "marketing", "operacoes", "posvenda"],
  marketing: ["vendas", "posvenda", "direcao"],
  operacoes: ["vendas", "financas", "tecnologia", "posvenda"],
  tecnologia: ["operacoes", "posvenda", "direcao"],
  posvenda: ["operacoes", "tecnologia", "vendas", "marketing"],
  pessoas: ["financas", "operacoes", "direcao"],
  direcao: ["financas", "vendas", "marketing", "operacoes", "tecnologia", "posvenda", "pessoas", "secretaria"],
  secretaria: ["direcao", "financas", "vendas", "marketing", "operacoes", "tecnologia", "posvenda", "pessoas"],
};
const ORDEM = ["direcao", "financas", "vendas", "marketing", "operacoes", "tecnologia", "posvenda", "pessoas", "secretaria"];
const CELULAS_POR_SETOR = 26;
const CELULAS_NUCLEO = 60;
const POEIRA = 120;
const LIGACAO = 46;
const TAU = Math.PI * 2;

const reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function renderOrbita(root, { setores, diretores, atividade = {}, signal }) {
  const porId = Object.fromEntries(setores.map((s) => [s.id, s]));
  const diretorDe = Object.fromEntries(diretores.map((d) => [d.setor_id, d]));
  const lista = ORDEM.filter((id) => porId[id]).concat(setores.map((s) => s.id).filter((id) => !ORDEM.includes(id)));
  const status = (id) => {
    const a = atividade[id];
    if (!a || !a.acessivel) return { rotulo: "Acesso restrito", tom: "neutral", energia: 4, texto: "Dados sensíveis do setor" };
    const tom = a.alertas ? "warn" : "live";
    return { rotulo: a.alertas ? "Pede atenção" : "Vigiando", tom, energia: Math.min(100, 12 + a.alertas * 9 + a.tarefas * 3), texto: `${a.alertas} alertas · ${a.tarefas} tarefas` };
  };

  // ------------------------------------------------ estrutura
  const canvas = h("canvas", { class: "orbita-canvas", "aria-hidden": "true" });
  const nucleo = h("div", { class: "orbita-nucleo", "aria-hidden": "true" }, h("span", { class: "orbita-nucleo-nome" }, "VEOS"), h("span", { class: "orbita-nucleo-sub" }, "VOICE 360"));
  const nos = lista.map((id) => {
    const s = porId[id];
    const b = h("button", { class: "orbita-no", type: "button", "aria-pressed": "false", "aria-label": `${s.sigla} — ${s.nome}` },
      h("span", { class: "orbita-no-ponto" }, s.sigla),
      h("span", { class: "orbita-no-nome" }, s.nome));
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      ativar(ativo === id ? null : id);
    });
    return { id, el: b };
  });
  const cartao = h("aside", { class: "orbita-cartao", "aria-live": "polite", hidden: true });
  const palco = h("div", { class: "orbita-palco" }, canvas, nucleo, nos.map((n) => n.el));
  const dica = h("p", { class: "orbita-dica" }, "Toque em um setor para ver o diretor, o estado e as conexões. Toque no espaço vazio para voltar a girar.");
  palco.addEventListener("click", () => ativar(null));
  clear(root).append(h("section", { class: "orbita", "aria-label": "Órbita dos setores" }, palco, cartao), dica);

  // ------------------------------------------------ estado
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, R = 0, RY = 0, dpr = 1, esc = 1;
  let rot = -Math.PI / 2, alvoRot = null, ativo = null, t0 = performance.now(), quadro = 0;
  const pos = {}; // id -> {x, y, z}
  const rand = mulberry32(20260930);

  const celulas = [];
  lista.forEach((id) => {
    for (let k = 0; k < CELULAS_POR_SETOR; k++) celulas.push(novaCelula(id, 16 + rand() * 30));
  });
  for (let k = 0; k < CELULAS_NUCLEO; k++) celulas.push(novaCelula(null, 30 + rand() * 38));
  const poeira = Array.from({ length: POEIRA }, () => ({ u: rand(), v: rand(), r: 0.4 + rand() * 1.1, f: rand() * TAU, vel: 0.00004 + rand() * 0.00008 }));

  function novaCelula(dono, raio) {
    return { dono, raio, ang: rand() * TAU, vel: (rand() < 0.5 ? -1 : 1) * (0.2 + rand() * 0.5), fase: rand() * TAU, x: 0, y: 0, tam: 1 + rand() * 1.8, brilho: 0 };
  }

  function medir() {
    const r = palco.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Inclinacao: elipse no desktop, quase circulo em tela estreita. O raio deixa
    // espaco para o nome do setor nas laterais e no topo/base.
    const incl = W < 560 ? 0.92 : 0.58;
    R = Math.max(90, Math.min(W / 2 - 72, (H / 2 - 62) / incl, 340));
    RY = R * incl;
    esc = Math.max(0.5, Math.min(1, R / 300)); // celulas acompanham o tamanho
  }

  function posicoes() {
    const n = lista.length;
    lista.forEach((id, i) => {
      const a = (i / n) * TAU + rot;
      pos[id] = { x: W / 2 + R * Math.cos(a), y: H / 2 + RY * Math.sin(a), z: Math.sin(a) };
    });
  }

  function relacionados(id) {
    return id ? FLUXOS[id] || [] : [];
  }

  // ------------------------------------------------ interacao
  function ativar(id) {
    ativo = id;
    for (const n of nos) {
      const on = n.id === id;
      n.el.setAttribute("aria-pressed", String(on));
      n.el.classList.toggle("is-ativo", on);
      n.el.classList.toggle("is-relacionado", relacionados(id).includes(n.id));
      n.el.classList.toggle("is-apagado", !!id && !on && !relacionados(id).includes(n.id));
    }
    if (!id) {
      cartao.hidden = true;
      alvoRot = null;
      return;
    }
    // leva o setor para a frente (parte de baixo da elipse = mais perto)
    const i = lista.indexOf(id);
    const destino = Math.PI / 2 - (i / lista.length) * TAU;
    alvoRot = rot + (((destino - rot) % TAU) + TAU + Math.PI) % TAU - Math.PI;
    montarCartao(id);
  }

  function montarCartao(id) {
    const s = porId[id], d = diretorDe[id], st = status(id);
    const barra = h("span", { class: "orbita-energia-barra" });
    barra.style.width = `${st.energia}%`;
    clear(cartao).append(
      h("div", { class: "orbita-cartao-topo" },
        h("span", { class: `stamp tone-${st.tom}` }, st.rotulo),
        h("button", { class: "btn btn-ghost btn-icon", type: "button", "aria-label": "Fechar", onclick: (e) => { e.stopPropagation(); ativar(null); } }, "×")),
      h("p", { class: "orbita-cartao-sigla" }, s.sigla),
      h("h2", { class: "orbita-cartao-titulo" }, s.nome),
      h("p", { class: "orbita-cartao-diretor" }, d ? d.nome : "Diretor a definir"),
      h("p", { class: "orbita-cartao-texto" }, s.descricao),
      h("div", { class: "orbita-energia" },
        h("div", { class: "orbita-energia-rotulo" }, h("span", null, "Atividade"), h("span", { class: "num" }, st.texto)),
        h("div", { class: "orbita-energia-trilho" }, barra)),
      h("div", { class: "orbita-conexoes" },
        h("span", { class: "orbita-conexoes-rotulo" }, "Conectado a"),
        h("div", { class: "orbita-conexoes-lista" },
          relacionados(id).map((r) => h("button", { class: "orbita-chip", type: "button", onclick: (e) => { e.stopPropagation(); ativar(r); } }, porId[r]?.sigla ?? r)))),
      h("a", { class: "btn btn-primary orbita-acao", href: `#/setor/${id}` }, `Abrir ${s.nome}`),
    );
    cartao.hidden = false;
  }

  const teclas = (e) => {
    if (e.key === "Escape" && ativo) ativar(null);
  };
  document.addEventListener("keydown", teclas);

  // ------------------------------------------------ desenho
  function quadroDeAnimacao(agora) {
    const dt = Math.min(50, agora - t0);
    t0 = agora;
    const movimento = !reduzido();
    if (alvoRot !== null) {
      rot += (alvoRot - rot) * Math.min(1, dt / 260);
    } else if (movimento) {
      rot += dt * 0.00009;
    }
    posicoes();

    // setores (DOM): escala e opacidade pela profundidade
    for (const n of nos) {
      const p = pos[n.id];
      const escala = 0.78 + 0.22 * ((p.z + 1) / 2);
      n.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${n.id === ativo ? 1.12 : escala})`;
      n.el.style.zIndex = String(n.id === ativo ? 40 : Math.round(10 + 10 * p.z));
    }

    ctx.clearRect(0, 0, W, H);
    desenharPoeira(agora, movimento);
    desenharOrbitas();
    desenharFluxos(agora);
    desenharCelulas(agora, dt, movimento);
    desenharNucleo(agora, movimento);
    quadro = requestAnimationFrame(quadroDeAnimacao);
  }

  function desenharPoeira(agora, movimento) {
    for (const p of poeira) {
      if (movimento) p.u = (p.u + p.vel) % 1;
      const a = 0.25 + 0.2 * Math.sin(agora * 0.001 + p.f);
      ctx.fillStyle = `rgba(195,190,178,${a * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.u * W, p.v * H, p.r, 0, TAU);
      ctx.fill();
    }
  }

  function elipse(rx, ry, cor, traco) {
    ctx.strokeStyle = cor;
    ctx.setLineDash(traco);
    ctx.beginPath();
    ctx.ellipse(W / 2, H / 2, rx, ry, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function desenharOrbitas() {
    ctx.lineWidth = 1;
    elipse(R, RY, "rgba(201,165,76,0.28)", []);
    elipse(R * 0.62, RY * 0.62, "rgba(110,200,212,0.16)", [2, 6]);
    elipse(R * 1.22, RY * 1.22, "rgba(201,165,76,0.08)", [1, 9]);
  }

  function desenharFluxos(agora) {
    if (!ativo) return;
    const a = pos[ativo];
    const pulso = 0.5 + 0.5 * Math.sin(agora * 0.004);
    // nucleo -> ativo (nasce na borda do nucleo, sem cruzar o nome VEOS)
    const d = Math.hypot(a.x - W / 2, a.y - H / 2) || 1;
    const borda = 54 * esc + 8;
    linhaLuz(W / 2 + ((a.x - W / 2) / d) * borda, H / 2 + ((a.y - H / 2) / d) * borda, a.x, a.y, `rgba(227,198,125,${0.35 + 0.35 * pulso})`, 1.6);
    for (const r of relacionados(ativo)) {
      const b = pos[r];
      if (!b) continue;
      const mx = (a.x + b.x) / 2 + (H / 2 - (a.y + b.y) / 2) * 0.25;
      const my = (a.y + b.y) / 2 - (W / 2 - (a.x + b.x) / 2) * 0.25;
      ctx.strokeStyle = `rgba(110,200,212,${0.25 + 0.3 * pulso})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
      // particula viajando no fluxo
      const t = (agora * 0.0005 + r.length * 0.13) % 1;
      const px = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x;
      const py = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y;
      brilho(px, py, 3, "rgba(110,200,212,0.95)");
    }
  }

  function linhaLuz(x1, y1, x2, y2, cor, largura) {
    ctx.strokeStyle = cor;
    ctx.lineWidth = largura;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function brilho(x, y, r, cor) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, cor);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 4, 0, TAU);
    ctx.fill();
  }

  function desenharCelulas(agora, dt, movimento) {
    const rel = relacionados(ativo);
    for (const c of celulas) {
      const centro = c.dono ? pos[c.dono] : { x: W / 2, y: H / 2, z: 0 };
      if (movimento) c.ang += c.vel * dt * 0.0006 * (c.dono === ativo ? 2.4 : 1);
      const pulsa = c.dono === ativo ? 1.35 : 1;
      const wob = movimento ? Math.sin(agora * 0.0012 + c.fase) * 4 : 0;
      const rr = (c.dono ? c.raio : c.raio * 1.15) * esc * pulsa + wob;
      const tx = centro.x + Math.cos(c.ang) * rr;
      const ty = centro.y + Math.sin(c.ang) * rr * 0.8;
      // mola: as celulas "seguem" o setor com atraso (sensacao organica)
      const k = Math.min(1, dt / 140);
      c.x += (tx - c.x) * (c.x === 0 ? 1 : k);
      c.y += (ty - c.y) * (c.y === 0 ? 1 : k);
      const alvo = !ativo ? 0.55 : c.dono === ativo ? 1 : rel.includes(c.dono) ? 0.6 : c.dono === null ? 0.45 : 0.14;
      c.brilho += (alvo - c.brilho) * Math.min(1, dt / 220);
    }
    // ligacoes entre celulas proximas (grafo organico)
    ctx.lineWidth = 0.6;
    for (let i = 0; i < celulas.length; i++) {
      const a = celulas[i];
      for (let j = i + 1; j < celulas.length; j++) {
        const b = celulas[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > LIGACAO * LIGACAO) continue;
        const f = (1 - Math.sqrt(d2) / LIGACAO) * Math.min(a.brilho, b.brilho) * 0.55;
        const ciano = a.dono === ativo && b.dono === ativo && ativo;
        ctx.strokeStyle = ciano ? `rgba(110,200,212,${f})` : `rgba(201,165,76,${f * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    for (const c of celulas) {
      const on = ativo && c.dono === ativo;
      ctx.fillStyle = on ? `rgba(110,200,212,${c.brilho})` : c.dono === null ? `rgba(227,198,125,${c.brilho})` : `rgba(201,165,76,${c.brilho})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.tam * (on ? 1.4 : 1), 0, TAU);
      ctx.fill();
    }
  }

  function desenharNucleo(agora, movimento) {
    const cx = W / 2, cy = H / 2;
    const p = movimento ? 0.5 + 0.5 * Math.sin(agora * 0.0016) : 0.5;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 92);
    g.addColorStop(0, `rgba(227,198,125,${0.32 + 0.12 * p})`);
    g.addColorStop(0.45, "rgba(201,165,76,0.10)");
    g.addColorStop(1, "rgba(10,11,13,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 92, 0, TAU);
    ctx.fill();
    // ondas que saem do nucleo
    for (let k = 0; k < 2; k++) {
      const t = movimento ? ((agora * 0.00035 + k * 0.5) % 1) : 0.4 + k * 0.3;
      ctx.strokeStyle = `rgba(110,200,212,${0.35 * (1 - t)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 34 + t * 60, 0, TAU);
      ctx.stroke();
    }
  }

  // ------------------------------------------------ ciclo de vida
  const obs = new ResizeObserver(() => medir());
  obs.observe(palco);
  medir();
  const visivel = () => {
    cancelAnimationFrame(quadro);
    if (!document.hidden) {
      t0 = performance.now();
      quadro = requestAnimationFrame(quadroDeAnimacao);
    }
  };
  document.addEventListener("visibilitychange", visivel);
  quadro = requestAnimationFrame(quadroDeAnimacao);
  signal.addEventListener("abort", () => {
    cancelAnimationFrame(quadro);
    obs.disconnect();
    document.removeEventListener("keydown", teclas);
    document.removeEventListener("visibilitychange", visivel);
  });
}

// Gerador deterministico: o desenho das celulas e o mesmo a cada visita.
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
