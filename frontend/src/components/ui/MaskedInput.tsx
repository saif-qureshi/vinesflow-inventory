"use client";

import type { Ref } from "react";
import { Input } from "antd";
import type { InputProps, InputRef } from "antd";
import { IMaskMixin } from "react-imask";

export const MASKS = {
  ntn: "0000000-0",
  cnic: "00000-0000000-0",
  strn: "0000000000000",
} as const;

const IMaskedAntInput = IMaskMixin(({ inputRef, ...props }: { inputRef: Ref<HTMLInputElement> }) => (
  <Input
    {...(props as InputProps)}
    ref={(node: InputRef | null) => {
      const el = node?.input ?? null;
      if (typeof inputRef === "function") inputRef(el);
      else if (inputRef) (inputRef as { current: HTMLInputElement | null }).current = el;
    }}
  />
));

interface MaskedInputProps extends Omit<InputProps, "value" | "onChange"> {
  mask: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function MaskedInput({ mask, value = "", onChange, ...rest }: MaskedInputProps) {
  return (
    <IMaskedAntInput
      mask={mask}
      value={value}
      onAccept={(val: string) => onChange?.(val)}
      {...rest}
    />
  );
}
