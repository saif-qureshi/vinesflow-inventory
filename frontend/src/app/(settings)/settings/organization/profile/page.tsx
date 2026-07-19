"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { App, Input, PageHeader, Select, Tag, Typography } from "@/components/ui";
import { SettingRow, SettingsFooter } from "@/components/settings/SettingRow";
import { useCan, useSession } from "@/hooks/useSession";
import { useUpdateOrg } from "@/hooks/useOrg";
import { apiErrorMessage } from "@/lib/api";

const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR", "INR", "CAD", "AUD"].map((c) => ({ value: c, label: c }));
const INDUSTRIES = [
  "Agriculture", "Manufacturing", "Retail", "Wholesale", "Services", "Technology",
  "Construction", "Healthcare", "Education", "Hospitality", "Finance", "Other",
].map((i) => ({ value: i, label: i }));
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const FISCAL_OPTIONS = MONTHS.map((m, i) => ({ value: i + 1, label: `${m} – ${MONTHS[(i + 11) % 12]}` }));

export default function OrganizationProfilePage() {
  const { currentMembership } = useSession();
  const can = useCan();
  const { message } = App.useApp();
  const updateOrg = useUpdateOrg();

  const org = currentMembership?.organization;
  const canEdit = can("orgs:update");

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<string | undefined>();
  const [currency, setCurrency] = useState("PKR");
  const [fiscalMonth, setFiscalMonth] = useState(7);
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (!org) return;
    setName(org.name);
    setIndustry(org.industry ?? undefined);
    setCurrency(org.currency);
    setFiscalMonth(org.fiscal_year_start_month);
    setLogoUrl(org.logo_url ?? "");
  }, [org]);

  const startIdx = (fiscalMonth - 1 + 12) % 12;
  const fiscalPeriod = `1 ${MONTHS[startIdx]} – 30 ${MONTHS[(startIdx + 11) % 12]}`;

  const save = async () => {
    if (!name.trim()) {
      message.error("Organization name is required");
      return;
    }
    try {
      await updateOrg.mutateAsync({
        name,
        industry: industry ?? "",
        currency,
        fiscal_year_start_month: fiscalMonth,
        logo_url: logoUrl,
      });
      message.success("Organization updated");
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Organization Profile"
        description={org && <Tag className="!m-0" color="default">ID: {org.id} · {org.slug}</Tag>}
      />

      <div className="mt-2">
        <SettingRow label="Organization Logo" help="Shown on invoices and emails.">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Image src="/logo.svg" alt="Logo" width={44} height={44} />
              )}
            </div>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" disabled={!canEdit} className="max-w-sm" />
          </div>
        </SettingRow>

        <SettingRow label="Organization Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} className="max-w-md" />
        </SettingRow>

        <SettingRow label="Industry">
          <Select value={industry} onChange={setIndustry} options={INDUSTRIES} showSearch allowClear placeholder="Select industry" disabled={!canEdit} className="max-w-md !w-full md:!w-80" />
        </SettingRow>

        <SettingRow label="Base Currency" required help="Drives money formatting across the app.">
          <Select value={currency} onChange={setCurrency} options={CURRENCIES} showSearch disabled={!canEdit} className="!w-40" />
        </SettingRow>

        <SettingRow label="Fiscal Year" required>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={fiscalMonth} onChange={setFiscalMonth} options={FISCAL_OPTIONS} disabled={!canEdit} className="!w-56" />
            <Tag color="default" className="!m-0">Period: {fiscalPeriod}</Tag>
          </div>
        </SettingRow>

        {canEdit ? (
          <SettingsFooter onSave={save} saving={updateOrg.isPending} />
        ) : (
          <Typography.Paragraph type="secondary" className="!mt-4 !mb-0">
            You don&apos;t have permission to edit the organization.
          </Typography.Paragraph>
        )}
      </div>
    </div>
  );
}
