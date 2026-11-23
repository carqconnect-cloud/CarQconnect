import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  backButton,
  children,
  className = "",
  style,
}: {
  eyebrow?: string;
  backButton?: ReactNode;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const defaultPt = backButton
    ? "pt-[var(--nav-h,64px)] md:pt-[var(--nav-h,76px)]"
    : "pt-[max(env(safe-area-inset-top),clamp(80px,10vw,120px))]";

  return (
    <section 
      className={`relative overflow-hidden ${defaultPt} pb-8 md:pb-12 ${className}`}
      style={{ background: 'var(--bg-gradient)', ...style }}
    >
      <div className="container-page relative z-10 flex flex-col items-start text-left font-display">
        {backButton && <div className="py-5 md:py-6">{backButton}</div>}
        {eyebrow && (
          <div className="flex items-center gap-3.5 mb-3 sm:mb-4">
            <div className="w-8 h-[2px] bg-[#1769FF]" />
            <span className="text-[clamp(11px,1.8vw,13px)] font-bold tracking-[0.16em] text-[#1769FF] uppercase">
              {eyebrow}
            </span>
          </div>
        )}
        <h1 
          className="font-display font-extrabold text-[#0B1B3F] max-w-[800px] mb-4 sm:mb-5"
          style={{ fontSize: 'clamp(28px, 4.2vw, 46px)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-[#56637F] max-w-[720px] text-[15px] sm:text-[17px] leading-relaxed">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
