import fs from "fs";
import path from "path";

const SKIP = /(node_modules|\.next|\.git|dist|build)/;
const EXT = /\.(css|tsx|jsx)$/;

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (SKIP.test(p)) continue;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (EXT.test(p)) {
      const lines = fs.readFileSync(p, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/(?:boxShadow|shadow|box-shadow).*?(?:glow|rgba\(\s*23,\s*105,\s*255|primary-glow)/i.test(line)) {
          console.log(`${p}:${i+1} | ${line.trim()}`);
        }
      });
    }
  }
}

walk(".");
