import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import { CollegeDropdown } from './components/CollegeDropdown';
import { 
  Home as HomeIcon, 
  BookOpen, 
  FileText, 
  Calendar, 
  Users, 
  Mail, 
  Search, 
  Menu, 
  X, 
  ChevronRight,
  Download,
  ExternalLink,
  Github,
  Instagram,
  Linkedin,
  Twitter,
  Zap,
  Sparkles,
  RefreshCw,
  ArrowRight,
  MessageSquare,
  User,
  Filter,
  Moon,
  Sun
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  writeBatch,
  doc
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { db } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const errObj = JSON.parse(this.state.error?.message || "{}");
        if (errObj.error) {
          message = `Firestore Error: ${errObj.error}`;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-900 border border-red-500/20 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Oops!</h2>
            <p className="text-zinc-400">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Gemini Service ---
const getGeminiResponse = async (prompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });
  return response.text;
};

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Analytics ---
const Analytics = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'G-LBM6JVLBLZ', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
};

// --- Components ---
const Logo = ({ className = "w-10 h-10", iconOnly = false }: { className?: string, iconOnly?: boolean }) => (
  <div className="flex items-center space-x-3 group">
    <div className={cn("bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center group-hover:border-yellow-400/50 transition-all duration-500 relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-yellow-400 fill-none stroke-current stroke-[1.5] relative z-10" xmlns="http://www.w3.org/2000/svg">
        <g style={{ transformOrigin: 'center', transform: 'scale(0.75) translateY(2px)' }}>
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 18h6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 22h4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d="M12 2v2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.5 10.5h-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21.5 10.5h-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 5.5l-1.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17.5 5.5l1.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    {!iconOnly && (
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight text-white leading-none">
          Ignite<span className="text-yellow-400">XT</span>
        </span>
        <span className="text-[7px] font-bold tracking-[0.25em] text-zinc-500 uppercase mt-1">
          Student Community
        </span>
      </div>
    )}
  </div>
);

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-zinc-400 hover:text-yellow-400 hover:bg-white/5 transition-all duration-300"
      aria-label="Toggle Theme"
      title={theme === 'dark' ? "Switch to Light mode" : "Switch to Dark mode"}
    >
      {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Notes', path: '/notes' },
    { name: 'Events', path: '/events' },
    { name: 'Communities', path: '/communities' },
    { name: 'Contact', path: '/contact' },
  ];

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-[100] border-b transition-colors duration-300",
        isOpen ? "bg-zinc-950 border-white/10" : "glass border-white/5"
      )}>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" onClick={() => setIsOpen(false)} className="relative z-[110]">
            <Logo />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg relative group",
                  location.pathname === link.path 
                    ? "text-yellow-400" 
                    : "text-zinc-400 hover:text-zinc-100"
                )}
              >
                {link.name}
                {location.pathname === link.path && (
                  <motion.div 
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-yellow-400 rounded-full"
                  />
                )}
                <div className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              </Link>
            ))}
            <div className="pl-4 ml-2 border-l border-white/10">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden relative z-[110] flex items-center space-x-2">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-zinc-400 hover:text-yellow-400 transition-colors"
              aria-label="Toggle Menu"
            >
              <div className="w-6 h-5 relative flex items-center justify-center">
                <motion.span 
                  animate={isOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -8 }}
                  className="absolute w-full h-0.5 bg-current rounded-full transition-all"
                />
                <motion.span 
                  animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
                  className="absolute w-full h-0.5 bg-current rounded-full transition-all"
                />
                <motion.span 
                  animate={isOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 8 }}
                  className="absolute w-full h-0.5 bg-current rounded-full transition-all"
                />
              </div>
            </button>
          </div>
        </div>
        </div>
      </nav>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-zinc-950/98 backdrop-blur-xl md:hidden flex flex-col pt-24 pb-12 px-8 overflow-y-auto"
          >
            <div className="flex flex-col space-y-6 flex-1 mt-8">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "text-4xl font-black tracking-tight transition-colors block py-2",
                      location.pathname === link.path 
                        ? "text-yellow-400" 
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-8 border-t border-white/10 flex flex-col space-y-6"
            >
              <span className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase">Connect with us</span>
              <div className="flex space-x-6">
                <a href="https://www.instagram.com/ignite.xt/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-yellow-400 transition-colors">
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="https://github.com/skmdsadiq1607" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-yellow-400 transition-colors">
                  <Github className="w-6 h-6" />
                </a>
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=Ignitext@gmail.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-yellow-400 transition-colors">
                  <Mail className="w-6 h-6" />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Footer = ({ useLinks = true }: { useLinks?: boolean }) => (
  <footer className="bg-zinc-950 border-t border-white/5 py-24">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-24">
        <div className="col-span-1 md:col-span-2 space-y-6">
          {useLinks ? (
            <Link to="/">
              <Logo className="w-8 h-8" />
            </Link>
          ) : (
            <a href="/">
              <Logo className="w-8 h-8" />
            </a>
          )}
          <p className="text-zinc-400 max-w-sm text-sm leading-relaxed">
            The ultimate student community for college students. Empowering students with structured academic resources, events, and a collaborative ecosystem.
          </p>
          <div className="flex space-x-4">
            <a href="https://github.com/skmdsadiq1607" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg border border-white/5 flex items-center justify-center text-zinc-500 hover:text-yellow-400 hover:border-yellow-400/50 transition-all duration-300">
              <Github className="w-4 h-4" />
            </a>
            <a href="https://www.instagram.com/ignite.xt/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg border border-white/5 flex items-center justify-center text-zinc-500 hover:text-yellow-400 hover:border-yellow-400/50 transition-all duration-300">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://www.linkedin.com/company/ignitext/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg border border-white/5 flex items-center justify-center text-zinc-500 hover:text-yellow-400 hover:border-yellow-400/50 transition-all duration-300">
              <Linkedin className="w-4 h-4" />
            </a>
            <a href="#" className="w-9 h-9 rounded-lg border border-white/5 flex items-center justify-center text-zinc-500 hover:text-yellow-400 hover:border-yellow-400/50 transition-all duration-300">
              <Twitter className="w-4 h-4" />
            </a>
          </div>
        </div>
        <div>
          <h4 className="text-zinc-100 font-semibold mb-6 text-sm">Quick Links</h4>
          <ul className="space-y-3">
            {['Notes', 'Events', 'About'].map((item) => (
              <li key={item}>
                {useLinks ? (
                  <Link to={`/${item.toLowerCase()}`} className="text-zinc-400 hover:text-yellow-400 text-sm transition-colors">{item}</Link>
                ) : (
                  <a href={`/${item.toLowerCase()}`} className="text-zinc-400 hover:text-yellow-400 text-sm transition-colors">{item}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-zinc-100 font-semibold mb-6 text-sm">Support</h4>
          <ul className="space-y-3">
            {['Contact', 'Privacy Policy', 'Terms of Service', 'FAQ'].map((item) => (
              <li key={item}>
                {useLinks ? (
                  <Link 
                    to={item === 'Contact' ? '/contact' : `/${item.toLowerCase().replace(/ /g, '-')}`} 
                    className="text-zinc-400 hover:text-yellow-400 text-sm transition-colors"
                  >
                    {item}
                  </Link>
                ) : (
                  <a 
                    href={item === 'Contact' ? '/contact' : `/${item.toLowerCase().replace(/ /g, '-')}`} 
                    className="text-zinc-400 hover:text-yellow-400 text-sm transition-colors"
                  >
                    {item}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 pt-12 flex flex-col items-center text-center space-y-6">
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">&copy; 2026 IgniteXT Student Community. All rights reserved.</p>
        <div className="flex flex-col items-center space-y-3">
          <p className="text-zinc-400 text-xs font-medium">
            Made with ❤️ by <span className="text-yellow-400">IgniteXT Technical Team</span>
          </p>
          <p className="text-zinc-400 text-xs tracking-wider font-medium">
            <span className="text-yellow-400 font-bold">Sadiq</span> <span className="text-zinc-600 mx-1">|</span> <span className="text-yellow-400 font-bold">Mrudhula</span> <span className="text-zinc-600 mx-1">|</span> <span className="text-yellow-400 font-bold">Santhoshini</span> <span className="text-zinc-600 mx-1">|</span> <span className="text-yellow-400 font-bold">Rohit</span> <span className="text-zinc-600 mx-1">|</span> <span className="text-yellow-400 font-bold">Tehnaaz</span>
          </p>
        </div>
      </div>
    </div>
  </footer>
);

// --- Pages ---
const Home = () => {
  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-zinc-950 bg-grid-pattern py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.03),transparent_70%)]" />
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:border-yellow-400/30 hover:text-yellow-400 transition-colors cursor-default"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Premier Tech Hub</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight text-white">
              <span className="text-white">Ignite</span><span className="text-yellow-400">XT</span>
            </h1>
            
            <p className="text-base md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              The ultimate student-led resource hub. Empowering the next generation of innovators.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link to="/events" className="group px-8 py-4 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-all duration-300 w-full flex items-center justify-center space-x-2">
                  <span>Explore Events</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link to="/notes" className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 w-full flex items-center justify-center">
                  Get Resources
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
      {/* Technical Team Thanks Section */}
      <section className="py-24 bg-zinc-950 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center space-y-4 mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Recognition</span>
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Special Thanks to our <span className="text-yellow-400">Technical Team</span>
            </h2>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              The dedicated minds behind the IgniteXT digital infrastructure and platform development.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Sadiq", role: "Developer", github: "https://github.com/skmdsadiq1607", linkedin: "https://www.linkedin.com/in/shaik-sadiq-b1650a377" },
              { name: "Santhoshini", role: "Developer", github: "#", linkedin: "#" },
              { name: "Mrudhula", role: "Developer", github: "#", linkedin: "https://www.linkedin.com/in/mrudhula-dubbaka-7a9153333" },
              { name: "Rohit", role: "Developer", github: "#", linkedin: "#" },
              { name: "Tehnaaz", role: "Developer", github: "#", linkedin: "https://www.linkedin.com/in/tehnaazfathima" }
            ].map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 text-center space-y-4 group hover:border-yellow-400/20 hover:bg-zinc-900/60 transition-all duration-500"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-400/5 flex items-center justify-center text-yellow-400 mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <User className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{member.name}</h4>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{member.role}</p>
                </div>
                <div className="flex justify-center space-x-2 pt-2">
                  <a href={member.github} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-white/5 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all">
                    <Github className="w-3.5 h-3.5" />
                  </a>
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-white/5 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all">
                    <Linkedin className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Access Grid */}
      <section className="py-24 bg-zinc-950 relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Academic Resources', desc: 'Department-wise structured notes and materials for all years.', icon: BookOpen, path: '/notes' },
              { title: 'Events & News', desc: 'Stay updated with the latest campus activities.', icon: Calendar, path: '/events' }
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-yellow-400/10 flex items-center justify-center mb-6 group-hover:bg-yellow-400 group-hover:text-black transition-all duration-300">
                  <card.icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{card.title}</h3>
                <p className="text-zinc-400 text-sm mb-8 leading-relaxed">{card.desc}</p>
                <Link to={card.path} className="inline-flex items-center text-sm font-bold text-yellow-400 group-hover:translate-x-1 transition-transform">
                  Get Started <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const CommunitiesPage = () => {
  const [selectedCollege, setSelectedCollege] = useState("Select your college");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const communities = [
    { name: 'CSE', link: 'https://chat.whatsapp.com/DgTk3d9KkthDqV7AFufk9U', icon: '💻' },
    { name: 'DS (Data Science)', link: 'https://chat.whatsapp.com/BXNValVCyNJ0EYxrYbvzwY', icon: '📊' },
    { name: 'ECE', link: 'https://chat.whatsapp.com/JarYz1OKCACAcPVJOXOy1i', icon: '📡' },
    { name: 'IT', link: 'https://chat.whatsapp.com/I0KwboMy8EWEwGqKkhSNt9', icon: '💾' },
    { name: 'AI', link: 'https://chat.whatsapp.com/K9M05Wk0WtpJru7QKXl8R0', icon: '🧠' }
  ];

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'IgniteXTxAnuragU') {
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError("Incorrect password! Please try again.");
    }
  };

  if (selectedCollege === "Select your college") {
    return (
      <div className="pt-32 pb-24 bg-zinc-950 min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-2xl"
        >
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Welcome</span>
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
              Hello <span className="text-yellow-400">Ignitians!</span>
            </h1>
            <p className="text-zinc-400 text-lg">Select your college to access communities.</p>
          </div>
          <div className="flex justify-center">
            <CollegeDropdown selectedCollege={selectedCollege} onSelect={setSelectedCollege} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (selectedCollege !== "Anurag University") {
    return <InProgressScreen selectedCollege={selectedCollege} setSelectedCollege={setSelectedCollege} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="pt-32 pb-24 bg-zinc-950 min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-md w-full"
        >
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">Enter Password</h1>
            <p className="text-zinc-400">Please enter the password to access Anurag University communities.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
              placeholder="Enter password"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition-all">
              Submit
            </button>
          </form>
          <div className="flex justify-center">
            <CollegeDropdown selectedCollege={selectedCollege} onSelect={setSelectedCollege} />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 bg-zinc-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Anurag University <span className="text-yellow-400">Communities</span>
          </h1>
          <p className="text-zinc-400 text-lg">Connect with your department peers, access resources, and stay updated.</p>
          <div className="flex justify-center pt-4">
            <CollegeDropdown selectedCollege={selectedCollege} onSelect={setSelectedCollege} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {communities.map((dept) => (
            <a 
              key={dept.name}
              href={dept.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-2xl bg-zinc-900 border border-white/5 hover:border-yellow-400/30 hover:bg-zinc-900 transition-all flex items-center space-x-6 group"
            >
              <span className="text-4xl">{dept.icon}</span>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">{dept.name}</h4>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Join Group</p>
              </div>
              <ExternalLink className="w-5 h-5 text-zinc-600 group-hover:text-yellow-400 transition-colors" />
            </a>
          ))}
        </div>
        
        <div className="pt-12 border-t border-white/5 text-center">
          <a 
            href="https://whatsapp.com/channel/0029VbAfiQzD38CarXrTNj1g" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-3 px-8 py-4 bg-zinc-900 text-white rounded-2xl border border-white/5 hover:border-yellow-400/50 transition-all font-bold text-base"
          >
            <MessageSquare className="w-5 h-5 text-yellow-400" />
            <span>Official Announcements Channel</span>
          </a>
        </div>
      </div>
    </div>
  );
};

const About = () => {
  const teamData = [
    { name: "Vivek Reddy", dept: "AIML", year: "3rd", role: "IgniteXT Lead", category: "Leads", bio: "Visionary leader driving the core mission of IgniteXT to empower students." },
    { name: "Akshath Sugandh", dept: "AIML", year: "3rd", role: "IgniteXT Lead", category: "Leads", bio: "Passionate about building community ecosystems and student growth." },
    { name: "Abhinav Reddy", dept: "AIML", year: "2nd", role: "IgniteXT Lead", category: "Leads", bio: "Focusing on technical excellence and innovative student solutions." },
    { name: "Sai Kumar", dept: "AIML", year: "3rd", role: "IgniteXT Lead", category: "Leads", bio: "Dedicated to bridging the gap between academia and industry." },
    { name: "Yeshwanth", dept: "AIML", year: "2nd", role: "IgniteXT Lead", category: "Leads", bio: "Driving operational efficiency and community engagement." },
    { name: "Venky", dept: "AIML", year: "3rd", role: "IgniteXT Lead", category: "Leads", bio: "Expert in strategic planning and student outreach programs." },
    { name: "Sanjana", dept: "IT", year: "3rd", role: "IT Dept Lead", category: "Department Leads", bio: "Bridging the gap between IT students and industry-standard practices." },
    { name: "Sai Koushik", dept: "DS", year: "3rd", role: "DS Dept Lead", category: "Department Leads", bio: "Empowering Data Science enthusiasts with cutting-edge resources and workshops." },
    { name: "Pratiti", dept: "DS", year: "2nd", role: "DS Dept Lead", category: "Department Leads", bio: "Fostering a culture of data-driven innovation among junior students." },
    { name: "Hashith", dept: "ECE", year: "3rd", role: "ECE Dept Lead", category: "Department Leads", bio: "Leading the ECE community towards practical hardware and electronics mastery." },
    { name: "Sruthi", dept: "ECE", year: "2nd", role: "ECE Dept Lead", category: "Department Leads", bio: "Coordinating ECE initiatives and student engagement programs." },
    { name: "Pardhiva", dept: "CSE", year: "3rd", role: "CSE Dept Lead", category: "Department Leads", bio: "Dedicated to building a strong foundation for CSE students through collaboration." },
    { name: "Shiva vardhan", dept: "CSE", year: "3rd", role: "CSE Dept Lead", category: "Department Leads", bio: "Driving technical excellence and peer-to-peer learning in CSE." },
    { name: "Shiva", dept: "AI", year: "3rd", role: "AI Dept Lead", category: "Department Leads", bio: "Exploring the frontiers of AI and sharing knowledge with the community." },
    { name: "Ananya", dept: "AIML", year: "3rd", role: "Operations & Management Lead", category: "Operations & Management", bio: "Ensuring smooth execution of all IgniteXT initiatives and events." },
    { name: "Karthikeya", dept: "AI", year: "3rd", role: "Events & Outreach Lead", category: "Events & Outreach", bio: "Connecting IgniteXT with the broader student body through impactful events." },
    { name: "Sadiq", dept: "IT", year: "2nd", role: "Technical Team", category: "Technical Team", bio: "Full-stack developer focused on building scalable community tools and resources.", github: "https://github.com/skmdsadiq1607" },
    { name: "Ashrith", dept: "AIML", year: "1st", role: "Operations & Management", category: "Operations & Management", bio: "Supporting operational tasks and community management." },
    { name: "Asmita", dept: "AI", year: "2nd", role: "Operations & Management", category: "Operations & Management", bio: "Managing resources and coordinating between different departments." },
    { name: "Aasritha", dept: "DS", year: "3rd", role: "Operations & Management", category: "Operations & Management", bio: "Streamlining processes for efficient community growth." },
    { name: "aqeel shaik", dept: "ECE", year: "1st", role: "Operations & Management", category: "Operations & Management", bio: "Assisting in the management of ECE-specific community initiatives." },
    { name: "Anwitha", dept: "ECE", year: "1st", role: "Events & Outreach", category: "Events & Outreach", bio: "Passionate about organizing engaging events for the community." },
    { name: "Sindhu", dept: "CSE", year: "2nd", role: "Events & Outreach", category: "Events & Outreach", bio: "Coordinating outreach programs to expand the IgniteXT network." },
    { name: "Nithya", dept: "CSE", year: "2nd", role: "Events & Outreach", category: "Events & Outreach", bio: "Driving student participation in workshops and hackathons." },
    { name: "Kavya", dept: "CSE", year: "2nd", role: "Events & Outreach", category: "Events & Outreach", bio: "Building relationships with student organizations and industry partners." },
    { name: "Gautham", dept: "AI", year: "2nd", role: "Events & Outreach", category: "Events & Outreach", bio: "Fostering an inclusive environment for all AI enthusiasts." },
    { name: "Kanishka", dept: "CSE", year: "2nd", role: "Content & Communication", category: "Content & Communication", bio: "Crafting compelling narratives to share the IgniteXT mission." },
    { name: "Sravanthi", dept: "ECE", year: "3rd", role: "Content & Communication", category: "Content & Communication", bio: "Managing internal and external communications for the community." },
    { name: "Vedashree", dept: "ECE", year: "3rd", role: "Content & Communication", category: "Content & Communication", bio: "Ensuring clear and consistent messaging across all platforms." },
    { name: "Sampreeth", dept: "CSE", year: "2nd", role: "Design & Media", category: "Design & Media", bio: "Creating visual assets that reflect the vibrant IgniteXT brand." },
    { name: "Manaswini", dept: "AI", year: "2nd", role: "Design & Media", category: "Design & Media", bio: "Designing intuitive and engaging user experiences for the community." },
    { name: "Santhoshini", dept: "AIML", year: "2nd", role: "Technical Team", category: "Technical Team", bio: "Developing and maintaining technical resources for students." },
    { name: "Mrudhula", dept: "IT", year: "2nd", role: "Technical Team", category: "Technical Team", bio: "Contributing to the development of the IgniteXT platform." },
    { name: "Rohit", dept: "DS", year: "3rd", role: "Technical Team", category: "Technical Team", bio: "Exploring data-driven solutions for community challenges." },
    { name: "Tehnaaz", dept: "AI", year: "2nd", role: "Technical Team", category: "Technical Team", bio: "Implementing AI-powered features to enhance the student experience." },
  ];

  const categories = ["Leads", "Department Leads", "Technical Team", "Operations & Management", "Events & Outreach", "Content & Communication", "Design & Media"];

  return (
    <div className="pt-24 pb-24 bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* About IgniteXT Section */}
        <div className="mb-24 relative">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-yellow-400/10 blur-[120px] rounded-full" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl space-y-6 relative z-10"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Our Story</span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              About <span className="text-white">Ignite</span><span className="text-yellow-400">XT</span>
            </h1>
            <p className="text-base md:text-lg text-zinc-400 leading-relaxed">
              IgniteXT is more than just a resource hub; it's a vibrant student-led ecosystem. Our mission is to bridge the gap between academic theory and practical innovation by providing students with the tools, community, and support they need to excel.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 space-y-3">
                <h3 className="text-lg font-semibold text-white">Our Mission</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">To empower every student with high-quality academic resources and a collaborative platform for growth.</p>
              </div>
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 space-y-3">
                <h3 className="text-lg font-semibold text-white">Our Vision</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">To become the central hub for innovation and student excellence, fostering the next generation of tech leaders.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Team Section */}
        <div className="space-y-16">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Meet the Team</h2>
            <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">The dedicated students working behind the scenes to make IgniteXT a reality.</p>
          </div>

          {categories.map((cat) => (
            <div key={cat} className="space-y-8 relative">
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-400/[0.02] blur-[80px] rounded-full pointer-events-none" />
              <div className="flex items-center space-x-4 relative z-10">
                <h3 className="text-xl font-semibold text-white whitespace-nowrap">{cat}</h3>
                <div className="h-px bg-white/5 flex-1" />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 relative z-10">
                {teamData.filter(m => m.category === cat).map((member, i) => (
                  <motion.div
                    key={member.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="group p-4 rounded-xl bg-zinc-900/50 border border-white/5 card-hover flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 group-hover:bg-yellow-400 group-hover:text-black transition-all">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500">{member.dept}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-0.5">{member.name}</h4>
                    <p className="text-[10px] font-medium text-yellow-400 mb-2">{member.role}</p>
                    {member.bio && (
                      <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-3 mb-3 italic">"{member.bio}"</p>
                    )}
                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-white/5">
                      <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-zinc-500">{member.year} Year</span>
                      <div className="flex space-x-1.5">
                        <Linkedin className="w-3 h-3 text-zinc-600 hover:text-yellow-400 cursor-pointer transition-colors" />
                        {member.github ? (
                          <a href={member.github} target="_blank" rel="noopener noreferrer">
                            <Github className="w-3 h-3 text-zinc-600 hover:text-yellow-400 transition-colors" />
                          </a>
                        ) : (
                          <Github className="w-3 h-3 text-zinc-600 hover:text-yellow-400 cursor-pointer transition-colors" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Core Values Section */}
        <div className="mt-32 space-y-16">
          <div className="text-center space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Our Foundation</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Our Core Values</h2>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">The principles that guide our community and drive our innovation.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Collaboration', desc: 'We believe in the power of working together to solve complex problems and build better solutions.', icon: Users },
              { title: 'Innovation', desc: 'We constantly push the boundaries of what is possible, encouraging creative thinking and technical mastery.', icon: Sparkles },
              { title: 'Empowerment', desc: 'We provide students with the resources and support they need to take charge of their academic and professional journeys.', icon: Zap }
            ].map((value, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-[2rem] bg-zinc-900/50 border border-white/5 space-y-6 group hover:border-yellow-400/20 transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-2xl bg-yellow-400/5 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform duration-500">
                  <value.icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">{value.title}</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">{value.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Join CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 md:mt-32 p-8 md:p-20 rounded-[2rem] md:rounded-[3rem] bg-zinc-900 border border-white/5 relative overflow-hidden text-center space-y-8 md:space-y-10 group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/[0.02] via-transparent to-transparent opacity-50" />
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">
                Ready to <span className="text-yellow-400">Ignite</span> <br className="hidden md:block" /> your journey?
              </h2>
              <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Join the most active student community. Access resources, build projects, and grow with us.
              </p>
            </div>
            <Link to="/contact" className="inline-flex items-center px-10 py-4 bg-yellow-400 text-black font-bold rounded-2xl hover:bg-yellow-300 transition-all shadow-2xl shadow-yellow-400/20 hover:scale-105 active:scale-95">
              Join the Community
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
const InProgressScreen = ({ selectedCollege, setSelectedCollege }: { selectedCollege: string, setSelectedCollege: (c: string) => void }) => (
  <div className="pt-32 pb-24 bg-zinc-950 min-h-screen flex flex-col items-center justify-center px-4">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-8 max-w-2xl"
    >
      <div className="space-y-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Coming Soon</span>
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
          Work in <span className="text-yellow-400">Progress</span>
        </h1>
        <p className="text-zinc-400 text-lg">We are actively working on bringing resources and events to your college. Stay tuned!</p>
      </div>
      <div className="flex justify-center">
        <CollegeDropdown selectedCollege={selectedCollege} onSelect={setSelectedCollege} />
      </div>
    </motion.div>
  </div>
);

const ResourcesPage = () => {
  const [selectedCollege, setSelectedCollege] = useState("Select your college");
  const depts = ['CSE', 'IT', 'AIML', 'DS', 'ECE'];
  const years = ['1st', '2nd', '3rd'];

  const [filter, setFilter] = useState({ 
    dept: 'CSE', 
    year: '1st'
  });

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const getExactLink = () => {
    const mapping: any = {
      'CSE': {
        '1st': '1BN39Wl5bTT9YQE_BB2tczWuHGluriXzr',
        '2nd': '15tuQA2z8HsG8eO3E_9h-wneMaTze0Jwh',
        '3rd': '1OoLqZ0leWiJOEvbB81rDI_EQfKmH6VHE'
      },
      'IT': {
        '1st': '1W_sNvrXKF_rs70dxLYQLlVyDUm5OR1kC',
        '2nd': '1655oij6JrsTF8A9G4PFTy1WyetXiTpEL',
        '3rd': '1KCKQig_QQiiErFmF7cDvxHOAo7A4z-Yx'
      },
      'AIML': {
        '1st': '1JC4-AMjsFkm7Ms83w_Ps-a1baGBj_VjK',
        '2nd': '1RHBJrFwy3KH4TKd1mPA7bPgYBZxbVp9Q',
        '3rd': '1-VO376_m1PARyUhX2aHTr9dvlWoREfNd'
      },
      'DS': {
        '1st': '1mzJOTPNgEGUPFjx-Np2vFjjZLg2JZHjr',
        '2nd': '1gUQA1Bop9j7WHnGokLfo0Ta4d9oR3B0P',
        '3rd': '1wk2AgIMqTn_QcXKYaR5RBsYKF8bJE3pG'
      },
      'ECE': {
        '1st': '1SDfpAInqcvOViH2hX4tTlrAwI0DVe7ta',
        '2nd': '1HbN3U-PqtE7-8hxjIMRWeCfnNX5KKg5i',
        '3rd': '16AZIoZWDBUwhW5KEHkGGDF0uo3DoRnQr'
      }
    };

    const folderId = mapping[filter.dept]?.[filter.year];
    return folderId ? `https://drive.google.com/drive/folders/${folderId}` : null;
  };

  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = getExactLink();
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        const btn = e.currentTarget as HTMLButtonElement;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check w-5 h-5 text-green-400"><path d="M20 6 9 17l-5-5"/></svg><span>Copied!</span>`;
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const FilterContent = () => (
    <>
      <div className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Department</label>
        <div className="space-y-1">
          {depts.map(dept => (
            <button
              key={dept}
              onClick={() => {
                setFilter({...filter, dept});
                setIsMobileFilterOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-300",
                filter.dept === dept 
                  ? "bg-yellow-400 text-black font-bold shadow-lg shadow-yellow-400/10" 
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Year</label>
        <div className="grid grid-cols-3 gap-2">
          {years.map(year => (
            <button
              key={year}
              onClick={() => {
                setFilter({...filter, year});
                setIsMobileFilterOpen(false);
              }}
              className={cn(
                "px-3 py-2.5 rounded-xl text-xs transition-all duration-300 border",
                filter.year === year 
                  ? "bg-yellow-400 border-yellow-400 text-black font-bold shadow-lg shadow-yellow-400/10" 
                  : "border-white/5 text-zinc-400 hover:border-white/20 hover:text-white bg-white/[0.02]"
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  if (selectedCollege === "Select your college") {
    return (
      <div className="pt-32 pb-24 bg-zinc-950 min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-2xl"
        >
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Welcome</span>
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
              Hello <span className="text-yellow-400">Ignitians!</span>
            </h1>
            <p className="text-zinc-400 text-lg">Select your college to access department-wise notes & resources.</p>
          </div>
          <div className="flex justify-center">
            <CollegeDropdown selectedCollege={selectedCollege} onSelect={setSelectedCollege} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (selectedCollege !== "Anurag University") {
    return <InProgressScreen selectedCollege={selectedCollege} setSelectedCollege={setSelectedCollege} />;
  }

  return (
    <div className="pt-20 min-h-screen bg-zinc-950 flex flex-col md:flex-row relative">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-400/[0.01] via-transparent to-transparent pointer-events-none" />
      
      {/* Mobile Filter Toggle */}
      <div className="md:hidden bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Filter</p>
            <p className="text-xs font-bold text-white">{filter.dept} • {filter.year} Year</p>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileFilterOpen(true)}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all"
        >
          Change
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFilterOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-zinc-900 border-t border-white/10 rounded-t-[2rem] p-8 md:hidden max-h-[80vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-white">Filter Resources</h3>
                <button 
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-8">
                <FilterContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-white/5 p-8 space-y-10 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
        <FilterContent />

        <div className="space-y-4 pt-6 border-t border-white/5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Quick Actions</label>
          <a 
            href={getExactLink() || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-2xl bg-yellow-400/5 border border-yellow-400/10 group hover:bg-yellow-400/10 hover:border-yellow-400/30 transition-all duration-300"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                <ExternalLink className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Open Drive</span>
                <span className="text-[10px] text-zinc-500">New Tab</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              <Link to="/" className="hover:text-yellow-400 transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-yellow-500">Resources</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Academic <span className="text-yellow-400">Resources</span>
            </h1>
          </div>
          <CollegeDropdown selectedCollege={selectedCollege} onSelect={setSelectedCollege} />
        </div>

        {/* Direct Access Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 md:p-16 rounded-[2rem] md:rounded-[2.5rem] bg-zinc-900 border border-white/5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700">
            <Zap className="w-64 h-64 text-yellow-400" />
          </div>
          
          <div className="relative z-10 space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500">Direct Drive Access</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                {filter.dept} {filter.year} Year <br className="hidden md:block" />
                <span className="text-yellow-400">Academic</span> Materials
              </h2>
              <p className="text-zinc-400 text-base md:text-lg max-w-2xl leading-relaxed">
                Access the complete repository for your current selection. This folder contains all structured notes, previous year papers, and reference materials curated by the community.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <motion.a 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={getExactLink() || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center space-x-3 px-10 py-5 rounded-2xl bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-all shadow-xl shadow-yellow-400/10"
              >
                <ExternalLink className="w-5 h-5" />
                <span>Open Google Drive</span>
              </motion.a>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={copyLink}
                className="w-full sm:w-auto flex items-center justify-center space-x-3 px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <Zap className="w-5 h-5 text-yellow-400" />
                <span>Copy Folder Link</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: BookOpen, title: "Structured Notes", desc: "Handwritten and digital notes from top performers." },
            { icon: FileText, title: "Previous Papers", desc: "Comprehensive collection of PYQs and model papers." },
            { icon: Zap, title: "Quick Guides", desc: "Last-minute revision charts and formula sheets." }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-yellow-400/20 transition-all duration-500 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-yellow-400/5 flex items-center justify-center text-yellow-400 mb-6 group-hover:scale-110 transition-transform">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};


const Events = () => {
  const [selectedCollege, setSelectedCollege] = useState("Select your college");
  const events: { title: string; date: string; type: 'upcoming' | 'past'; category: string; desc: string }[] = [];

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  if (selectedCollege === "Select your college") {
    return (
      <div className="pt-32 pb-24 bg-zinc-950 min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-2xl"
        >
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Welcome</span>
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
              Hello <span className="text-yellow-400">Ignitians!</span>
            </h1>
            <p className="text-zinc-400 text-lg">Select your college to access college events updates.</p>
          </div>
          <div className="flex justify-center">
            <CollegeDropdown selectedCollege={selectedCollege} onSelect={setSelectedCollege} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (selectedCollege !== "Anurag University") {
    return <InProgressScreen selectedCollege={selectedCollege} setSelectedCollege={setSelectedCollege} />;
  }

  return (
    <div className="pt-24 pb-24 bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Stay Updated</span>
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">Campus <span className="text-yellow-400">Events</span></h1>
            <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">Join us for workshops, hackathons, and community meetups designed to ignite your potential.</p>
          </div>
          <CollegeDropdown selectedCollege={selectedCollege} onSelect={setSelectedCollege} />
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="grid grid-cols-2 sm:flex p-1 bg-zinc-900 rounded-xl border border-white/5 w-full sm:w-auto">
              <button 
                onClick={() => setActiveTab('upcoming')}
                className={cn(
                  "px-6 py-2 rounded-lg text-sm font-bold transition-all text-center flex items-center justify-center",
                  activeTab === 'upcoming' ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20" : "text-zinc-400 hover:text-white"
                )}
              >
                Upcoming
              </button>
              <button 
                onClick={() => setActiveTab('past')}
                className={cn(
                  "px-6 py-2 rounded-lg text-sm font-bold transition-all text-center flex items-center justify-center",
                  activeTab === 'past' ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20" : "text-zinc-400 hover:text-white"
                )}
              >
                Past
              </button>
            </div>
          </div>
        </div>

        {events.filter(e => e.type === activeTab).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.filter(e => e.type === activeTab).map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group p-8 rounded-2xl bg-zinc-900 border border-white/5 card-hover flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-[10px] font-bold text-yellow-400 uppercase tracking-[0.2em]">
                    {event.category}
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{event.date}</span>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors">{event.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-8 flex-1">{event.desc}</p>
                
                <button className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-all">
                  <span>{event.type === 'upcoming' ? 'Register Now' : 'View Highlights'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-24 flex flex-col items-center justify-center text-center space-y-6 rounded-3xl bg-zinc-900/50 border border-dashed border-white/10"
          >
            <div className="w-20 h-20 rounded-full bg-yellow-400/5 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-yellow-400/30" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Stay Tuned! 🚀</h3>
              <p className="text-zinc-500 max-w-md mx-auto">
                We're currently planning some amazing {activeTab} events for the community. Check back soon or follow our LinkedIn page for instant updates.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    const path = 'messages';
    try {
      await addDoc(collection(db, path), {
        ...formData,
        to: 'Ignitext@gmail.com',
        timestamp: serverTimestamp()
      });
      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="pt-24 pb-24 bg-zinc-950 min-h-screen relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-400/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Connect With Us</span>
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">Get in <span className="text-yellow-400">Touch</span></h1>
              <p className="text-zinc-400 text-base leading-relaxed max-w-lg">
                Have questions, suggestions, or want to contribute? We'd love to hear from you. Join the community and help us grow.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: Mail, title: 'Email Us', value: 'Ignitext@gmail.com', link: 'https://mail.google.com/mail/?view=cm&fs=1&to=Ignitext@gmail.com' },
                { icon: Linkedin, title: 'LinkedIn', value: 'Follow Us', link: 'https://www.linkedin.com/company/ignitext/' },
                { icon: HomeIcon, title: 'Location', value: 'Anurag University', link: '#' },
                { icon: Instagram, title: 'Instagram', value: '@ignite.xt', link: 'https://www.instagram.com/ignite.xt/' }
              ].map((item, i) => (
                <a 
                  key={i} 
                  href={item.link}
                  target={item.link.startsWith('http') ? "_blank" : undefined}
                  rel={item.link.startsWith('http') ? "noopener noreferrer" : undefined}
                  className="p-6 rounded-2xl bg-zinc-900 border border-white/5 space-y-3 hover:border-yellow-400/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 group-hover:bg-yellow-400 group-hover:text-black transition-all relative z-10">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <p className="text-xs text-zinc-500">{item.value}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

            <div className="p-6 md:p-10 rounded-2xl bg-zinc-900 border border-white/5 space-y-6 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/[0.02] to-transparent pointer-events-none" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Send a Message</h3>
              <p className="text-xs text-zinc-500">Fill out the form below and we'll get back to you shortly.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400/50 transition-all" 
                    placeholder="John Doe" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Email</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400/50 transition-all" 
                    placeholder="john@example.com" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Subject</label>
                <input 
                  required
                  type="text" 
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400/50 transition-all" 
                  placeholder="How can we help?" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Message</label>
                <textarea 
                  required
                  rows={4} 
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400/50 transition-all resize-none" 
                  placeholder="Your message here..."
                ></textarea>
              </div>
              <button 
                disabled={status === 'loading'}
                className="w-full py-4 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Sending...' : 'Send Message'}
              </button>
              
              {status === 'success' && (
                <div className="space-y-4">
                  <p className="text-center text-xs text-green-400 font-medium animate-pulse">Message sent successfully! We'll get back to you soon.</p>
                  <div className="flex justify-center">
                    <a 
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=Ignitext@gmail.com&su=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(formData.message)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Open in Gmail</span>
                    </a>
                  </div>
                </div>
              )}
              {status === 'error' && (
                <p className="text-center text-xs text-red-400 font-medium">Something went wrong. Please try again later.</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Landing Page ---
const LandingPage = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="fixed inset-0 z-[200] bg-zinc-950 overflow-y-auto selection:bg-yellow-400 selection:text-black">
      <div className="min-h-screen flex flex-col items-center justify-center py-20 relative">
        {/* Subtle Background Elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-400/5 to-transparent pointer-events-none" />
        
        <div className="max-w-4xl px-4 w-full relative z-10 flex flex-col items-center">
          
          {/* Main Typography */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center space-y-8 mb-16"
          >
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight">
              What is Ignite<span className="text-yellow-400">XT?</span>
            </h1>
            
            {/* Engaging Questions Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center md:justify-items-start text-center md:text-left max-w-2xl mx-auto">
              {[
                "Worried about last-minute notes?",
                "Struggling to track campus events?",
                "Need a collaborative study group?",
                "Looking for premium resources?"
              ].map((q, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center space-x-3 text-zinc-400"
                >
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm md:text-base font-medium">{q}</span>
                </motion.div>
              ))}
            </div>

            <p className="text-white text-lg md:text-2xl font-bold pt-4">
              Don't worry, Ignite<span className="text-yellow-400">XT</span> is your one-stop solution.
            </p>
          </motion.div>

          {/* Action Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            onClick={onStart}
            className="mb-24 px-10 py-5 bg-yellow-400 text-black font-black rounded-2xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 flex items-center space-x-3"
          >
            <span className="tracking-widest">GET STARTED NOW</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
            {[
              { icon: BookOpen, title: "Academic Hub", desc: "Curated notes and study materials." },
              { icon: Users, title: "1000+ Members", desc: "A thriving network of peers." },
              { icon: Calendar, title: "Events", desc: "Stay ahead with tech meetups." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-yellow-400/30 transition-colors"
              >
                <item.icon className="w-6 h-6 text-yellow-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <Footer useLinks={false} />

        </div>
      </div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {!hasStarted && (
          <motion.div
            key="landing"
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <LandingPage onStart={() => setHasStarted(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      <Router>
        <Analytics />
        <div className={cn(
          "min-h-screen bg-black text-white selection:bg-yellow-500/30 selection:text-yellow-500 transition-opacity duration-1000",
          hasStarted ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/notes" element={<ResourcesPage />} />
              <Route path="/events" element={<Events />} />
              <Route path="/communities" element={<CommunitiesPage />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
            </Routes>
          </main>
          <Footer />
          <Analytics />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

const FAQ = () => (
  <div className="pt-32 pb-24 bg-zinc-950 min-h-screen">
    <div className="max-w-3xl mx-auto px-4">
      <div className="space-y-4 mb-12">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Support Center</span>
        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">Frequently Asked <span className="text-yellow-400">Questions</span></h1>
      </div>
      <div className="space-y-6">
        {[
          { q: "What is IgniteXT?", a: "IgniteXT is a student-led community at Anurag University dedicated to providing academic resources, workshops, and mentorship across all colleges." },
          { q: "How can I contribute?", a: "You can contribute by sharing your notes, projects, or by joining our technical or content teams. Reach out via the contact form!" },
          { q: "Are the resources free?", a: "Yes, all resources provided by IgniteXT are completely free for all students." },
          { q: "How do I join a department group?", a: "You can find the WhatsApp group links for each department on our Communities page." }
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="p-8 rounded-2xl bg-zinc-900 border border-white/5 space-y-4 hover:border-yellow-400/20 transition-all"
          >
            <h3 className="text-lg font-bold text-white flex items-center space-x-3">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span>{item.q}</span>
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed pl-4.5 border-l border-yellow-400/10">{item.a}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

const PrivacyPolicy = () => (
  <div className="pt-32 pb-24 bg-zinc-950 min-h-screen">
    <div className="max-w-3xl mx-auto px-4">
      <div className="space-y-4 mb-12">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Legal</span>
        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">Privacy <span className="text-yellow-400">Policy</span></h1>
        <p className="text-zinc-500 text-xs">Last updated: March 20, 2026</p>
      </div>
      <div className="space-y-12 text-zinc-400 text-sm leading-relaxed">
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white">1. Data Collection</h3>
          <p>At IgniteXT, we take your privacy seriously. We collect minimal data, primarily through our contact form (name, email) to respond to your inquiries. We do not use cookies for tracking or sell your data to third parties.</p>
        </section>
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white">2. Data Usage</h3>
          <p>Your data is used solely for community communication and providing requested resources. We use industry-standard security measures to protect any information you share with us through our platform.</p>
        </section>
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white">3. Security</h3>
          <p>We implement a variety of security measures to maintain the safety of your personal information when you enter, submit, or access your personal information.</p>
        </section>
      </div>
    </div>
  </div>
);

const TermsOfService = () => (
  <div className="pt-32 pb-24 bg-zinc-950 min-h-screen">
    <div className="max-w-3xl mx-auto px-4">
      <div className="space-y-4 mb-12">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Legal</span>
        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">Terms of <span className="text-yellow-400">Service</span></h1>
        <p className="text-zinc-500 text-xs">Last updated: March 20, 2026</p>
      </div>
      <div className="space-y-12 text-zinc-400 text-sm leading-relaxed">
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white">1. Use of Resources</h3>
          <p>By using IgniteXT, you agree to use the provided academic resources for educational purposes only. Redistribution for commercial gain or misrepresentation of the materials is strictly prohibited.</p>
        </section>
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white">2. Community Conduct</h3>
          <p>Users are expected to maintain a respectful and collaborative environment. Harassment, abuse, or any form of digital misconduct will result in immediate removal from the community and its platforms.</p>
        </section>
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-white">3. Disclaimer</h3>
          <p>IgniteXT is a student-led initiative. While we strive for accuracy, we are not responsible for any errors in the provided academic materials or any consequences arising from their use.</p>
        </section>
      </div>
    </div>
  </div>
);