import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PERFORMANCE_DIRECTORY = path.join(process.cwd(), "runtime");
export const AWB_PERFORMANCE_PROFILE_PATH = path.join(
  PERFORMANCE_DIRECTORY,
  "awb-performance-profiles.json"
);
const MAX_SAVED_PROFILES = 100;

export type SavedAwbPerformanceProfile = {
  clientProfileId: string;
  recordedAt: string;
  server?: Record<string, unknown>;
  browser?: Record<string, unknown>;
};

let writeQueue: Promise<void> = Promise.resolve();

async function writeProfilePart(
  clientProfileId: string,
  part: "server" | "browser",
  profile: Record<string, unknown>
) {
  await mkdir(PERFORMANCE_DIRECTORY, { recursive: true });
  const existing = await readFile(AWB_PERFORMANCE_PROFILE_PATH, "utf8")
    .then((content) => JSON.parse(content) as unknown)
    .catch(() => []);
  const profiles = Array.isArray(existing) ? existing : [];
  const existingIndex = profiles.findIndex(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as Record<string, unknown>).clientProfileId === clientProfileId
  );
  const previous =
    existingIndex >= 0 &&
    profiles[existingIndex] &&
    typeof profiles[existingIndex] === "object"
      ? (profiles[existingIndex] as SavedAwbPerformanceProfile)
      : null;
  const next: SavedAwbPerformanceProfile = {
    ...previous,
    clientProfileId,
    recordedAt: new Date().toISOString(),
    [part]: profile,
  };
  if (existingIndex >= 0) profiles[existingIndex] = next;
  else profiles.push(next);
  await writeFile(
    AWB_PERFORMANCE_PROFILE_PATH,
    `${JSON.stringify(profiles.slice(-MAX_SAVED_PROFILES), null, 2)}\n`,
    "utf8"
  );
}

export function saveAwbPerformanceProfilePart(
  clientProfileId: string,
  part: "server" | "browser",
  profile: Record<string, unknown>
) {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() =>
      writeProfilePart(clientProfileId, part, profile)
    );
  return writeQueue;
}
