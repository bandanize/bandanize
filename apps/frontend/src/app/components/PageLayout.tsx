import React from 'react';

interface PageLayoutProps {
  compactHeader?: boolean;
  children: React.ReactNode;
  headerContent: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function PageLayout({ children, headerContent, className = "", headerClassName = "", compactHeader = false }: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-background relative ${className}`}>
      <header className={`${compactHeader ? "min-h-[72px] pb-2" : "min-h-[84px]"} pt-[env(safe-area-inset-top)] bg-card/80 border-b border-white/[0.06] backdrop-blur-xl flex flex-col justify-center w-full ${headerClassName}`}>
        {headerContent}
      </header>
      <main className="bg-[radial-gradient(ellipse_at_top,rgba(163,230,53,0.025),transparent_60%)]">
        {children}
      </main>
    </div>
  );
}
