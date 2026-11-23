import fs from "fs";

let code = fs.readFileSync("c:/Vortex/Fioner/frontend/components/qr/hero-qr-scanner.tsx", "utf8");

// Update laser matrix
code = code.replace(/<g transform="matrix\([^"]+\)" clipPath="url\(#qrClip\)">/, '<g transform="matrix(85 71 -85 71 588 517)" clipPath="url(#qrClip)">');

fs.writeFileSync("c:/Vortex/Fioner/frontend/components/qr/hero-qr-scanner.tsx", code, "utf8");
console.log("Updated laser matrix in hero-qr-scanner.tsx");
