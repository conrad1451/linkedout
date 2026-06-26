export function isExtension(): boolean {
  const maybeChrome = globalThis as typeof globalThis & {
    chrome?: { runtime?: { id?: string } };
  };
  return Boolean(maybeChrome.chrome?.runtime?.id);
}
