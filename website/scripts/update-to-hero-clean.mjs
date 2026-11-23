import fs from "fs";

let code = fs.readFileSync("c:/Vortex/Fioner/frontend/components/qr/hero-qr-scanner.tsx", "utf8");

// 1. Update image href to hero-clean-blue.png
code = code.replaceAll('/hero-blue-4x.png', '/hero-clean-blue.png');
code = code.replaceAll('/Futuristic_Cube_Device_Showcase_edited.png', '/hero-clean-blue.png');

// 2. Ensure dimensions and viewBox are 1924 1088
code = code.replace(/viewBox="[^"]+"/, 'viewBox="0 0 1924 1088"');
code = code.replace(/width="\d+"\s+height="\d+"\s+fill="url\(#fade-mask-mobile\)"/, 'width="1924" height="1088" fill="url(#fade-mask-mobile)"');
code = code.replaceAll('width="1669"', 'width="1924"');
code = code.replaceAll('height="942"', 'height="1088"');

// 3. GPS tile matrix: centered at (202, 408)
code = code.replace(/id="gps-device-tile"\s+transform="[^"]+"/, 'id="gps-device-tile" transform="matrix(80 48 -80 48 202 360)"');

// 4. Laser beam matrix: exact for new QR at (588, 524)
const oldScan = code.substring(code.indexOf('{/* QR scanner laser line */}'), code.indexOf('{debug && ('));
const newScan = `{/* QR scanner laser line */}
      <g transform="matrix(78 64 -78 64 588 524)" clipPath="url(#qrClip)">
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 -0.05; 0 1.05; 0 1.05; 0 -0.05"
            keyTimes="0; 0.48; 0.52; 1"
            dur="2.4s"
            repeatCount="indefinite"
          />
          {/* Subtle laser glow */}
          <rect x="0" y="-0.03" width="1" height="0.06" fill="#1769FF" opacity="0.35" />
          {/* Crisp laser beam */}
          <rect x="0" y="-0.012" width="1" height="0.024" fill="#5B93FF" opacity="0.8" />
          <rect x="0" y="-0.006" width="1" height="0.012" fill="#FFFFFF" opacity="0.95" />
        </g>
      </g>

      `;
code = code.replace(oldScan, newScan);

fs.writeFileSync("c:/Vortex/Fioner/frontend/components/qr/hero-qr-scanner.tsx", code, "utf8");
console.log("Successfully updated to hero-clean-blue.png in hero-qr-scanner.tsx");
