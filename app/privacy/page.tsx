import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trenxia — Privacy Policy',
  description: 'How the Trenxia app handles your photos and data.',
}

const wrap: React.CSSProperties = {
  maxWidth: 720, margin: '0 auto', padding: '48px 20px 64px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  lineHeight: 1.6, color: '#1a1a1a',
}

export default function Privacy() {
  return (
    <main style={wrap}>
      <h1>Trenxia Privacy Policy</h1>
      <p><em>Last updated: October 23, 2026</em></p>

      <p>
        Trenxia is an AI stylist app made by Bahareh Bahreman. This policy explains what
        happens to your information when you use the Trenxia app. You can use Trenxia
        without creating an account or signing in.
      </p>

      <h2>Photos</h2>
      <p>
        When you analyze an outfit or run a body &amp; colour scan, the photo you choose is
        sent over an encrypted connection to our server, which passes it to Google Gemini
        to generate your style analysis. The photo is used only for that one request. We do
        not save your photos on our servers.
      </p>

      <h2>Questions and chat messages</h2>
      <p>
        Questions you type to the stylist (in Explore or in a chat about a result), along
        with the details needed to answer them such as your selected occasion, style
        preferences and the previous result, are sent the same way to Google Gemini to
        produce a reply. We do not store them on our servers.
      </p>

      <h2>Device ID and usage limits</h2>
      <p>
        The app creates a random ID on your device. It is not linked to your name, email or
        Apple account. Our server uses it, together with your IP address, to count how many
        free styling sessions have been used each day. These counters expire automatically
        after the day ends.
      </p>

      <h2>Data stored on your device</h2>
      <p>
        Your saved looks, wardrobe, style profile, scan results, language and theme settings
        are stored only on your device. Deleting the app removes them.
      </p>

      <h2>Google Gemini</h2>
      <p>
        AI responses are provided by Google Gemini. Google processes the content we send
        under its own terms and privacy policy:{' '}
        <a href="https://policies.google.com/privacy">policies.google.com/privacy</a>.
      </p>

      <h2>What we don’t do</h2>
      <ul>
        <li>We don’t sell your data.</li>
        <li>We don’t show ads or use your data for advertising.</li>
        <li>We don’t track you across other apps or websites.</li>
      </ul>

      <h2>Children</h2>
      <p>
        Trenxia is not directed at children under 13, and we do not knowingly collect
        personal information from them.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, we will update this page and the date above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email{' '}
        <a href="mailto:bahar.bahreman@gmail.com">bahar.bahreman@gmail.com</a>.
      </p>
    </main>
  )
}
