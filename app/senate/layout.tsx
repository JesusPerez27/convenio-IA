import './layout-shell.css'

export default function SenateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <div className="senate-root">{children}</div>
}
