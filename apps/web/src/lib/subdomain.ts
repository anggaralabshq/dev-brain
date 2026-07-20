const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "anggaralabs.lol";

export function getSubdomain(host: string): string | null {
  if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) return null;
  const withoutPort = host.split(":")[0];
  if (withoutPort.endsWith(`.${APP_DOMAIN}`)) {
    return withoutPort.slice(0, withoutPort.length - APP_DOMAIN.length - 1);
  }
  return null;
}
