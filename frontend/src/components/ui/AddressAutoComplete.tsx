"use client";

import { useRef, useState } from "react";
import { App, AutoComplete } from "antd";
import { LocateFixed } from "lucide-react";

import type { Address } from "@/types";
import { AddressField } from "./AddressField";
import { Button } from "./Button";

interface PhotonProps {
  [key: string]: string;
}

interface Suggestion {
  value: string;
  address: Address;
}

function hasData(a?: Address) {
  return !!a && Object.values(a).some((v) => v);
}

function toAddress(p: PhotonProps): Address {
  return {
    line1: [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || "",
    line2: "",
    city: p.city || p.town || p.village || p.county || "",
    state: p.state || "",
    postal_code: p.postcode || "",
    country: p.country || "",
  };
}

async function searchAddresses(query: string): Promise<Suggestion[]> {
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`);
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: { properties?: PhotonProps }[] };
    return (data.features ?? []).map((f, i) => {
      const p = f.properties ?? {};
      const label = [p.name, p.street, p.city || p.town, p.state, p.country].filter(Boolean).join(", ");
      return { value: `${label}${i ? ` (${i + 1})` : ""}`, address: toAddress(p) };
    });
  } catch {
    return [];
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<Address | null> {
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: { properties?: PhotonProps }[] };
    const p = data.features?.[0]?.properties;
    return p ? toAddress(p) : null;
  } catch {
    return null;
  }
}

interface AddressAutoCompleteProps {
  value?: Address;
  onChange?: (value: Address) => void;
  disabled?: boolean;
}

export function AddressAutoComplete({ value, onChange, disabled }: AddressAutoCompleteProps) {
  const { message } = App.useApp();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [manual, setManual] = useState(() => hasData(value));
  if (!manual && hasData(value)) setManual(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onSearch = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) {
      setOptions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      setOptions(await searchAddresses(q));
      setLoading(false);
    }, 350);
  };

  const onSelect = (val: string) => {
    const picked = options.find((o) => o.value === val);
    if (!picked) return;
    onChange?.({ ...value, ...picked.address });
    setQuery(val);
    setManual(true);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      message.error("Geolocation is not supported by this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        if (addr) {
          onChange?.({ ...value, ...addr });
          setManual(true);
        } else {
          message.error("Couldn't resolve your current address");
        }
      },
      () => {
        setLocating(false);
        message.error("Location permission denied");
      },
      { timeout: 10000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <AutoComplete
          value={query}
          options={options.map((o) => ({ value: o.value }))}
          onSearch={onSearch}
          onSelect={onSelect}
          onChange={setQuery}
          disabled={disabled}
          allowClear
          className="!w-full flex-1"
          placeholder="Search for an address…"
          notFoundContent={
            loading ? (
              "Searching…"
            ) : query.trim().length >= 3 ? (
              <div className="py-1">
                <div className="mb-1 text-gray-500">No address found.</div>
                <Button type="link" className="!px-0" onMouseDown={(e) => e.preventDefault()} onClick={() => setManual(true)}>
                  Enter manually
                </Button>
              </div>
            ) : null
          }
        />
        <Button
          icon={<LocateFixed size={16} />}
          loading={locating}
          onClick={useMyLocation}
          disabled={disabled}
        >
          Current location
        </Button>
      </div>
      {manual && <AddressField value={value} onChange={onChange} disabled={disabled} />}
    </div>
  );
}
