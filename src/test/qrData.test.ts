import { describe, expect, it } from 'vitest'
import { EMPTY_VALUES, buildPayload, normalizeUrl, validate, type FormValues, type QRType } from '../lib/qrData'
import { roundTrip } from './decode'

const v = (patch: Partial<FormValues>): FormValues => ({ ...EMPTY_VALUES, ...patch })

describe('URL', () => {
  it('accepts valid URLs and adds https:// when missing', () => {
    expect(validate('url', v({ url: 'https://example.com/path?q=1' }))).toEqual({})
    expect(validate('url', v({ url: 'example.com' }))).toEqual({})
    expect(normalizeUrl('example.com')).toBe('https://example.com')
    expect(normalizeUrl('http://a.io')).toBe('http://a.io')
    expect(buildPayload('url', v({ url: '  example.com/x ' }))).toBe('https://example.com/x')
  })

  it.each([
    ['', 'Please enter a URL.'],
    ['   ', 'Please enter a URL.'],
    ['not a url', 'URLs cannot contain spaces.'],
    ['example', 'Enter a full domain, e.g. example.com.'],
    ['ftp://example.com', 'Only http:// and https:// links are supported.'],
    ['javascript:alert(1)', 'Only http:// and https:// links are supported.'],
    ['https://exa_mple.com', 'The domain contains invalid characters.'],
  ])('rejects %j', (url, msg) => {
    expect(validate('url', v({ url })).url).toBe(msg)
  })
})

describe('Text', () => {
  it('requires non-blank text', () => {
    expect(validate('text', v({ text: '' })).text).toBeDefined()
    expect(validate('text', v({ text: '  \n ' })).text).toBeDefined()
    expect(validate('text', v({ text: 'Hello 👋 world' }))).toEqual({})
  })
  it('encodes text verbatim', () => {
    expect(buildPayload('text', v({ text: 'Line 1\nLine 2' }))).toBe('Line 1\nLine 2')
  })
})

describe('Email', () => {
  it('validates the address', () => {
    expect(validate('email', v({ emailAddress: '' })).emailAddress).toMatch(/enter an email/)
    expect(validate('email', v({ emailAddress: 'foo@bar' })).emailAddress).toMatch(/valid email/)
    expect(validate('email', v({ emailAddress: 'foo bar@baz.com' })).emailAddress).toMatch(/valid email/)
    expect(validate('email', v({ emailAddress: 'foo@bar.com' }))).toEqual({})
  })
  it('builds a mailto link with encoded subject and body', () => {
    expect(buildPayload('email', v({ emailAddress: 'a@b.co' }))).toBe('mailto:a@b.co')
    expect(buildPayload('email', v({ emailAddress: 'a@b.co', emailSubject: 'Hi there', emailBody: 'A&B?' }))).toBe(
      'mailto:a@b.co?subject=Hi%20there&body=A%26B%3F',
    )
  })
  it('limits subject length', () => {
    expect(validate('email', v({ emailAddress: 'a@b.co', emailSubject: 'x'.repeat(201) })).emailSubject).toBeDefined()
  })
})

describe('Phone', () => {
  it.each(['+1 (555) 123-4567', '5551234', '+44 20 7946 0958'])('accepts %s', (phone) => {
    expect(validate('phone', v({ phone }))).toEqual({})
  })
  it.each([
    ['', /enter a phone/],
    ['12', /3 to 15 digits/],
    ['555-CALL-NOW', /Only digits/],
    ['55+5123', /\+ sign/],
    ['1234567890123456', /3 to 15 digits/],
  ])('rejects %j', (phone, msg) => {
    expect(validate('phone', v({ phone })).phone).toMatch(msg)
  })
  it('builds a tel: URI with only digits', () => {
    expect(buildPayload('phone', v({ phone: '+1 (555) 123-4567' }))).toBe('tel:+15551234567')
    expect(buildPayload('phone', v({ phone: '555 1234' }))).toBe('tel:5551234')
  })
})

describe('Wi-Fi', () => {
  it('requires SSID and a valid password for the security type', () => {
    expect(validate('wifi', v({})).wifiSsid).toBeDefined()
    expect(validate('wifi', v({ wifiSsid: 'Home', wifiPassword: 'short' })).wifiPassword).toMatch(/8/)
    expect(validate('wifi', v({ wifiSsid: 'Home', wifiPassword: 'longenough' }))).toEqual({})
    expect(validate('wifi', v({ wifiSsid: 'Home', wifiEncryption: 'nopass' }))).toEqual({})
    expect(validate('wifi', v({ wifiSsid: 'Home', wifiEncryption: 'WEP', wifiPassword: 'abcde' }))).toEqual({})
    expect(validate('wifi', v({ wifiSsid: 'Home', wifiEncryption: 'WEP', wifiPassword: 'abcdef' })).wifiPassword).toBeDefined()
    expect(validate('wifi', v({ wifiSsid: 'x'.repeat(33), wifiEncryption: 'nopass' })).wifiSsid).toBeDefined()
  })
  it('builds the WIFI: string and escapes special characters', () => {
    expect(buildPayload('wifi', v({ wifiSsid: 'Home', wifiPassword: 'pass;word:1' }))).toBe('WIFI:T:WPA;S:Home;P:pass\\;word\\:1;;')
    expect(buildPayload('wifi', v({ wifiSsid: 'Cafe "Free"', wifiEncryption: 'nopass', wifiHidden: true }))).toBe(
      'WIFI:T:nopass;S:Cafe \\"Free\\";H:true;;',
    )
  })
})

describe('every QR type produces a scannable code', () => {
  const samples: [QRType, Partial<FormValues>][] = [
    ['url', { url: 'example.com/path?q=1&r=2' }],
    ['text', { text: 'Hello, wörld — 你好 👋' }],
    ['email', { emailAddress: 'hello@example.com', emailSubject: 'Hi', emailBody: 'Body text' }],
    ['phone', { phone: '+1 555 123 4567' }],
    ['wifi', { wifiSsid: 'My;Net', wifiPassword: 'secret:pass' }],
  ]
  it.each(samples)('%s', (type, patch) => {
    const values = v(patch)
    expect(validate(type, values)).toEqual({})
    const payload = buildPayload(type, values)
    for (const ec of ['L', 'M', 'Q', 'H'] as const) expect(roundTrip(payload, ec)).toBe(payload)
  })

  it('stays scannable with custom high-contrast colours', () => {
    expect(roundTrip('https://example.com', 'M', [12, 74, 110], [240, 249, 255])).toBe('https://example.com')
  })
})
