import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
Config.setConcurrency(4);

// Prefer an existing Chromium (Playwright) over downloading headless shell.
const candidates = [
  process.env.REMOTION_BROWSER_EXECUTABLE,
  `${homedir()}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`,
].filter(Boolean) as string[];
for (const c of candidates) {
  if (existsSync(c)) {
    Config.setBrowserExecutable(c);
    break;
  }
}
