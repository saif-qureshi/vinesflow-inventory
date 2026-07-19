"use client";

import { useSession } from "@/hooks/useSession";
import { dialFor } from "@/lib/countries";
import { MaskedInput } from "./MaskedInput";

interface PhoneFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function PhoneField({ value, onChange, placeholder }: PhoneFieldProps) {
  const { currentMembership } = useSession();
  const dial = dialFor(currentMembership?.organization.country);
  return (
    <MaskedInput
      mask={`${dial} 000 0000000`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      inputMode="tel"
    />
  );
}
