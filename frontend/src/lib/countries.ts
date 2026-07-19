export interface Country {
  code: string;
  name: string;
  dial: string;
}

export const COUNTRIES: Country[] = [
  { code: "PK", name: "Pakistan", dial: "+92" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "SA", name: "Saudi Arabia", dial: "+966" },
  { code: "QA", name: "Qatar", dial: "+974" },
  { code: "OM", name: "Oman", dial: "+968" },
  { code: "KW", name: "Kuwait", dial: "+965" },
  { code: "BH", name: "Bahrain", dial: "+973" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "IT", name: "Italy", dial: "+39" },
  { code: "ES", name: "Spain", dial: "+34" },
  { code: "NL", name: "Netherlands", dial: "+31" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "MY", name: "Malaysia", dial: "+60" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "ID", name: "Indonesia", dial: "+62" },
  { code: "BD", name: "Bangladesh", dial: "+880" },
  { code: "LK", name: "Sri Lanka", dial: "+94" },
  { code: "NP", name: "Nepal", dial: "+977" },
  { code: "AF", name: "Afghanistan", dial: "+93" },
  { code: "IR", name: "Iran", dial: "+98" },
  { code: "TR", name: "Turkey", dial: "+90" },
  { code: "EG", name: "Egypt", dial: "+20" },
  { code: "ZA", name: "South Africa", dial: "+27" },
  { code: "NG", name: "Nigeria", dial: "+234" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "RU", name: "Russia", dial: "+7" },
];

const BY_CODE: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

export function dialFor(code: string | null | undefined): string {
  return BY_CODE[code ?? ""]?.dial ?? "+92";
}
