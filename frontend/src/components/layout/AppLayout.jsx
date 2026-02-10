import { Navbar } from './Navbar'

export function AppLayout({ children, navItems }) {
  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      <Navbar>
        {navItems}
      </Navbar>
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {children}
      </main>
    </div>
  )
}
