/** Link do WhatsApp com uma mensagem de boas-vindas já escrita */
export function linkWhatsApp(celular: string, nome: string) {
  const texto = `Olá, ${nome.split(" ")[0]}! Aqui é da Igreja Koinonia. Foi muito bom ter você com a gente!`;
  return `https://wa.me/55${celular}?text=${encodeURIComponent(texto)}`;
}
