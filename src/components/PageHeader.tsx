import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 space-y-2">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      {children && <div className="max-w-2xl text-muted-foreground">{children}</div>}
    </header>
  );
}
