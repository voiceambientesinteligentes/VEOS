import { api } from "../js/data/api.js";
import { telaProposta, telaPropostas } from "../js/ui/views/proposta.js";
import { rodar } from "./_kit.js";

const caso = location.hash.slice(1);
const EST = { estimate_number: "EST-000123", customer_name: "Cliente TESTE Ltda", customer_id: "555", date: "2026-10-01", expiry_date: "2026-10-31", salesperson_name: "Fernando TESTE",
  reference_number: "Obra Rua TESTE", sub_total: 21000, discount_total: 1000, tax_total: 0, adjustment: 0, total: 20000, notes: "Garantia conforme fabricante. TESTE", terms: "Instalação em horário comercial. TESTE",
  shipping_address: { address: "Rua da Obra TESTE, 10", city: "Balneário Camboriú", state: "SC" },
  line_items: [
    { item_order: 1, header_name: "Sala de estar", name: "Central de automação TESTE", description: "Controle de iluminação e cenas\ncom app", quantity: 1, unit: "un", rate: 12000, item_total: 12000 },
    { item_order: 2, header_name: "Sala de estar", name: "Teclado TESTE", quantity: 4, unit: "un", rate: 1500, item_total: 6000 },
    { item_order: 3, header_name: "Serviços", name: "Programação TESTE", quantity: 1, rate: 3000, item_total: 3000 },
  ] };
Object.assign(api, {
  zohoEspelhoRegistro: async (p, m) => (m === "estimates" ? { dados: EST } : { dados: { email: "cliente@teste.invalid", mobile: "(47) 99999-0000", contact_persons: [{ first_name: "Ana", is_primary_contact: true }] } }),
  zohoEspelhoLista: async () => ({ linhas: [{ id: "4823000000123", nome: "EST-000123", campos: { estimate_number: "EST-000123", customer_name: "Cliente TESTE Ltda", date: "2026-10-01", total: 20000, status: "sent" } }] }),
});

rodar(async (v) => {
  if (caso === "lista") {
    await telaPropostas(v);
    if (!v.querySelector('a[href="#/propostas/4823000000123"]')) throw new Error("lista sem link");
    return;
  }
  await telaProposta(v, "4823000000123");
  // formato detalhado (padrao, mesmas colunas do Zoho Books)
  const doc = v.querySelector(".proposta-doc").textContent;
  for (const t of ["EST-000123", "Nº", "Item e descrição", "Valor unit.", "Sala de estar", "Subtotal Sala de estar", "R$ 18.000,00", "R$ 1.500,00", "Investimento total", "R$ 20.000,00", "− R$ 1.000,00", "31/10/2026", "Garantia conforme fabricante"]) if (!doc.includes(t)) throw new Error(`faltou no documento: ${t}`);
  const numeros = [...v.querySelectorAll(".proposta-doc tbody tr td:first-child")].map((td) => td.textContent).filter((x) => /^\d+$/.test(x));
  if (numeros.join(",") !== "1,2,3") throw new Error(`numeração errada: ${numeros}`);
  // formato global: itens com quantidade, sem preco por item, total do projeto
  const formato = v.querySelector("#pp-formato");
  formato.value = "global"; formato.dispatchEvent(new Event("input", { bubbles: true }));
  const global = v.querySelector(".proposta-doc").textContent;
  for (const t of ["Sala de estar", "Investimento total", "R$ 20.000,00"]) if (!global.includes(t)) throw new Error(`global sem: ${t}`);
  if (global.includes("Subtotal Sala de estar") || global.includes("R$ 1.500,00")) throw new Error("global não deveria ter preço por item");
  if (/custo|margem/i.test(doc)) throw new Error("custo/margem nao pode ir para o cliente");
  const mail = v.querySelector('a[href^="mailto:"]').getAttribute("href");
  const wa = v.querySelector('a[href^="https://wa.me/"]').getAttribute("href");
  if (!mail.includes("cliente%40teste.invalid") || !decodeURIComponent(mail).includes("Olá, Ana!")) throw new Error("rascunho de e-mail errado");
  if (!wa.startsWith("https://wa.me/5547999990000?text=")) throw new Error("whatsapp errado " + wa);
});
