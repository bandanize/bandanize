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
      <header className={`${compactHeader ? "pt-[max(8px,env(safe-area-inset-top))] pb-2" : "min-h-[84px] pt-[env(safe-area-inset-top)] bg-card/80 border-b border-white/[0.06]"} flex flex-col justify-center w-full ${headerClassName}`}>
        {compactHeader ? <div className="w-[calc(100%-16px)] sm:w-[calc(100%-32px)] max-w-[1280px] mx-auto min-h-14 py-2 rounded-2xl border border-white/[0.09] bg-gradient-to-b from-card to-card/80 shadow-[0_4px_20px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          {headerContent}
        </div> : headerContent}
      </header>
      <main className="bg-[radial-gradient(ellipse_at_top,rgba(163,230,53,0.025),transparent_60%)]">
        {children}
      </main>
    </div>
  );
}
