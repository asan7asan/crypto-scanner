import './globals.css'

export const metadata = {
  title: 'Crypto Scanner',
  description: 'Professional Crypto Trading Signal Scanner',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
