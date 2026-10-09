export type QRType = 'url' | 'text' | 'email' | 'phone' | 'wifi'
export type WifiEncryption = 'WPA' | 'WEP' | 'nopass'

export interface FormValues {
  url: string
  text: string
  emailAddress: string
  emailSubject: string
  emailBody: string
  phone: string
  wifiSsid: string
  wifiPassword: string
  wifiEncryption: WifiEncryption
  wifiHidden: boolean
}

export type FieldErrors = Partial<Record<keyof FormValues, string>>

export const QR_TYPES: { id: QRType; label: string }[] = [
  { id: 'url', label: 'URL' },
  { id: 'text', label: 'Text' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'wifi', label: 'Wi-Fi' },
]

export const FIELDS_BY_TYPE: Record<QRType, (keyof FormValues)[]> = {
  url: ['url'],
  text: ['text'],
  email: ['emailAddress', 'emailSubject', 'emailBody'],
  phone: ['phone'],
  wifi: ['wifiSsid', 'wifiPassword', 'wifiEncryption', 'wifiHidden'],
}

export const EMPTY_VALUES: FormValues = {
  url: '',
  text: '',
  emailAddress: '',
  emailSubject: '',
  emailBody: '',
  phone: '',
  wifiSsid: '',
  wifiPassword: '',
  wifiEncryption: 'WPA',
  wifiHidden: false,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9\s\-().]+$/

/** Max byte capacity of a version-40 QR code in byte mode, per error correction level. */
export const BYTE_CAPACITY = { L: 2953, M: 2331, Q: 1663, H: 1273 } as const

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length
}

/** Adds https:// when the user omits a scheme. */
export function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return v
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`
}

export function validateUrl(raw: string): string | undefined {
  if (!raw.trim()) return 'Please enter a URL.'
  if (/\s/.test(raw.trim())) return 'URLs cannot contain spaces.'
  let parsed: URL
  try {
    parsed = new URL(normalizeUrl(raw))
  } catch {
    return 'This doesn’t look like a valid URL.'
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return 'Only http:// and https:// links are supported.'
  const host = parsed.hostname
  if (host !== 'localhost' && !/^[^.]+(\.[^.]+)+$/.test(host)) return 'Enter a full domain, e.g. example.com.'
  if (!/^[a-z0-9.-]+$/i.test(host) || host.startsWith('-') || host.includes('..'))
    return 'The domain contains invalid characters.'
  return undefined
}

function escapeWifi(s: string): string {
  return s.replace(/([\\;,:"])/g, '\\$1')
}

export function validate(type: QRType, v: FormValues): FieldErrors {
  const e: FieldErrors = {}
  switch (type) {
    case 'url': {
      const err = validateUrl(v.url)
      if (err) e.url = err
      break
    }
    case 'text':
      if (!v.text.trim()) e.text = 'Please enter some text.'
      break
    case 'email':
      if (!v.emailAddress.trim()) e.emailAddress = 'Please enter an email address.'
      else if (!EMAIL_RE.test(v.emailAddress.trim())) e.emailAddress = 'Enter a valid email, e.g. name@example.com.'
      if (v.emailSubject.length > 200) e.emailSubject = 'Subject should be 200 characters or fewer.'
      break
    case 'phone': {
      const p = v.phone.trim()
      const digits = p.replace(/\D/g, '')
      if (!p) e.phone = 'Please enter a phone number.'
      else if (p.lastIndexOf('+') > 0) e.phone = 'The + sign can only appear at the start.'
      else if (!PHONE_RE.test(p)) e.phone = 'Only digits, spaces, +, -, ( and ) are allowed.'
      else if (digits.length < 3 || digits.length > 15) e.phone = 'Phone numbers must have 3 to 15 digits.'
      break
    }
    case 'wifi': {
      if (!v.wifiSsid.trim()) e.wifiSsid = 'Please enter the network name (SSID).'
      else if (byteLength(v.wifiSsid) > 32) e.wifiSsid = 'SSIDs can be at most 32 bytes.'
      const pw = v.wifiPassword
      if (v.wifiEncryption === 'WPA') {
        if (!pw) e.wifiPassword = 'WPA networks need a password.'
        else if (pw.length < 8 || pw.length > 63) e.wifiPassword = 'WPA passwords must be 8–63 characters.'
      } else if (v.wifiEncryption === 'WEP') {
        if (!pw) e.wifiPassword = 'WEP networks need a password.'
        else if (![5, 13, 16].includes(pw.length) && !(/^[0-9a-f]+$/i.test(pw) && [10, 26, 32].includes(pw.length)))
          e.wifiPassword = 'WEP keys are 5/13/16 characters or 10/26/32 hex digits.'
      }
      break
    }
  }
  return e
}

/** Builds the string encoded into the QR code. Assumes values are valid. */
export function buildPayload(type: QRType, v: FormValues): string {
  switch (type) {
    case 'url':
      return normalizeUrl(v.url)
    case 'text':
      return v.text
    case 'email': {
      const params = new URLSearchParams()
      if (v.emailSubject.trim()) params.set('subject', v.emailSubject.trim())
      if (v.emailBody.trim()) params.set('body', v.emailBody.trim())
      // mailto expects %20 rather than + for spaces
      const qs = params.toString().replace(/\+/g, '%20')
      return `mailto:${v.emailAddress.trim()}${qs ? `?${qs}` : ''}`
    }
    case 'phone': {
      const p = v.phone.trim()
      return `tel:${p.startsWith('+') ? '+' : ''}${p.replace(/\D/g, '')}`
    }
    case 'wifi': {
      const parts = [`T:${v.wifiEncryption}`, `S:${escapeWifi(v.wifiSsid)}`]
      if (v.wifiEncryption !== 'nopass') parts.push(`P:${escapeWifi(v.wifiPassword)}`)
      if (v.wifiHidden) parts.push('H:true')
      return `WIFI:${parts.join(';')};;`
    }
  }
}

/** Short human label for the recent list. */
export function describe(type: QRType, v: FormValues): string {
  switch (type) {
    case 'url':
      return normalizeUrl(v.url).replace(/^https?:\/\//, '')
    case 'text':
      return v.text.trim().slice(0, 60)
    case 'email':
      return v.emailAddress.trim()
    case 'phone':
      return v.phone.trim()
    case 'wifi':
      return v.wifiSsid
  }
}
