export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        AI Appointment Setter
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
        AI-powered appointment setting agent for Instagram DMs
      </p>

      <div style={{
        background: '#f5f5f5',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '600px'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>API Endpoints</h2>
        <ul style={{ lineHeight: '2' }}>
          <li>
            <strong>Webhook:</strong> <code>/api/webhook/manychat</code> (POST)
          </li>
          <li>
            <strong>Health Check:</strong> <code>/api/health</code> (GET)
          </li>
        </ul>

        <h2 style={{ fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
          Status
        </h2>
        <p style={{ color: '#22c55e', fontWeight: 'bold' }}>
          ✓ Service Running
        </p>
      </div>
    </main>
  )
}
