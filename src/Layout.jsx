import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Server, Shield, FileText, Home, BookOpen } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const navigation = [
    { name: 'Dashboard', icon: Home, path: 'Dashboard' },
    { name: 'Crisis Coordination', icon: Activity, path: 'CrisisCoordination' },
    { name: 'System Management', icon: Server, path: 'SystemManagement' },
    { name: 'Authority Management', icon: Shield, path: 'AuthorityManagement' },
    { name: 'Audit Viewer', icon: FileText, path: 'AuditViewer' },
    { name: 'Playbooks', icon: BookOpen, path: 'Playbooks' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-2 px-6 border-b-4 border-yellow-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5" />
            <span className="font-bold text-sm">NCRS-P PROTOTYPE</span>
          </div>
          <div className="text-xs text-yellow-200 flex items-center gap-2">
            <div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse" />
            DEMONSTRATION SYSTEM - NOT CONNECTED TO REAL INFRASTRUCTURE
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto py-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={`/${item.path}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm">
          <div className="font-semibold mb-2">National Cyber Resilience & Snap-Back Platform</div>
          <div className="text-gray-400 text-xs space-y-1">
            <div>🔒 This is a PROTOTYPE/DEMONSTRATION system for concept validation</div>
            <div>⚠️ Not authorized for operational use • Not connected to real infrastructure</div>
            <div>📋 For authorized government use only under proper legal authority</div>
          </div>
        </div>
      </footer>
    </div>
  );
}