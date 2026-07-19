"use client";

import { Input } from "antd";
import type { InputProps } from "antd";
import { IMask } from "react-imask";

export const MASKS = {
  ntn: "0000000-0",
  cnic: "00000-0000000-0",
  strn: "0000000000000",
} as const;

interface MaskedInputProps extends Omit<InputProps, "value" | "onChange"> {
  mask: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function MaskedInput({ mask, value = "", onChange, ...rest }: MaskedInputProps) {
  return (
    <Input
      {...rest}
      value={value}
      onChange={(e) => {
        const masked = IMask.createMask({ mask });
        masked.value = e.target.value;
        onChange?.(masked.value);
      }}
    />
  );
}
