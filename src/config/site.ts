// Informações fixas do site público. Pastores, projetos e dados de
// contribuição ficam no banco e são editados pela área administrativa.
export const siteConfig = {
  nome: "Igreja Koinonia",
  /** Frase-tema da igreja (título da home) */
  tema: "Quem serve vê Deus",
  descricao: "Uma comunidade de fé, comunhão e serviço em Blumenau.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  fundacao: 2010,
  versiculo: {
    texto: "Pois nem mesmo o Filho do Homem veio para ser servido, mas para servir.",
    referencia: "Marcos 10:45",
  },
  /** Agenda semanal: dia (0 = domingo) e horário. Alimenta o "Próximo culto" da home. */
  cultos: [{ dia: 0, hora: "19:00", nome: "Culto" }],
  horariosCulto: [{ dia: "Domingo", horario: "19h", descricao: "Culto — todos os domingos" }],
  endereco: {
    logradouro: "Rua Alfredo Hering, 98",
    bairro: "Itoupava Seca",
    cidade: "Blumenau",
    uf: "SC",
    cep: "89030-410",
  },
  // URL de embed do Google Maps (Compartilhar → Incorporar um mapa)
  mapaEmbedUrl: "https://www.google.com/maps?q=Rua+Alfredo+Hering,+98,+Itoupava+Seca,+Blumenau+-+SC,+89030-410&output=embed",
  contato: {
    whatsapp: "554733089872", // só dígitos, com DDI (55) e DDD
    email: "contato@igrejakoinonia.com.br", // TODO: e-mail real
  },
  redes: {
    instagram: "https://www.instagram.com/igrejakoinoniablumenau",
    instagramUsuario: "@igrejakoinoniablumenau",
  },
} as const;
