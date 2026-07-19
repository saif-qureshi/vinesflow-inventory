"use client";

import { Button } from "antd";

export function SettingRow({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-gray-100 py-6 last:border-0 md:grid-cols-[240px_minmax(0,1fr)] md:gap-8 dark:border-slate-800">
      <div>
        <div className={`text-sm font-medium ${required ? "text-rose-600" : "text-gray-700 dark:text-gray-200"}`}>
          {label}
          {required && " *"}
        </div>
        {help && <p className="mt-1 text-xs text-gray-400">{help}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SettingsFooter({
  onSave,
  onCancel,
  saving,
  disabled,
}: {
  onSave: () => void;
  onCancel?: () => void;
  saving?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="sticky bottom-0 -mx-8 mt-4 flex gap-3 border-t border-gray-100 bg-[var(--settings-content)] px-8 py-3 dark:border-slate-800">
      <Button type="primary" onClick={onSave} loading={saving} disabled={disabled}>
        Save
      </Button>
      {onCancel && <Button onClick={onCancel}>Cancel</Button>}
    </div>
  );
}
