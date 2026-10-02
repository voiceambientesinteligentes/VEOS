// Tempos-padrao de servico (COO): catalogo de atividades por dispositivo e a "composicao" de um
// orcamento = quantidade de cada dispositivo x minutos das atividades dele. Serve para conferir se as
// horas cobradas batem com o trabalho real e para orcar mao de obra por ponto. Sem DOM.

export const DISPOSITIVOS = [
  ["interruptor", "Interruptor / teclado"], ["ir", "Emissor IR/RF (ar, TV)"], ["cortina", "Módulo de cortina/persiana"],
  ["motor_cortina", "Motor/trilho de cortina"], ["voz", "Assistente de voz (Alexa)"], ["hub", "Hub/gateway sem fio"],
  ["central", "Central de automação cabeada"], ["sensor", "Sensor"], ["modulo", "Módulo relé/dimmer"], ["fechadura", "Fechadura eletrônica"],
  ["roteador", "Roteador/gerenciador de rede"], ["ap", "Access point (antena Wi-Fi)"], ["switch", "Switch / PoE"], ["quadro_rede", "Quadro/rack de rede"],
  ["quadro_automacao", "Quadro de automação"], ["ponto_rede", "Ponto de rede (cabo + tomada)"], ["ponto_av", "Ponto de áudio e vídeo"],
  ["cabo_audio", "Cabo de áudio (por caixa)"], ["caixa_som", "Caixa de som embutida"], ["receiver", "Receiver/amplificador"], ["tv", "Televisor"],
  ["flap", "Flap/suporte motorizado de TV"], ["projetor", "Projetor e tela"], ["camera", "Câmera IP / CFTV"], ["nvr", "Gravador NVR"],
  ["led", "Fita de LED (metro)"], ["pelicula", "Película inteligente (m²)"], ["cena", "Cena/automação no app"], ["dashboard", "Dashboard/painel"],
  ["projeto", "Projeto (visita, levantamento, desenho)"], ["obra", "Obra (mobilização, testes, entrega)"], ["outro", "Outro"],
];
export const ATIVIDADES = [["fiacao", "Fiação (ligação elétrica)"], ["cabeamento", "Cabeamento (passagem de cabo)"], ["instalacao", "Instalação física"], ["configuracao", "Configuração/programação"], ["estrutura", "Estruturação (quadro/rack)"], ["teste", "Teste/certificação"], ["outro", "Outra"]];
export const TECNOLOGIAS = [["sem_fio", "Sem fio"], ["cabeado", "Cabeado"], ["na", "Não se aplica"]];
export const UNIDADES = [["dispositivo", "por dispositivo"], ["ponto", "por ponto"], ["metro", "por metro"], ["m2", "por m²"], ["ambiente", "por ambiente"], ["projeto", "por projeto"], ["dia", "por dia de obra"]];

const sem = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "18 MINUTOS" -> 18; "16 HORAS" -> 960; "1h30" -> 90; "25" -> 25 (sem unidade = minutos, marcado). */
export function minutos(texto, unidade = null) {
  const s = sem(texto).replace(",", ".").trim();
  if (!s) return null;
  const hm = /^(\d+(?:\.\d+)?)\s*h(?:oras?|rs?)?\s*(\d+)\s*(?:m|min)?/.exec(s);
  if (hm) return { min: Math.round(Number(hm[1]) * 60 + Number(hm[2])), semUnidade: false };
  const m = /(\d+(?:\.\d+)?)/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  if (unidade === "h") return { min: Math.round(n * 60), semUnidade: false };
  if (unidade === "min") return { min: Math.round(n), semUnidade: false };
  if (/\bh(ora|r|s)?s?\b|\d\s*h\b/.test(s)) return { min: Math.round(n * 60), semUnidade: false };
  if (/min/.test(s)) return { min: Math.round(n), semUnidade: false };
  return { min: Math.round(n), semUnidade: true };
}

