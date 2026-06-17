import { NextResponse } from 'next/server'

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'LTCUSDT', 'NEARUSDT'
]

async function getKlines(symbol, interval, limit = 100) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const res = await fetch(url, { next: { revalidate: 60 } })
  const data = await res.json()
  return data.map(k => ({
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }))
}

function calculateRSI(candles, period = 14) {
  const closes = candles.map(c => c.close)
  let gains = 0, losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Math.round(100 - (100 / (1 + rs)))
}

function detectTrend(candles) {
  const last = candles.slice(-10)
  let higherHighs = 0, higherLows = 0, lowerHighs = 0, lowerLows = 0

  for (let i = 1; i < last.length; i++) {
    if (last[i].high > last[i - 1].high) higherHighs++
    else lowerHighs++
    if (last[i].low > last[i - 1].low) higherLows++
    else lowerLows++
  }

  if (higherHighs > lowerHighs && higherLows > lowerLows) return 'Bullish'
  if (lowerHighs > higherHighs && lowerLows > higherLows) return 'Bearish'
  return 'Neutral'
}

function detectDivergence(candles, rsi) {
  const last5 = candles.slice(-5)
  const prices = last5.map(c => c.close)

  const priceGoingUp = prices[prices.length - 1] > prices[0]
  const priceGoingDown = prices[prices.length - 1] < prices[0]

  const rsiValues = []
  for (let i = 0; i < 5; i++) {
    rsiValues.push(calculateRSI(candles.slice(0, candles.length - 4 + i)))
  }

  const rsiGoingUp = rsiValues[rsiValues.length - 1] > rsiValues[0]
  const rsiGoingDown = rsiValues[rsiValues.length - 1] < rsiValues[0]

  if (priceGoingUp && rsiGoingDown) return 'Bearish'
  if (priceGoingDown && rsiGoingUp) return 'Bullish'
  return 'None'
}

function detectSupportResistance(candles) {
  const last20 = candles.slice(-20)
  const currentPrice = last20[last20.length - 1].close
  const highs = last20.map(c => c.high)
  const lows = last20.map(c => c.low)

  const resistance = Math.max(...highs.slice(0, -1))
  const support = Math.min(...lows.slice(0, -1))

  const nearSupport = Math.abs(currentPrice - support) / support < 0.03
  const nearResistance = Math.abs(currentPrice - resistance) / resistance < 0.03

  return { nearSupport, nearResistance }
}

function detectCandlestick(candles) {
  const last = candles[candles.length - 1]
  const prev = candles[candles.length - 2]

  const body = Math.abs(last.close - last.open)
  const upperWick = last.high - Math.max(last.close, last.open)
  const lowerWick = Math.min(last.close, last.open) - last.low
  const isBullish = last.close > last.open
  const isBearish = last.close < last.open

  // Hammer
  if (lowerWick > body * 2 && upperWick < body * 0.5) {
    return { pattern: 'Hammer', type: 'Bullish' }
  }
  // Shooting Star
  if (upperWick > body * 2 && lowerWick < body * 0.5) {
    return { pattern: 'Shooting Star', type: 'Bearish' }
  }
  // Bullish Engulfing
  if (isBullish && prev.close < prev.open &&
    last.open < prev.close && last.close > prev.open) {
    return { pattern: 'Bullish Engulfing', type: 'Bullish' }
  }
  // Bearish Engulfing
  if (isBearish && prev.close > prev.open &&
    last.open > prev.close && last.close < prev.open) {
    return { pattern: 'Bearish Engulfing', type: 'Bearish' }
  }

  return { pattern: 'None', type: 'None' }
}

function calculateScore(data) {
  let score = 0

  // Trend Alignment (20pts)
  if (data.weeklyTrend === data.dailyTrend && data.dailyTrend === data.trend) score += 20
  else if (data.weeklyTrend === data.dailyTrend) score += 10

  // RSI Condition (20pts)
  if (data.signal === 'BUY' && data.rsi < 35) score += 20
  else if (data.signal === 'BUY' && data.rsi < 50) score += 10
  else if (data.signal === 'SELL' && data.rsi > 65) score += 20
  else if (data.signal === 'SELL' && data.rsi > 50) score += 10

  // Divergence (25pts)
  if (data.divergence !== 'None') score += 25

  // Support/Resistance (20pts)
  if (data.signal === 'BUY' && data.supportDetected) score += 20
  else if (data.signal === 'SELL' && data.resistanceDetected) score += 20

  // Candlestick (15pts)
  if (data.candlestickConfirmation) score += 15

  return score
}

function getGrade(score) {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

async function analyzeSymbol(symbol) {
  try {
    const [candles4h, candles1d, candles1w] = await Promise.all([
      getKlines(symbol, '4h', 100),
      getKlines(symbol, '1d', 50),
      getKlines(symbol, '1w', 30),
    ])

    const rsi = calculateRSI(candles4h)
    const trend = detectTrend(candles4h)
    const dailyTrend = detectTrend(candles1d)
    const weeklyTrend = detectTrend(candles1w)
    const divergence = detectDivergence(candles4h, rsi)
    const { nearSupport, nearResistance } = detectSupportResistance(candles4h)
    const candle = detectCandlestick(candles4h)

    // Determine signal direction
    let signal = null
    if (weeklyTrend === 'Bullish' && dailyTrend === 'Bullish' && rsi < 50 && divergence === 'Bullish') {
      signal = 'BUY'
    } else if (weeklyTrend === 'Bearish' && dailyTrend === 'Bearish' && rsi > 50 && divergence === 'Bearish') {
      signal = 'SELL'
    } else if (rsi < 30) {
      signal = 'BUY'
    } else if (rsi > 70) {
      signal = 'SELL'
    }

    if (!signal) return null

    const candlestickConfirmation =
      (signal === 'BUY' && candle.type === 'Bullish') ||
      (signal === 'SELL' && candle.type === 'Bearish')

    const scoreData = {
      signal,
      trend,
      weeklyTrend,
      dailyTrend,
      rsi,
      divergence,
      supportDetected: nearSupport,
      resistanceDetected: nearResistance,
      candlestickConfirmation,
    }

    const score = calculateScore(scoreData)
    if (score < 70) return null

    const grade = getGrade(score)

    return {
      symbol,
      strategy: 'RSI Divergence + Market Structure',
      signal,
      trend,
      weeklyTrend,
      dailyTrend,
      rsi,
      divergence,
      supportDetected: nearSupport,
      resistanceDetected: nearResistance,
      candlestickPattern: candle.pattern,
      candlestickConfirmation,
      score,
      grade,
      price: candles4h[candles4h.length - 1].close,
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    return null
  }
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      SYMBOLS.map(symbol => analyzeSymbol(symbol))
    )

    const signals = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)
      .sort((a, b) => b.score - a.score)

    return NextResponse.json({ signals, total: signals.length })
  } catch (err) {
    return NextResponse.json({ signals: [], error: err.message }, { status: 500 })
  }
                                }
