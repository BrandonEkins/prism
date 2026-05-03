/**
 * Tests for the outbound URL validator (SSRF guard).
 *
 * Each blocked range gets a representative case. The dev/prod toggle
 * is exercised explicitly via the isProduction option so we don't
 * have to mutate process.env mid-suite.
 */

export {};

import { validatePublicUrl, UnsafeUrlError } from '../safeFetch';

describe('validatePublicUrl', () => {
  it('accepts a public https URL', () => {
    const url = validatePublicUrl('https://example.com/foo', { isProduction: true });
    expect(url.hostname).toBe('example.com');
    expect(url.protocol).toBe('https:');
  });

  it('accepts a public http URL', () => {
    const url = validatePublicUrl('http://api.openweathermap.org/data', { isProduction: true });
    expect(url.hostname).toBe('api.openweathermap.org');
  });

  it('rejects empty input', () => {
    expect(() => validatePublicUrl('', { isProduction: true })).toThrow(UnsafeUrlError);
  });

  it('rejects unparseable input', () => {
    expect(() => validatePublicUrl('not a url', { isProduction: true })).toThrow(UnsafeUrlError);
  });

  it('rejects javascript: protocol', () => {
    expect(() => validatePublicUrl('javascript:alert(1)', { isProduction: true })).toThrow(/protocol/i);
  });

  it('rejects file: protocol', () => {
    expect(() => validatePublicUrl('file:///etc/passwd', { isProduction: true })).toThrow(/protocol/i);
  });

  it('rejects ftp: protocol', () => {
    expect(() => validatePublicUrl('ftp://example.com/foo', { isProduction: true })).toThrow(/protocol/i);
  });

  describe('IPv4 private ranges (in production)', () => {
    const cases = [
      ['127.0.0.1', 'loopback'],
      ['127.5.5.5', 'loopback /8'],
      ['10.0.0.1', '10/8'],
      ['10.255.255.255', '10/8 upper'],
      ['172.16.0.1', '172.16/12 lower'],
      ['172.31.255.255', '172.16/12 upper'],
      ['192.168.1.1', '192.168/16'],
      ['169.254.169.254', 'cloud metadata'],
      ['169.254.0.1', 'link-local'],
      ['0.0.0.0', 'this network'],
      ['100.64.0.1', 'CGNAT lower'],
      ['100.127.255.255', 'CGNAT upper'],
    ];
    for (const [host, label] of cases) {
      it(`rejects ${host} (${label})`, () => {
        expect(() => validatePublicUrl(`http://${host}/`, { isProduction: true }))
          .toThrow(UnsafeUrlError);
      });
    }
  });

  describe('IPv4 public ranges accepted in production', () => {
    const cases = [
      '8.8.8.8',
      '1.1.1.1',
      '172.15.0.1',  // just below 172.16
      '172.32.0.1',  // just above 172.31
      '192.169.0.1', // just past 192.168
      '169.255.0.1', // just past 169.254
      '100.63.0.1',  // just below CGNAT
      '100.128.0.1', // just past CGNAT
    ];
    for (const host of cases) {
      it(`accepts ${host}`, () => {
        const url = validatePublicUrl(`http://${host}/`, { isProduction: true });
        expect(url.hostname).toBe(host);
      });
    }
  });

  describe('IPv6 private ranges (in production)', () => {
    const cases = [
      ['[::1]', 'loopback'],
      ['[::]', 'unspecified'],
      ['[fc00::1]', 'ULA fc'],
      ['[fd00::1]', 'ULA fd'],
      ['[fe80::1]', 'link-local'],
      ['[::ffff:127.0.0.1]', 'IPv4-mapped loopback'],
      ['[::ffff:10.0.0.1]', 'IPv4-mapped 10/8'],
    ];
    for (const [host, label] of cases) {
      it(`rejects ${host} (${label})`, () => {
        expect(() => validatePublicUrl(`http://${host}/`, { isProduction: true }))
          .toThrow(UnsafeUrlError);
      });
    }
  });

  describe('IPv6 public ranges accepted in production', () => {
    it('accepts a public IPv6 literal', () => {
      const url = validatePublicUrl('http://[2606:4700:4700::1111]/', { isProduction: true });
      expect(url.hostname).toBe('[2606:4700:4700::1111]');
    });
  });

  describe('localhost handling', () => {
    it('rejects localhost in production', () => {
      expect(() => validatePublicUrl('http://localhost/', { isProduction: true }))
        .toThrow(UnsafeUrlError);
    });
    it('rejects subdomain.localhost in production', () => {
      expect(() => validatePublicUrl('http://api.localhost/', { isProduction: true }))
        .toThrow(UnsafeUrlError);
    });
    it('accepts localhost in non-production', () => {
      const url = validatePublicUrl('http://localhost:3000/', { isProduction: false });
      expect(url.hostname).toBe('localhost');
    });
    it('accepts 127.0.0.1 in non-production', () => {
      const url = validatePublicUrl('http://127.0.0.1:3000/', { isProduction: false });
      expect(url.hostname).toBe('127.0.0.1');
    });
    it('still rejects non-loopback private IPs in non-production', () => {
      expect(() => validatePublicUrl('http://10.0.0.1/', { isProduction: false }))
        .toThrow(UnsafeUrlError);
    });
  });
});
