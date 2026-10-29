export const TOOL_SHORTCUT_KEY = "outpost:tool-shortcuts:v1";
export function parseToolShortcuts(value: string, knownPaths: readonly string[]): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter(
          (path): path is string => typeof path === "string" && knownPaths.includes(path),
        ),
      ),
    ].slice(0, 6);
  } catch {
    return [];
  }
}
