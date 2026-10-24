import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trenxia — Support',
  description: 'Help and contact for the Trenxia app.',
}

const wrap: React.CSSProperties = {
  maxWidth: 720, margin: '0 auto', padding: '48px 20px 64px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  lineHeight: 1.6, color: '#1a1a1a',
}

export default function Support() {
  return (
    <main style={wrap}>
      <h1>Trenxia Support</h1>
      <p>
        Need help with Trenxia, found a bug, or have an idea? Email{' '}
        <a href="mailto:bahar.bahreman@gmail.com">bahar.bahreman@gmail.com</a> and
        we’ll get back to you.
      </p>

      <h2>Common questions</h2>

      <h3>Do I need an account?</h3>
      <p>No. Tap “Start Styling — Free” and you can begin right away.</p>

      <h3>What photo works best?</h3>
      <p>
        A mirror selfie or full-body photo in natural light, with your whole outfit in frame.
      </p>

      <h3>It says I’ve used today’s free sessions.</h3>
      <p>Each device gets a daily allowance of styling sessions. It resets the next day.</p>

      <h3>Results came back in the wrong language.</h3>
      <p>
        Pick your language with the language button at the top of the screen, then analyze
        the photo again.
      </p>

      <h3>Where are my saved looks?</h3>
      <p>
        Under Wardrobe. They are stored only on your device, so deleting the app removes them.
      </p>

      <h3>What happens to my photos?</h3>
      <p>
        They are analyzed once and not saved. See the{' '}
        <a href="/privacy">privacy policy</a> for details.
      </p>
    </main>
  )
}
