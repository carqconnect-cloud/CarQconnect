import fs from "fs";

let code = fs.readFileSync("c:/Vortex/Fioner/frontend/components/qr/hero-qr-scanner.tsx", "utf8");

// 1. Update viewBox and dimensions
code = code.replace('viewBox="0 0 1669 942"', 'viewBox="0 0 1924 1088"');
code = code.replace('width="1669" height="942" fill="url(#fade-mask-mobile)"', 'width="1924" height="1088" fill="url(#fade-mask-mobile)"');
code = code.replaceAll('width="1669"', 'width="1924"');
code = code.replaceAll('height="942"', 'height="1088"');

// 2. GPS tile matrix
code = code.replace('transform="matrix(76 45.6 -76 45.6 186 306.4)"', 'transform="matrix(80 48 -80 48 202 360)"');

// 3. QR Laser scanner
const oldScan = code.substring(code.indexOf('{/* QR scanner laser line */}'), code.indexOf('{debug && ('));
const newScan = `{/* QR scanner laser line */}
      <g transform="matrix(88 69 -96 69 589 519)" clipPath="url(#qrClip)">
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 -0.05; 0 1.05; 0 1.05; 0 -0.05"
            keyTimes="0; 0.48; 0.52; 1"
            dur="2.4s"
            repeatCount="indefinite"
          />
          {/* Subtle soft laser aura */}
          <rect x="0" y="-0.03" width="1" height="0.06" fill="#1769FF" opacity="0.35" />
          {/* Intense thin glowing laser beam */}
          <rect x="0" y="-0.015" width="1" height="0.03" fill="#5B93FF" opacity="0.8" />
          <rect x="0" y="-0.008" width="1" height="0.016" fill="#FFFFFF" opacity="0.95" />
        </g>
      </g>

      `;
code = code.replace(oldScan, newScan);

fs.writeFileSync("c:/Vortex/Fioner/frontend/components/qr/hero-qr-scanner.tsx", code, "utf8");
console.log("Successfully updated hero-qr-scanner.tsx");
