import { redirect } from "next/navigation";

// "Financeiro" no menu é um grupo; a página padrão é a de entradas
export default function FinanceiroPage() {
  redirect("/app/financeiro/entradas");
}
