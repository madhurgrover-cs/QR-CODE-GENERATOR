import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { RECENT_KEY } from '../lib/storage'

// jsdom has no canvas, so the renderer is mocked; real rendering is covered by the round-trip tests.
const created: { data: string; style: { fgColor: string; size: number } }[] = []
vi.mock('../lib/qrRenderer', () => ({
  createQR: (data: string, style: { fgColor: string; size: number }) => {
    created.push({ data, style })
    return { append: (el: HTMLElement) => { el.innerHTML = `<canvas data-data="${data}"></canvas>` } }
  },
  verifyScannable: vi.fn(async () => true),
  renderToBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  makeThumbnail: vi.fn(async () => 'data:image/png;base64,AAAA'),
  downloadBlob: vi.fn(),
  loadLogo: vi.fn(),
}))
const renderer = await import('../lib/qrRenderer')

const lastData = () => created.at(-1)?.data
const type = (label: RegExp | string, value: string) => {
  const el = screen.getByLabelText(label)
  fireEvent.change(el, { target: { value } })
  fireEvent.blur(el)
}

beforeEach(() => {
  created.length = 0
  vi.clearAllMocks()
})

describe('App', () => {
  it('shows a placeholder until valid content is entered, then updates live', () => {
    render(<App />)
    expect(screen.getByText(/Fill in the details/)).toBeInTheDocument()
    type(/Website URL/, 'example.com')
    expect(lastData()).toBe('https://example.com')
    type(/Website URL/, 'example.com/a')
    expect(lastData()).toBe('https://example.com/a')
  })

  it('shows the right inputs for each type', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Email' }))
    expect(screen.getByLabelText(/Email address/)).toBeInTheDocument()
    expect(screen.getByLabelText('Subject')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Phone' }))
    expect(screen.getByLabelText(/Phone number/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Wi-Fi' }))
    expect(screen.getByLabelText(/Network name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Security'), { target: { value: 'nopass' } })
    expect(screen.queryByLabelText(/Password/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Text' }))
    expect(screen.getByLabelText(/^Text/)).toBeInTheDocument()
  })

  it('generates each type', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Text' }))
    type(/^Text/, 'hello')
    expect(lastData()).toBe('hello')
    fireEvent.click(screen.getByRole('tab', { name: 'Email' }))
    type(/Email address/, 'a@b.co')
    expect(lastData()).toBe('mailto:a@b.co')
    fireEvent.click(screen.getByRole('tab', { name: 'Phone' }))
    type(/Phone number/, '+1 555 1234')
    expect(lastData()).toBe('tel:+15551234')
    fireEvent.click(screen.getByRole('tab', { name: 'Wi-Fi' }))
    type(/Network name/, 'Home')
    type(/Password/, 'password1')
    expect(lastData()).toBe('WIFI:T:WPA;S:Home;P:password1;;')
  })

  it('shows validation errors for invalid input', () => {
    render(<App />)
    type(/Website URL/, 'not a url')
    expect(screen.getByRole('alert')).toHaveTextContent('URLs cannot contain spaces.')
    fireEvent.click(screen.getByRole('tab', { name: 'Email' }))
    type(/Email address/, 'bad@')
    expect(screen.getByRole('alert')).toHaveTextContent(/valid email/)
  })

  it('reveals errors when downloading incomplete data instead of downloading', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please enter a URL.')
    expect(renderer.downloadBlob).not.toHaveBeenCalled()
  })

  it('downloads PNG using the same data and style as the preview', async () => {
    render(<App />)
    type(/Website URL/, 'example.com')
    fireEvent.change(document.getElementById('s-size')!, { target: { value: '500' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Download PNG' })))
    expect(renderer.renderToBlob).toHaveBeenCalledWith('https://example.com', expect.objectContaining({ size: 500 }), 'png')
    expect(renderer.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'qr-url-example-com.png')
    expect(created.at(-1)!.style.size).toBe(500)
  })

  it('applies presets and allows changes afterwards', () => {
    render(<App />)
    type(/Website URL/, 'example.com')
    fireEvent.click(screen.getByRole('button', { name: /Ocean/ }))
    expect(screen.getByRole('button', { name: /Ocean/ })).toHaveAttribute('aria-pressed', 'true')
    expect(created.at(-1)!.style.fgColor).toBe('#0c4a6e')
    fireEvent.change(document.getElementById('s-fg')!, { target: { value: '#000000' } })
    expect(created.at(-1)!.style.fgColor).toBe('#000000')
    expect(screen.getByRole('button', { name: /Ocean/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('warns about low-contrast colours', () => {
    render(<App />)
    type(/Website URL/, 'example.com')
    fireEvent.change(document.getElementById('s-fg')!, { target: { value: '#dddddd' } })
    expect(screen.getByText(/Very low contrast/)).toBeInTheDocument()
  })

  it('saves to recent, persists across reloads and restores on click', async () => {
    const { unmount } = render(<App />)
    type(/Website URL/, 'example.com')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save' })))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toHaveLength(1))
    unmount()

    render(<App />)
    expect(screen.getByLabelText<HTMLInputElement>(/Website URL/).value).toBe('')
    fireEvent.click(screen.getByTitle('Load this QR code'))
    expect(screen.getByLabelText<HTMLInputElement>(/Website URL/).value).toBe('example.com')
    expect(lastData()).toBe('https://example.com')

    fireEvent.click(screen.getByRole('button', { name: /Remove/ }))
    expect(JSON.parse(localStorage.getItem(RECENT_KEY)!)).toHaveLength(0)
  })

  it('toggles and remembers the theme', () => {
    render(<App />)
    const btn = screen.getByRole('button', { name: /Switch to (dark|light) theme/ })
    const before = document.documentElement.dataset.theme
    fireEvent.click(btn)
    expect(document.documentElement.dataset.theme).not.toBe(before)
    expect(localStorage.getItem('qr-designer:theme')).toBe(document.documentElement.dataset.theme)
  })
})
