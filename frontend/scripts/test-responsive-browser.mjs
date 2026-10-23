import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_USER_DATA = path.resolve(process.cwd(), ".chrome_qa_profile");
const SCREENSHOTS_DIR = fs.existsSync(path.resolve(process.cwd(), "docs"))
  ? path.resolve(process.cwd(), "docs/screenshots")
  : path.resolve(process.cwd(), "../docs/screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = this.msgId++;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("==========================================================");
  console.log(" GAUSHILP OS — PHASE H RESPONSIVE BROWSER QA (HEADLESS CHROME)");
  console.log("==========================================================");

  // 1. Launch Chrome
  console.log("🚀 Spawning local Chrome headless with CDP on port 9222...");
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${TEMP_USER_DATA}`,
    "about:blank",
  ]);

  chromeProc.on("error", (err) => {
    console.error("Failed to spawn Chrome:", err);
  });

  // 2. Poll for debugger URL
  let webSocketDebuggerUrl = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9222/json/version");
      if (res.ok) {
        const data = await res.json();
        webSocketDebuggerUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch {
      await wait(300);
    }
  }

  if (!webSocketDebuggerUrl) {
    chromeProc.kill();
    throw new Error("Could not connect to Chrome debugging endpoint on port 9222");
  }

  console.log("✅ Connected to Chrome CDP:", webSocketDebuggerUrl);

  // Get available page targets
  const listRes = await fetch("http://127.0.0.1:9222/json/list");
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === "page") || targets[0];
  const pageWsUrl = pageTarget.webSocketDebuggerUrl;

  const client = new CDPClient(pageWsUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("DOM.enable");

  const testCases = [
    {
      name: "Mobile Storefront (375x812)",
      url: "http://localhost:3000/store/mitti-craft-studio",
      width: 375,
      height: 812,
      mobile: true,
      screenshot: "mobile-375-store.png",
    },
    {
      name: "Mobile Cart (390x844)",
      url: "http://localhost:3000/store/mitti-craft-studio/cart",
      width: 390,
      height: 844,
      mobile: true,
      screenshot: "mobile-390-cart.png",
    },
    {
      name: "Tablet Checkout (768x1024)",
      url: "http://localhost:3000/store/mitti-craft-studio/checkout",
      width: 768,
      height: 1024,
      mobile: false,
      screenshot: "tablet-768-checkout.png",
    },
    {
      name: "Desktop Seller Dashboard (1366x768)",
      url: "http://localhost:3000/seller/dashboard",
      width: 1366,
      height: 768,
      mobile: false,
      screenshot: "desktop-1366-seller.png",
    },
    {
      name: "Wide Desktop Super Admin Overview (1920x1080)",
      url: "http://localhost:3000/admin/overview",
      width: 1920,
      height: 1080,
      mobile: false,
      screenshot: "desktop-1920-admin.png",
    },
    {
      name: "Desktop Customer Account Hub (1366x768)",
      url: "http://localhost:3000/account",
      width: 1366,
      height: 768,
      mobile: false,
      screenshot: "desktop-1366-account.png",
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    console.log(`\n📌 Testing: ${tc.name} at ${tc.width}x${tc.height}`);
    
    // Set viewport
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: tc.width,
      height: tc.height,
      deviceScaleFactor: 1,
      mobile: tc.mobile,
    });

    // Navigate
    await client.send("Page.navigate", { url: tc.url });
    await wait(1800); // Allow Next.js client hydration and animations

    // Evaluate layout
    const evalResult = await client.send("Runtime.evaluate", {
      expression: `(function() {
        var scrollWidth = document.documentElement.scrollWidth;
        var innerWidth = window.innerWidth;
        var hasHorizontalOverflow = scrollWidth > (innerWidth + 2); // small tolerance
        var mainHeading = document.querySelector('h1, h2')?.textContent?.trim() || 'N/A';
        return {
          scrollWidth: scrollWidth,
          innerWidth: innerWidth,
          hasHorizontalOverflow: hasHorizontalOverflow,
          mainHeading: mainHeading
        };
      })()`,
      returnByValue: true,
    });

    const metrics = evalResult.result.value;
    console.log(`   Dimensions: innerWidth=${metrics.innerWidth}px, scrollWidth=${metrics.scrollWidth}px`);
    console.log(`   Heading detected: "${metrics.mainHeading}"`);

    if (!metrics.hasHorizontalOverflow) {
      console.log(`   ✅ [PASS] No horizontal overflow (scrollWidth <= innerWidth)`);
      passed++;
    } else {
      console.error(`   ❌ [FAIL] Unintended horizontal overflow: scrollWidth (${metrics.scrollWidth}) > innerWidth (${metrics.innerWidth})`);
      failed++;
    }

    // Capture screenshot
    const screenshotData = await client.send("Page.captureScreenshot", {
      format: "png",
    });

    const outputPath = path.join(SCREENSHOTS_DIR, tc.screenshot);
    fs.writeFileSync(outputPath, Buffer.from(screenshotData.data, "base64"));
    console.log(`   📸 Screenshot saved: docs/screenshots/${tc.screenshot}`);
  }

  // Cleanup
  client.close();
  chromeProc.kill();
  if (fs.existsSync(TEMP_USER_DATA)) {
    try {
      fs.rmSync(TEMP_USER_DATA, { recursive: true, force: true });
    } catch {}
  }

  console.log("\n==========================================================");
  console.log(` RESPONSIVE BROWSER RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
