import type { AuthError, PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";
import type { ActionResult } from "./types";

/** Resultado padrão de Server Action quando o zod rejeita a entrada */
export function erroValidacao(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "Verifique os campos destacados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  };
}

const ERROS_AUTH: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
  user_already_exists: "Este e-mail já tem cadastro. Entre com sua senha.",
  email_exists: "Este e-mail já tem cadastro. Entre com sua senha.",
  weak_password: "Senha muito fraca. Use pelo menos 8 caracteres, misturando letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_email_send_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  over_request_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  signup_disabled: "Novos cadastros estão desativados no momento.",
  session_not_found: "Sua sessão expirou. Entre novamente.",
  otp_expired: "O link expirou. Solicite um novo.",
  reauthentication_needed: "Por segurança, saia e entre novamente antes de trocar a senha.",
};

export function mensagemErroAuth(error: AuthError): string {
  return (error.code && ERROS_AUTH[error.code]) || "Não foi possível concluir. Tente novamente.";
}

/**
 * Traduz erros do Postgres/PostgREST. Mensagens levantadas pelos nossos
 * triggers (raise exception) já vêm em português e são repassadas.
 */
export function mensagemErroBanco(error: PostgrestError): string {
  switch (error.code) {
    case "23505":
      return "Já existe um registro com esses dados.";
    case "23503":
      return "Este registro está vinculado a outros dados e não pode ser removido.";
    case "42501":
      return error.message.startsWith("new row violates")
        ? "Você não tem permissão para esta ação."
        : error.message;
    case "23514":
    case "P0001":
      return error.message.includes("violates check constraint")
        ? "Algum dado está fora do formato esperado."
        : error.message;
    case "PGRST116":
      return "Registro não encontrado ou sem permissão de acesso.";
    default:
      return "Não foi possível salvar. Tente novamente.";
  }
}