const REGRAS_DISP = [
  [/dashboard|painel de controle/, "dashboard"], [/\bcena|automacoes\)/, "cena"], [/quadro gerencial de rede|rack/, "quadro_rede"],
  [/quadro gerencial de automacao|quadro de automacao/, "quadro_automacao"], [/flap/, "flap"], [/caixas? de som/, "caixa_som"],
  [/receive|amplificador/, "receiver"], [/cabeamento de audio/, "cabo_audio"], [/televis|\btv\b/, "tv"], [/projetor/, "projetor"],
  [/pontos? de wifi|antena|access point|\bap\b/, "ap"], [/reteador|roteador|router/, "roteador"], [/audio e video/, "ponto_av"],
  [/rede sem estrutura|cabeamento de rede/, "ponto_rede"], [/interruptor/, "interruptor"], [/infra|radio fre/, "ir"],
  [/cortina|persiana/, "cortina"], [/alexa|voz/, "voz"], [/\bhub\b/, "hub"], [/central/, "central"], [/sensor/, "sensor"],
  [/camera|cftv/, "camera"], [/fechadura/, "fechadura"], [/pelicula/, "pelicula"], [/\bled\b/, "led"],
];

/** Classifica uma descricao livre (como o fundador escreveu) em dispositivo/atividade/tecnologia. */
export function classificar(descricao) {
  const s = sem(descricao);
  const dispositivo = (REGRAS_DISP.find(([re]) => re.test(s)) ?? [null, "outro"])[1];
  const atividade = /configura/.test(s) ? "configuracao" : /estrutura/.test(s) && /quadro/.test(s) ? "estrutura" : /fiacao/.test(s) ? "fiacao" : /cabeamento/.test(s) ? "cabeamento" : /instala/.test(s) ? "instalacao" : "outro";
  const tecnologia = /sem fio/.test(s) ? "sem_fio" : /cabead|com fio/.test(s) ? "cabeado" : "na";
  return { dispositivo, atividade, tecnologia };
}

/** Converte a lista antiga (texto livre "18 MINUTOS") para a estruturada, marcando o que precisa conferir. */
export function converterAntigos(lista = []) {
  return lista.map((x) => {
    const c = classificar(x.servico);
    const t = minutos(x.horas);
    return { descricao: x.servico ?? "", ...c, unidade: /ponto/.test(sem(x.unidade)) ? "ponto" : "dispositivo", tempo: t ? String(t.min) : "", unidade_tempo: "min", origem: "voce", obs: [x.unidade && x.unidade !== "1" ? x.unidade : null, t?.semUnidade ? "sem unidade no original: considerado minutos" : null].filter(Boolean).join(" · ") };
  });
}

/** Minutos de um item do catalogo estruturado. */
export function minutosItem(x) {
  const t = minutos(x.tempo, x.unidade_tempo === "h" ? "h" : "min");
  return t ? t.min : null;
}

// ---------------------------------------------------------------- composicao de orcamento
const REGRAS_ITEM = [
  [/interruptor|teclado|keypad/, "interruptor"], [/controlador.*(ar|tv|televis)|ir universal|infravermelho/, "ir"],
  [/modulo.*(cortina|persiana)|cortina.*modulo/, "cortina"], [/motor.*cortina|trilho/, "motor_cortina"], [/assistente de voz|alexa|echo/, "voz"],
  [/gerenciador de automacao|\bhub\b|gateway/, "hub"], [/central de automacao/, "central"], [/sensor/, "sensor"], [/modulo (dimmer|rele|on\/off)/, "modulo"],
  [/fechadura/, "fechadura"], [/gerenciador de dados|router|roteador/, "roteador"], [/access point|\bap\b|antena/, "ap"], [/^switch|switch \d+ ?p|switch \d/, "switch"], [/injetor poe/, "injetor"],
  [/caixa (de som|acustica)|arandela/, "caixa_som"], [/receiver|amplificador/, "receiver"], [/televis|\btv\b/, "tv"], [/flap|controladora p\/ flap/, "flap"],
  [/projetor/, "projetor"], [/camera/, "camera"], [/\bnvr\b|gravador/, "nvr"], [/fita de led|perfil de led/, "led"], [/pelicula/, "pelicula"],
];
const sem_fio = (s) => !/cabead|knx|com fio/.test(s);

