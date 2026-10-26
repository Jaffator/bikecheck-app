import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { lookup as dnsLookup } from 'node:dns';
import { BlockList, isIP, type LookupFunction } from 'node:net';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

// Addresses an image URL must never resolve to: reaching one would turn the server into a
// client against its own network (SSRF). Loopback, link-local (cloud metadata lives at
// 169.254.169.254), private, CGNAT, multicast and reserved ranges, both IP families.
const PRIVATE_RANGES = new BlockList();
PRIVATE_RANGES.addSubnet('0.0.0.0', 8, 'ipv4');
PRIVATE_RANGES.addSubnet('10.0.0.0', 8, 'ipv4');
PRIVATE_RANGES.addSubnet('100.64.0.0', 10, 'ipv4');
PRIVATE_RANGES.addSubnet('127.0.0.0', 8, 'ipv4');
PRIVATE_RANGES.addSubnet('169.254.0.0', 16, 'ipv4');
PRIVATE_RANGES.addSubnet('172.16.0.0', 12, 'ipv4');
PRIVATE_RANGES.addSubnet('192.0.0.0', 24, 'ipv4');
PRIVATE_RANGES.addSubnet('192.168.0.0', 16, 'ipv4');
PRIVATE_RANGES.addSubnet('198.18.0.0', 15, 'ipv4');
PRIVATE_RANGES.addSubnet('224.0.0.0', 4, 'ipv4');
PRIVATE_RANGES.addSubnet('240.0.0.0', 4, 'ipv4');
PRIVATE_RANGES.addAddress('::1', 'ipv6');
PRIVATE_RANGES.addAddress('::', 'ipv6');
PRIVATE_RANGES.addSubnet('fc00::', 7, 'ipv6');
PRIVATE_RANGES.addSubnet('fe80::', 10, 'ipv6');
PRIVATE_RANGES.addSubnet('ff00::', 8, 'ipv6');

function isBlockedAddress(address: string): boolean {
  // An IPv4-mapped IPv6 address (::ffff:127.0.0.1) hides a v4 target, so judge it as v4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) {
    return PRIVATE_RANGES.check(mapped[1], 'ipv4');
  }
  const family = isIP(address);
  if (family === 0) {
    return true;
  }
  return PRIVATE_RANGES.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

// The socket's own DNS lookup, so the connection is pinned to a vetted address: the name
// cannot re-point to an internal host between the check and the request (DNS rebinding).
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) {
      callback(error, '', 0);
      return;
    }
    const blocked = addresses.find((entry) => isBlockedAddress(entry.address));
    if (blocked) {
      callback(new Error(`blocked address ${blocked.address}`), '', 0);
      return;
    }
    if (options.all === true) {
      callback(null, addresses);
    } else {
      callback(null, addresses[0].address, addresses[0].family);
    }
  });
};

function requestOnce(url: URL): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = send(url, { lookup: guardedLookup, timeout: REQUEST_TIMEOUT_MS }, resolve);
    req.on('timeout', () => req.destroy(new Error('image URL timed out')));
    req.on('error', reject);
    req.end();
  });
}

function readBody(response: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    response.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_IMAGE_BYTES) {
        response.destroy();
        reject(new Error('image exceeds size limit'));
        return;
      }
      chunks.push(chunk);
    });
    response.on('end', () => resolve(Buffer.concat(chunks)));
    response.on('error', reject);
  });
}

// Downloads an image from an attacker-controlled URL safely: http(s) only, every hop pinned
// to a public address, so neither the URL nor a redirect can aim the server at its own
// network. Throws on anything unsafe or unreachable; the caller treats that as "no image".
export async function downloadPublicImage(rawUrl: string): Promise<Buffer> {
  let target = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = new URL(target);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error(`unsupported image URL scheme: ${url.protocol}`);
    }
    // A literal IP host never reaches the guarded lookup (the socket skips DNS), so vet it
    // here - this is the cloud-metadata case, http://169.254.169.254/...
    const literal = url.hostname.replace(/^\[|\]$/g, '');
    if (isIP(literal) && isBlockedAddress(literal)) {
      throw new Error(`blocked address ${literal}`);
    }
    const response = await requestOnce(url);
    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400 && response.headers.location) {
      // A redirect re-enters the loop, so its target is vetted by the same guarded lookup.
      response.resume();
      target = new URL(response.headers.location, url).toString();
      continue;
    }
    if (status !== 200) {
      response.resume();
      throw new Error(`image URL returned HTTP ${status}`);
    }
    return await readBody(response);
  }
  throw new Error('too many redirects for image URL');
}
