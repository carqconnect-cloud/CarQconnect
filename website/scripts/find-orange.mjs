import fs from "fs"; import path from "path";
const ROOT = process.argv[2] || ".";
const EXT = /\.(css|scss|sass|less|tsx?|jsx?|mjs|cjs|svg|html|mdx?|json)$/i;
const SKIP = /(node_modules|\.next|\.git|[\\/]dist[\\/]|[\\/]build[\\/]|coverage|package-lock|pnpm-lock|yarn\.lock|scripts)/;
const hex2rgb = h => { h = h.slice(1); if (h.length <= 4) h = [...h].map(c => c + c).join(""); return [0,2,4].map(i => parseInt(h.slice(i, i+2), 16)); };
const rgb2hsl = ([r,g,b]) => { r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn, l=(mx+mn)/2; if(!d) return [0,0,l]; const s=d/(1-Math.abs(2*l-1)); let h = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4; return [(h*60+360)%360, s, l]; };
const orange = ([h,s,l]) => h>=5 && h<=50 && s>=.25 && l>=.15 && l<=.98;
const checks = [
  [/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b/gi, m => orange(rgb2hsl(hex2rgb(m[0])))],
  [/%23([0-9a-f]{6}|[0-9a-f]{3})\b/gi, m => orange(rgb2hsl(hex2rgb("#" + m[1])))],
  [/rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/gi, m => orange(rgb2hsl([+m[1], +m[2], +m[3]]))],
  [/hsla?\(\s*(\d+(?:\.\d+)?)(?:deg)?[\s,]+(\d+(?:\.\d+)?)%[\s,]+(\d+(?:\.\d+)?)%/gi, m => orange([+m[1], +m[2]/100, +m[3]/100])],
  [/oklch\(\s*[\d.%]+\s+([\d.]+)\s+([\d.]+)/gi, m => +m[1] >= .06 && +m[2] >= 25 && +m[2] <= 85],
  [/\b(?:bg|text|border|ring|from|via|to|fill|stroke|shadow|outline|decoration|accent|caret|divide)-(?:orange|amber|yellow)[\w\/-]*/gi, () => true],
  [/\b(?:orange|darkorange|orangered|coral|tomato|peachpuff|papayawhip|sandybrown|salmon|lightsalmon|chocolate|sienna)\b/gi, () => true],
];
let count = 0;
const scan = p => fs.readFileSync(p, "utf8").split("\n").forEach((line, i) => {
  for (const [re, test] of checks) { re.lastIndex = 0; let m;
    while ((m = re.exec(line))) if (test(m)) { count++; console.log(`${p}:${i+1}  ${m[0]}  | ${line.trim().slice(0,120)}`); } }
});
const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (SKIP.test(p)) continue;
  const s = fs.statSync(p); if (s.isDirectory()) walk(p); else if (EXT.test(p)) scan(p); } };
walk(ROOT); console.log(`\nTotal orange matches: ${count}`);
