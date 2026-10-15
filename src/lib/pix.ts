import type { Enums } from "./types";

/**
 * Gera o payload "PIX Copia e Cola" (BR Code estático, padrão EMV do Banco
 * Central). O mesmo texto vira o QR Code.
 */

function campo(id: string, valor: string): string {
  return `${id}${valor.length.toString().padStart(2, "0")}${valor}`;
}

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) exigido no campo 63 */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** O BR Code só aceita ASCII: remove acentos e caracteres especiais */
function normalizar(texto: string, max: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, max);
}

/** Formata a chave como o PIX espera para cada tipo */
export function normalizarChavePix(chave: string, tipo: Enums<"koinonia_tipo_chave_pix">): string {
  const digitos = chave.replace(/\D/g, "");
  switch (tipo) {
    case "cpf":
    case "cnpj":
      return digitos;
    case "telefone":
      return digitos.startsWith("55") && digitos.length > 11 ? `+${digitos}` : `+55${digitos}`;
    case "email":
      return chave.trim().toLowerCase();
    case "aleatoria":
      return chave.trim().toLowerCase();
  }
}

export function gerarPayloadPix({
  chave,
  tipo,
  recebedor,
  cidade,
}: {
  chave: string;
  tipo: Enums<"koinonia_tipo_chave_pix">;
  recebedor: string;
  cidade: string;
}): string {
  const contaRecebedor = campo("00", "br.gov.bcb.pix") + campo("01", normalizarChavePix(chave, tipo));

  const semCrc =
    campo("00", "01") + // versão do payload
    campo("26", contaRecebedor) +
    campo("52", "0000") + // categoria do comerciante (não informada)
    campo("53", "986") + // moeda: BRL
    campo("58", "BR") +
    campo("59", normalizar(recebedor, 25)) +
    campo("60", normalizar(cidade, 15)) +
    campo("62", campo("05", "***")) + // sem identificador de transação
    "6304";

  return semCrc + crc16(semCrc);
}
