export const TIME_ZONE = "America/Sao_Paulo";
export const LOCALE = "pt-BR";

const moeda = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "BRL" });

const data = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: "short" });

const dataLonga = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const dataHora = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

const hora = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, timeStyle: "short" });

const isoDate = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

/** Data de hoje em São Paulo no formato de coluna date: "2026-10-15" */
export function hojeISO(): string {
  return isoDate.format(new Date());
}

const partesDataHora = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** timestamptz → valor de <input type="datetime-local"> no horário de Brasília */
export function paraInputDataHora(iso: string): string {
  const p = Object.fromEntries(partesDataHora.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * <input type="datetime-local"> (horário de Brasília) → ISO com fuso.
 * O Brasil não tem horário de verão desde 2019, então o offset é fixo em -03:00.
 */
export function deInputDataHora(local: string): string {
  return `${local}:00-03:00`;
}

/** Máscara do campo de valor: só dígitos, lidos como centavos → "1.234,56" */
export function formatarMoedaInput(valor: string): string {
  const digitos = somenteDigitos(valor).replace(/^0+/, "").slice(0, 10);
  if (!digitos) return "";
  const numero = Number(digitos) / 100;
  return numero.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "1.234,56" → 1234.56 ; vazio → null */
export function lerMoeda(valor: string): number | null {
  const digitos = somenteDigitos(valor);
  return digitos ? Number(digitos) / 100 : null;
}

/** R$ 1.234,56 */
export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

/** Valor de evento: null = "Gratuito" */
export function formatarValorEvento(valor: number | string | null): string {
  return valor === null ? "Gratuito" : formatarMoeda(Number(valor));
}

/**
 * Colunas `date` do Postgres chegam como "AAAA-MM-DD". Ancoramos ao meio-dia
 * UTC para que a conversão de fuso nunca troque o dia.
 */
function deColunaDate(valor: string): Date {
  return new Date(`${valor}T12:00:00Z`);
}

/** 15/10/2026 — aceita timestamptz (ISO) ou coluna date ("2026-10-15") */
export function formatarData(valor: string | Date): string {
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return data.format(deColunaDate(valor));
  }
  return data.format(new Date(valor));
}

/** quinta-feira, 15 de outubro */
export function formatarDataLonga(valor: string | Date): string {
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return dataLonga.format(deColunaDate(valor));
  }
  return dataLonga.format(new Date(valor));
}

/** 15/10/2026, 19:30 */
export function formatarDataHora(valor: string | Date): string {
  return dataHora.format(new Date(valor));
}

/** 19:30 */
export function formatarHora(valor: string | Date): string {
  return hora.format(new Date(valor));
}

/** "Reforma do Templo!" → "reforma-do-templo" */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** (99) 99999-9999 — aceita entrada parcial (usado na máscara do input) */
export function formatarCelular(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 99999-999 — aceita entrada parcial */
export function formatarCep(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** 00.000.000/0000-00 */
export function formatarCnpj(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
