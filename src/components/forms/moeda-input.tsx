"use client";

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { formatarMoedaInput } from "@/lib/format";

/** Campo de valor em reais: digita só números e a máscara monta "1.234,56" */
export function MoedaInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "0,00",
  invalido,
}: {
  id?: string;
  value: string;
  onChange: (valor: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalido?: boolean;
}) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>R$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        inputMode="numeric"
        placeholder={placeholder}
        aria-invalid={invalido}
        value={value}
        onChange={(e) => onChange(formatarMoedaInput(e.target.value))}
        onBlur={onBlur}
      />
    </InputGroup>
  );
}
