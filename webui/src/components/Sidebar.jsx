import { Link, useLocation } from 'react-router-dom'

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const menu = [
    { path: '/chat', label: 'Chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
    { path: '/admin', label: 'Admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { path: '/docs', label: 'API Docs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { path: '/vercel', label: 'Vercel', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  ]

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-[#0f0f23] border-r border-white/[0.06] transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className="h-14 flex items-center px-4 border-b border-white/[0.06]">
        <button onClick={onToggle} className="text-slate-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        {!collapsed && <span className="ml-3 font-bold text-white truncate">Daniel's Playground</span>}
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {menu.map(item => (
          <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${location.pathname === item.path ? 'bg-accent-primary/15 text-accent-glow' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  )
}