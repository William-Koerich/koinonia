"use client";

import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PessoaOpcao = { id: string; nome_completo: string };

/** Seletor de pessoa com busca por nome (lista vinda de koinonia_perfis_basicos) */
export function PessoaCombobox({
  id,
  pessoas,
  value,
  onChange,
  placeholder = "Selecione uma pessoa",
  permitirLimpar = false,
  invalido,
  desabilitarIds,
  avisos,
}: {
  id?: string;
  pessoas: PessoaOpcao[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  permitirLimpar?: boolean;
  invalido?: boolean;
  /** Pessoas que aparecem mas não podem ser escolhidas (ex.: já vinculadas) */
  desabilitarIds?: Set<string>;
  /** Aviso exibido abaixo do nome (ex.: "já escalado: Culto 10h") */
  avisos?: Map<string, string>;
}) {
  const [aberto, setAberto] = useState(false);
  const selecionada = pessoas.find((p) => p.id === value);

  return (
    <div className="flex gap-1">
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={aberto}
            aria-invalid={invalido}
            className="flex-1 justify-between font-normal"
          >
            <span className={cn("truncate", !selecionada && "text-muted-foreground")}>
              {selecionada?.nome_completo ?? placeholder}
            </span>
            <ChevronsUpDownIcon className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar pelo nome..." />
            <CommandList>
              <CommandEmpty>Ninguém encontrado.</CommandEmpty>
              <CommandGroup>
                {pessoas.map((pessoa) => (
                  <CommandItem
                    key={pessoa.id}
                    // o filtro do cmdk usa o value; incluímos o id para nomes repetidos
                    value={`${pessoa.nome_completo} ${pessoa.id}`}
                    disabled={desabilitarIds?.has(pessoa.id)}
                    onSelect={() => {
                      onChange(pessoa.id);
                      setAberto(false);
                    }}
                  >
                    <CheckIcon className={cn(value === pessoa.id ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0">
                      <p>{pessoa.nome_completo}</p>
                      {avisos?.has(pessoa.id) && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">{avisos.get(pessoa.id)}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {permitirLimpar && value && (
        <Button type="button" variant="ghost" size="icon" aria-label="Limpar" onClick={() => onChange(null)}>
          <XIcon />
        </Button>
      )}
    </div>
  );
}
