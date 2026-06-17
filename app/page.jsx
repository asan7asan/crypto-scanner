'use client'
import { useState, useEffect } from 'react'

export default function Home() {
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const gradeColor = (grade) => {
    if (grade === 'A+') return '#00ff88'
    if (grade === 'A') return '#00d4ff'
    if (grade === 'B') return '#ffaa00'
    return '#ff6b6b'
  }

  const fetchSignals = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/scan')
      const data = await res.json()
      setSignals(data.signals || [])
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSignals()
    const interval = setInterval(fetchSignals, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', color: '#00d4ff', fontWeight: 'bold' }}>
          ⚡ Crypto Scanner
        </h1>
        <p style={{ color: '#888', marginTop: '5px' }}>
          RSI Divergence + Market Structure Strategy
        </p>
        {lastUpdated && (
          <p style={{ color: '#555', fontSize: '12px', marginTop: '5px' }}>
            Last updated: {lastUpdated}
          </p>
        )}
      </div>

      {/* Scan Button */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <button
          onClick={fetchSignals}
          disabled={loading}
          style={{
            background: loading ? '#333' : '#00d4ff',
            color: loading ? '#888' : '#000',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '🔄 Scanning...' : '🔍 Scan Now'}
        </button>
      </div>

      {/* Stats */}
      {signals.length > 0 && (
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Signals', value: signals.length, color: '#00d4ff' },
            { label: 'BUY', value: signals.filter(s => s.signal === 'BUY').length, color: '#00ff88' },
            { label: 'SELL', value: signals.filter(s => s.signal === 'SELL').length, color: '#ff6b6b' },
            { label: 'A+ Setups', value: signals.filter(s => s.grade === 'A+').length, color: '#ffaa00' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: '#1a1a2e',
              border: `1px solid ${stat.color}33`,
              borderRadius: '10px',
              padding: '15px 20px',
              flex: '1',
              minWidth: '120px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signals */}
      {loading && signals.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '60px' }}>
          <div style={{ fontSize: '40px' }}>🔄</div>
          <p style={{ marginTop: '10px' }}>Scanning markets...</p>
        </div>
      ) : signals.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '60px' }}>
          <div style={{ fontSize: '40px' }}>📡</div>
          <p style={{ marginTop: '10px' }}>No signals yet. Press Scan Now!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {signals.map((signal, i) => (
            <div key={i} style={{
              background: '#1a1a2e',
              border: `1px solid ${signal.signal === 'BUY' ? '#00ff8833' : '#ff6b6b33'}`,
              borderRadius: '12px',
              padding: '20px',
            }}>
              {/* Top Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                  {signal.symbol}
                </span>
                <span style={{
                  background: signal.signal === 'BUY' ? '#00ff8822' : '#ff6b6b22',
                  color: signal.signal === 'BUY' ? '#00ff88' : '#ff6b6b',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}>
                  {signal.signal}
                </span>
              </div>

              {/* Grade & Score */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <span style={{
                  background: gradeColor(signal.grade) + '22',
                  color: gradeColor(signal.grade),
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}>
                  Grade: {signal.grade}
                </span>
                <span style={{ color: '#888', fontSize: '13px', paddingTop: '3px' }}>
                  Score: {signal.score}/100
                </span>
              </div>

              {/* Details */}
              <div style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.8' }}>
                <div>📈 Trend: <span style={{ color: '#fff' }}>{signal.trend}</span></div>
                <div>📅 Weekly: <span style={{ color: '#fff' }}>{signal.weeklyTrend}</span></div>
                <div>📆 Daily: <span style={{ color: '#fff' }}>{signal.dailyTrend}</span></div>
                <div>📊 RSI: <span style={{ color: signal.rsi < 30 ? '#00ff88' : signal.rsi > 70 ? '#ff6b6b' : '#fff' }}>{signal.rsi}</span></div>
                <div>🔀 Divergence: <span style={{ color: '#fff' }}>{signal.divergence}</span></div>
                <div>🕯️ Candle: <span style={{ color: '#fff' }}>{signal.candlestickConfirmation ? '✅ Confirmed' : '❌ None'}</span></div>
                <div>🛡️ Support/Res: <span style={{ color: '#fff' }}>{signal.supportDetected ? '✅ Detected' : '❌ None'}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
                           }
