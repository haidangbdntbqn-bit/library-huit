import type { ReactNode } from "react";

export default function PageHeader({ title, subtitle, extra }: { title: string; subtitle?: ReactNode; extra?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="muted">{subtitle}</div>}
      </div>
      {extra && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{extra}</div>}
    </div>
  );
}
