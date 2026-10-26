import "server-only";
import { cookies } from "next/headers";
import { COOKIE_FLASH, type Flash } from "@/lib/flash-tipos";

/**
 * Mensagem para mostrar como toast DEPOIS de um redirect (a action que
 * redireciona não chega a devolver a mensagem para o formulário). Fica num
 * cookie de 1 minuto que o <FlashToast /> lê e apaga na tela seguinte.
 */
export async function flash(mensagem: string, tipo: Flash["tipo"] = "sucesso") {
  const valor: Flash = { tipo, mensagem };
  // o Next já codifica o valor do cookie (o <FlashToast /> decodifica uma vez)
  (await cookies()).set(COOKIE_FLASH, JSON.stringify(valor), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    httpOnly: false, // lido no navegador
  });
}
