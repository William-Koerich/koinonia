function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}. Veja o .env.example.`);
  }
  return value;
}

// Acesso literal a process.env.NEXT_PUBLIC_* para o Next embutir no bundle do client
export const supabaseUrl = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const supabasePublishableKey = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
