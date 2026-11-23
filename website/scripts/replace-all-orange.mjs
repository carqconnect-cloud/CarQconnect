import fs from "fs";
import path from "path";

const EXT = /\.(css|tsx|ts|jsx|js|html)$/i;
const SKIP = /(node_modules|\.next|\.git|dist|build|coverage|package-lock|scripts|public[\\/]google-play\.svg)/;

const replacements = [
  // Page Header & Section radial/linear gradients with peach/orange
  [
    /radial-gradient\(60%\s*120%\s*at\s*90%\s*0%,\s*rgba\(255,\s*106,\s*0,\s*\.?28\)\s*0%,\s*rgba\(255,\s*106,\s*0,\s*0\)\s*62%\),\s*linear-gradient\(180deg,\s*#fff1e3(?:\s*0%)?,\s*#f7f9fc(?:\s*100%)?\)/gi,
    "var(--bg-gradient)"
  ],
  [
    /radial-gradient\(60%\s*120%\s*at\s*90%\s*0%,\s*rgba\(255,106,0,0\.28\),\s*rgba\(255,106,0,0\)\s*62%\),\s*linear-gradient\(180deg,\s*#fff1e3,\s*#f7f9fc\)/gi,
    "var(--bg-gradient)"
  ],
  [
    /linear-gradient\(180deg,\s*#fff1e3(?:\s*0%)?,\s*#f7f9fc(?:\s*100%)?\)/gi,
    "var(--bg-gradient)"
  ],
  [
    /linear-gradient\(180deg,\s*#fff1e3,\s*#f7f9fc\)/gi,
    "var(--bg-gradient)"
  ],

  // Specific buttons / gradients
  [/linear-gradient\(90deg,\s*#FF7A1A,\s*#FF5A00\)/gi, "linear-gradient(90deg, #1769FF, #0F57DB)"],
  [/linear-gradient\(90deg,\s*#ff5a14,\s*#ff3d00\)/gi, "linear-gradient(90deg, #1769FF, #0F57DB)"],
  [/from-\[#FF7A1A\]\s+to-\[#FF5A00\]/gi, "from-[#1769FF] to-[#0F57DB]"],
  [/from-\[#FF5A00\]\s+to-\[#FF8A3D\]/gi, "from-[#1769FF] to-[#0F57DB]"],
  [/from-white\s+to-\[#fff2e8\]/gi, "from-white to-[#EAF1FF]"],

  // Hovers
  [/hover:bg-\[#ff7226\]/gi, "hover:bg-[#0F57DB]"],
  [/hover:bg-\[#FF7226\]/gi, "hover:bg-[#0F57DB]"],
  [/hover:bg-\[#e04e00\]/gi, "hover:bg-[#0F57DB]"],
  [/hover:bg-\[#E04E00\]/gi, "hover:bg-[#0F57DB]"],
  [/hover:bg-\[#e04400\]/gi, "hover:bg-[#0F57DB]"],
  [/hover:bg-\[#ff7a26\]/gi, "hover:bg-[#0F57DB]"],
  [/hover:bg-\[#ff8a2b\]/gi, "hover:bg-[#0F57DB]"],
  [/hover:text-\[#ff7226\]/gi, "hover:text-[#0F57DB]"],
  [/hover:text-\[#ff6a00\]/gi, "hover:text-[#1769FF]"],
  [/hover:text-\[#FF5A00\]/gi, "hover:text-[#1769FF]"],
  [/hover:border-\[#FF5A00\]/gi, "hover:border-[#1769FF]"],
  [/hover:border-\[#ff6a00\]/gi, "hover:border-[#1769FF]"],
  [/hover:border-\[#ff4d00\]/gi, "hover:border-[#1769FF]"],

  // Peach & light orange tints -> var(--primary-soft) / #EAF1FF
  [/#ffebdd/gi, "#EAF1FF"],
  [/#ffe6d2/gi, "#EAF1FF"],
  [/#fff1e6/gi, "#EAF1FF"],
  [/#fff2e8/gi, "#EAF1FF"],
  [/#fff6ef/gi, "#EAF1FF"],
  [/#fff1e3/gi, "#EAF1FF"],
  [/#ffe4d1/gi, "#CFE0FF"],
  [/#ffd2b0/gi, "#CFE0FF"],
  [/#ffe8d9/gi, "#EAF1FF"],
  [/#ffe9dc/gi, "#EAF1FF"],
  [/#faf3e9/gi, "#F7F9FC"],
  [/#efe5d6/gi, "#E4E7EC"],

  // RGBA glows
  [/rgba\(\s*255\s*,\s*90\s*,\s*0\s*,/gi, "rgba(23, 105, 255, "],
  [/rgba\(\s*255\s*,\s*106\s*,\s*0\s*,/gi, "rgba(23, 105, 255, "],
  [/rgba\(\s*255\s*,\s*77\s*,\s*13\s*,/gi, "rgba(23, 105, 255, "],
  [/rgba\(\s*255\s*,\s*77\s*,\s*0\s*,/gi, "rgba(23, 105, 255, "],
  [/rgba\(\s*255\s*,\s*138\s*,\s*92\s*,/gi, "rgba(23, 105, 255, "],
  [/rgba\(\s*255\s*,\s*122\s*,\s*26\s*,/gi, "rgba(23, 105, 255, "],
  [/rgba\(\s*255\s*,\s*113\s*,\s*64\s*,/gi, "rgba(23, 105, 255, "],
  [/rgba\(255,90,0,/gi, "rgba(23,105,255,"],
  [/rgba\(255,106,0,/gi, "rgba(23,105,255,"],
  [/rgba\(255,77,13,/gi, "rgba(23,105,255,"],
  [/rgba\(255,77,0,/gi, "rgba(23,105,255,"],
  [/rgba\(255,138,92,/gi, "rgba(23,105,255,"],

  // Specific Orange Hexes
  [/#ff5a00\b/gi, "#1769FF"],
  [/#FF5A00\b/gi, "#1769FF"],
  [/#ff6a00\b/gi, "#1769FF"],
  [/#FF6A00\b/gi, "#1769FF"],
  [/#ff4d00\b/gi, "#1769FF"],
  [/#FF4D00\b/gi, "#1769FF"],
  [/#ff4d0d\b/gi, "#1769FF"],
  [/#FF4D0D\b/gi, "#1769FF"],
  [/#ff7226\b/gi, "#1769FF"],
  [/#FF7226\b/gi, "#1769FF"],
  [/#ff7a1a\b/gi, "#1769FF"],
  [/#FF7A1A\b/gi, "#1769FF"],
  [/#ff8a3d\b/gi, "#1769FF"],
  [/#FF8A3D\b/gi, "#1769FF"],
  [/#ff8a2b\b/gi, "#1769FF"],
  [/#FF8A2B\b/gi, "#1769FF"],
  [/#ff7a26\b/gi, "#1769FF"],
  [/#ff7040\b/gi, "#1769FF"],
  [/#ff7140\b/gi, "#1769FF"],
  [/#e04e00\b/gi, "#0F57DB"],
  [/#e04400\b/gi, "#0F57DB"],
  [/#c94300\b/gi, "#0B46B8"],
  [/#C94300\b/gi, "#0B46B8"],
  [/#ff3d00\b/gi, "#1769FF"],
  [/#FF3D00\b/gi, "#1769FF"],

  // Tailwind class replacements
  [/\btext-orange-500\b/g, "text-[#1769FF]"],
  [/\btext-orange-600\b/g, "text-[#1769FF]"],
  [/\bbg-orange-500\b/g, "bg-[#1769FF]"],
  [/\bbg-orange-600\b/g, "bg-[#0F57DB]"],
  [/\bbg-orange-50\b/g, "bg-[#EAF1FF]"],
  [/\bbg-orange-100\b/g, "bg-[#EAF1FF]"],
  [/\bborder-orange-200\b/g, "border-[#CFE0FF]"],
  [/\bborder-orange-300\b/g, "border-[#A3B7FF]"],
  [/\bborder-orange-500\b/g, "border-[#1769FF]"],
  [/\bring-orange-500\b/g, "ring-[#1769FF]"],
  [/\btext-orange\b/g, "text-[#1769FF]"],
  [/\bbg-orange\b/g, "bg-[#1769FF]"],
  [/\bborder-orange\b/g, "border-[#1769FF]"],
  [/\bhover:border-orange\b/g, "hover:border-[#1769FF]"],
  [/\bhover:text-orange\b/g, "hover:text-[#1769FF]"],
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let original = content;

  for (const [pattern, repl] of replacements) {
    content = content.replace(pattern, repl);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated: ${filePath}`);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (SKIP.test(fullPath)) continue;
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (EXT.test(entry.name)) {
      processFile(fullPath);
    }
  }
}

console.log("Starting orange replacement...");
walk("./app");
walk("./components");
console.log("Finished orange replacement.");
