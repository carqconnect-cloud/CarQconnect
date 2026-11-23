import puppeteer from "puppeteer";
import path from "path";

const ARTIFACTS_DIR = "C:\\Users\\mrume\\.gemini\\antigravity\\brain\\a27751cd-461b-4510-b2dd-c5c9f8a5575a";

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  // Desktop 1536px Hero on 3001
  await page.setViewport({ width: 1536, height: 900 });
  await page.goto("http://localhost:3001", { waitUntil: "networkidle2", timeout: 25000 });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "hero-desktop-1536.png"),
    clip: { x: 0, y: 0, width: 1536, height: 850 }
  });

  await browser.close();
  console.log("Screenshots captured successfully from 3001!");
}

run().catch(console.error);
