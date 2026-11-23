import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");

function replaceInFile(relFile, replacements) {
  const fullPath = path.join(FRONTEND_DIR, relFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`[ERROR] File not found: ${fullPath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, "utf8");
  let modified = false;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      modified = true;
    } else {
      console.warn(`[WARN] Not found in ${relFile}: ${from.slice(0, 40)}...`);
    }
  }
  if (modified) {
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`[UPDATED] ${relFile}`);
  }
}

// 1. feature-showcase.tsx
replaceInFile("components/sections/feature-showcase.tsx", [
  [
    "boxShadow: isActive ? '0 8px 22px rgba(23,105,255,.35)' : 'none'",
    "boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'"
  ],
  [
    "background: isActive ? 'linear-gradient(90deg, #1769FF, #0F57DB)' : 'transparent'",
    "background: isActive ? '#1769FF' : 'transparent'"
  ],
  [
    "background: 'linear-gradient(90deg, #1769FF, #0F57DB)'",
    "background: '#1769FF'"
  ],
  [
    "boxShadow: '0 10px 26px rgba(23,105,255,.35)'",
    "boxShadow: '0 2px 8px rgba(0,0,0,0.18)'"
  ]
]);

// 2. components/ui/button.tsx
replaceInFile("components/ui/button.tsx", [
  [
    '"bg-[#1769FF] text-white hover:bg-[#0F57DB] shadow-[0_4px_20px_rgba(23, 105, 255, 0.35)] transition-all duration-300"',
    '"bg-[#1769FF] text-white hover:bg-[#0F57DB] shadow-sm hover:shadow transition-all duration-200"'
  ]
]);

// 3. app/(site)/globals.css
replaceInFile("app/(site)/globals.css", [
  [
    "--primary-glow: rgba(23, 105, 255, 0.35);",
    "--primary-glow: rgba(23, 105, 255, 0.12);"
  ],
  [
    "box-shadow: 0 4px 14px var(--primary-glow);",
    "box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);"
  ],
  [
    "box-shadow: 0 6px 20px rgba(23, 105, 255, 0.45);",
    "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);"
  ],
  [
    "filter: drop-shadow(0 6px 18px rgba(23, 105, 255, 0.35));",
    "filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.12));"
  ]
]);

// 4. components/sections/final-cta.tsx
replaceInFile("components/sections/final-cta.tsx", [
  [
    "shadow-[0_10px_30px_rgba(23,105,255,0.35)]",
    "shadow-sm hover:shadow"
  ]
]);

// 5. components/sections/how-it-works-overview.tsx
replaceInFile("components/sections/how-it-works-overview.tsx", [
  [
    "shadow-[0_0_24px_rgba(23,105,255,0.4)]",
    "shadow-sm"
  ]
]);

// 6. components/sections/pillar-strip.tsx
replaceInFile("components/sections/pillar-strip.tsx", [
  [
    'shadow-[0_4px_20px_rgba(23, 105, 255, 0.35)] transition-all duration-300 hover:bg-[#0F57DB] hover:shadow-[0_6px_25px_rgba(23, 105, 255, 0.5)]',
    'shadow-sm transition-all duration-200 hover:bg-[#0F57DB] hover:shadow'
  ],
  [
    'shadow-[0_4px_20px_rgba(23, 105, 255, 0.35)]',
    'shadow-sm'
  ],
  [
    'shadow-[0_0_25px_rgba(23, 105, 255, 0.4)]',
    'shadow-sm'
  ]
]);

// 7. app/(site)/contact/client-page.tsx
replaceInFile("app/(site)/contact/client-page.tsx", [
  [
    "shadow-[0_10px_30px_rgba(23, 105, 255, 0.3)]",
    "shadow-sm hover:shadow"
  ]
]);

// 8. app/(site)/gps/page.tsx
replaceInFile("app/(site)/gps/page.tsx", [
  [
    "shadow-[0_10px_30px_rgba(23, 105, 255, .3)]",
    "shadow-sm hover:shadow"
  ],
  [
    'fill="rgba(255,200,87,0.06)" stroke="#FFC857"',
    'fill="rgba(23,105,255,0.06)" stroke="#1769FF"'
  ],
  [
    'border-[rgba(255,200,87,0.35)] bg-[rgba(255,200,87,0.1)]',
    'border-[rgba(23,105,255,0.35)] bg-[rgba(23,105,255,0.1)]'
  ],
  [
    'bg-[#FFC857]',
    'bg-[#1769FF]'
  ]
]);

// 9. app/(site)/marketplace/client-page.tsx
replaceInFile("app/(site)/marketplace/client-page.tsx", [
  [
    "shadow-[0_8px_20px_rgba(23, 105, 255, 0.25)]",
    "shadow-sm hover:shadow"
  ],
  [
    "hover:bg-[#ff7b1a]",
    "hover:bg-[#0F57DB]"
  ],
  [
    "text-[#1a0b00]",
    "text-white"
  ],
  [
    "text-[#c2410c]",
    "text-[#1769FF]"
  ],
  [
    "hover:border-[#c2410c] hover:text-[#c2410c]",
    "hover:border-[#1769FF] hover:text-[#1769FF]"
  ],
  [
    "bg-[#fff3e6]",
    "bg-[#f7f9fc]"
  ],
  [
    "border-[#f1d9c4]",
    "border-[#CFE0FF]"
  ]
]);

// 10. app/(site)/membership/page.tsx
replaceInFile("app/(site)/membership/page.tsx", [
  [
    "shadow-[0_4px_14px_rgba(23, 105, 255, 0.3)]",
    "shadow-sm hover:shadow"
  ],
  [
    "shadow-[0_6px_16px_rgba(23, 105, 255, 0.3)]",
    "shadow-sm hover:shadow"
  ],
  [
    "text-[#ffb042]",
    "text-[#1769FF]"
  ]
]);

// 11. app/(site)/qr-safety/page.tsx
replaceInFile("app/(site)/qr-safety/page.tsx", [
  [
    "shadow-[0_10px_30px_rgba(23, 105, 255, .3)]",
    "shadow-sm hover:shadow"
  ]
]);

// 12. app/(site)/support/page.tsx
replaceInFile("app/(site)/support/page.tsx", [
  [
    "shadow-[0_8px_20px_rgba(23, 105, 255, 0.25)]",
    "shadow-sm hover:shadow"
  ],
  [
    "text-[#1a0b00]",
    "text-white"
  ],
  [
    "hover:bg-[#ff7b1a]",
    "hover:bg-[#0F57DB]"
  ],
  [
    "text-[#c2410c]",
    "text-[#1769FF]"
  ],
  [
    "bg-[#2a170b] text-[#f7d8c6]",
    "bg-[#1A2234] text-[#CFE0FF]"
  ]
]);

// 13. components/footer/footer.tsx
replaceInFile("components/footer/footer.tsx", [
  [
    "shadow-[0_8px_22px_rgba(23,105,255,0.35)]",
    "shadow-sm"
  ]
]);

// 14. components/sections/faq-accordion.tsx
replaceInFile("components/sections/faq-accordion.tsx", [
  [
    'variant === "dark" ? "text-[#ff784c]"',
    'variant === "dark" ? "text-[#1769FF]"'
  ]
]);

// 15. components/sections/faq-section.tsx
replaceInFile("components/sections/faq-section.tsx", [
  [
    'border-[#ff6b37]/35 bg-[#1769FF]/10 px-3 py-1.5 text-[#ff7a4a]',
    'border-[#1769FF]/35 bg-[#1769FF]/10 px-3 py-1.5 text-[#1769FF]'
  ]
]);

// 16. components/qr/hero-qr-scanner.tsx
replaceInFile("components/qr/hero-qr-scanner.tsx", [
  [
    'stopColor="#ff6a1f"',
    'stopColor="#1769FF"'
  ]
]);

// 17. components/qr/qr-scanner-demo.tsx
replaceInFile("components/qr/qr-scanner-demo.tsx", [
  [
    "selectedAction ? '#FFB48A'",
    "selectedAction ? '#CFE0FF'"
  ]
]);

// 18. components/product/trip-planner-demo.tsx
replaceInFile("components/product/trip-planner-demo.tsx", [
  [
    "style={{ color: '#d9500a' }}",
    "style={{ color: '#1769FF' }}"
  ]
]);

// 20. components/sections/pillar-strip.tsx (clean up remaining amber/orange gradient pills)
replaceInFile("components/sections/pillar-strip.tsx", [
  [
    'accentColor: "from-orange-500 to-amber-500"',
    'accentColor: "from-[#1769FF] to-[#0F57DB]"'
  ],
  [
    'accentColor: "from-amber-500 to-orange-500"',
    'accentColor: "from-[#1769FF] to-[#0F57DB]"'
  ],
  [
    'glowColor: "rgba(245, 158, 11, 0.25)"',
    'glowColor: "rgba(23, 105, 255, 0.15)"'
  ],
  [
    'to-amber-500/10',
    'to-[#1769FF]/10'
  ]
]);

console.log("Fixes completed successfully!");
