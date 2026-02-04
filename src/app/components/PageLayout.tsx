import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  headerContent: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function PageLayout({ children, headerContent, className = "", headerClassName = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-[#0B0B0C] relative ${className}`}>
      <header className={`min-h-[84px] pt-[env(safe-area-inset-top)] bg-[#151518] border-b border-black/10 shadow-[0px_1px_3px_rgba(0,0,0,0.1)] flex flex-col justify-center w-full ${headerClassName}`}>
        {headerContent}
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}