/** Dispositivos de um orcamento (so produtos) com quantidade e tecnologia. Cabos viram pontos pela metragem media. */
export function dispositivosDoOrcamento(linhas, { metrosPorPonto = 25 } = {}) {
  const r = new Map();
  const add = (k, tec, q) => { const key = `${k}|${tec}`; r.set(key, { dispositivo: k, tecnologia: tec, qtd: (r.get(key)?.qtd ?? 0) + q }); };
  let metrosRede = 0, metrosCoax = 0, temSwitch = false;
  for (const l of linhas) {
    if (l.tipo === "service") continue;
    const s = sem(l.nome);
    const q = Number(l.qtd) || 0;
    if (/cabo de rede|cat\.? ?[56]|utp/.test(s)) { metrosRede += q; continue; }
    if (/coaxial|rg ?6/.test(s)) { metrosCoax += q; continue; }
    const d = (REGRAS_ITEM.find(([re]) => re.test(s)) ?? [null, null])[1];
    if (!d) continue;
    if (d === "switch") { temSwitch = true; continue; }
    if (d === "injetor") continue; // acompanha o AP, sem tempo proprio
    add(d, ["interruptor", "ir", "cortina", "sensor", "central"].includes(d) ? (sem_fio(s) ? "sem_fio" : "cabeado") : "na", q);
  }
  const aps = [...r.values()].filter((x) => x.dispositivo === "ap").reduce((a, x) => a + x.qtd, 0);
  if (aps) add("ap_cabo", "na", aps);
  const pontosRede = Math.max(0, Math.round(metrosRede / metrosPorPonto) - aps);
  if (pontosRede) add("ponto_rede", "na", pontosRede);
  if (metrosCoax) add("ponto_av", "na", Math.round(metrosCoax / metrosPorPonto));
  if (temSwitch) add("quadro_rede", "na", 1); // quadro/rack so quando ha switch (rede estruturada)
  return { itens: [...r.values()], metrosRede, metrosCoax, metrosPorPonto };
}

/**
 * Horas-padrao de um orcamento: para cada dispositivo, soma os minutos de todas as atividades do
 * catalogo daquele dispositivo/tecnologia. Itens sem tempo no catalogo ficam listados como lacuna.
 */
export function composicao(linhas, catalogo, opcoes = {}) {
  const { itens, metrosRede, metrosCoax, metrosPorPonto } = dispositivosDoOrcamento(linhas, opcoes);
  const porDisp = (d, tec) => catalogo.filter((c) => (c.dispositivo === d || (d === "ap_cabo" && c.dispositivo === "ap" && c.atividade === "cabeamento")) && (d !== "ap" || c.atividade !== "cabeamento") && (c.tecnologia === tec || c.tecnologia === "na" || tec === "na") && minutosItem(c) !== null);
  const linhasComp = [];
  const faltam = [];
  let total = 0;
  for (const it of itens) {
    // uma entrada por atividade (a primeira do catalogo): alternativas da mesma atividade nao se somam
    const vistas = new Set();
    const atividades = porDisp(it.dispositivo, it.tecnologia).filter((c) => { const k = c.dispositivo === "ap" && it.dispositivo === "ap_cabo" ? "cab" : c.atividade; if (vistas.has(k)) return false; vistas.add(k); return true; });
    if (!atividades.length) { faltam.push(it); continue; }
    const minUnit = atividades.reduce((a, c) => a + minutosItem(c), 0);
    total += minUnit * it.qtd;
    linhasComp.push({ ...it, atividades: atividades.map((c) => `${c.atividade} ${minutosItem(c)} min`), minUnit, minTotal: minUnit * it.qtd });
  }
  const horasCobradas = linhas.filter((l) => l.tipo === "service" && /^h(r|ora)s?$/i.test(String(l.unidade ?? "").trim())).reduce((a, l) => a + (Number(l.qtd) || 0), 0);
  return { linhas: linhasComp, faltam, minutos: total, horas: Math.round((total / 60) * 10) / 10, horasCobradas, metrosRede, metrosCoax, metrosPorPonto };
}
