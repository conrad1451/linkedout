export function ipGeolocationUrl(ip: string): string {
  return `https://ipgeolocation.io/what-is-my-ip/${encodeURIComponent(ip)}`;
}
