import qrcode from 'qrcode-generator'

// The default encoder truncates characters to 8 bits; QR byte mode content should be UTF-8.
qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s))

export default qrcode
