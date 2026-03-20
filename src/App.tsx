import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  MessageSquare
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
import { db, auth } from './firebase';

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
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
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

// --- Components ---
const Logo = ({ className = "w-10 h-10", iconOnly = false }: { className?: string, iconOnly?: boolean }) => (
  <div className="flex items-center space-x-3 group">
    <div className={cn("bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-400/40 group-hover:scale-105 transition-transform duration-300 relative overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 to-transparent" />
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-black fill-none stroke-current stroke-[1.5] relative z-10" xmlns="http://www.w3.org/2000/svg">
        {/* Lightbulb base */}
        <path d="M9 18h6M10 21h4M12 15v3" strokeLinecap="round" />
        {/* Brain inside bulb shape */}
        <path d="M12 3c-3.5 0-6 2.5-6 5.5 0 2 1 3.5 2.5 4.5.5.3.5.7.5 1.2v.8h6v-.8c0-.5 0-.9.5-1.2 1.5-1 2.5-2.5 2.5-4.5 0-3-2.5-5.5-6-5.5z" strokeLinecap="round" />
        <path d="M12 5v6M9 8h6" strokeLinecap="round" opacity="0.3" />
        <path d="M12 3c-1 0-2 .5-2 1.5s1 1.5 2 1.5 2 .5 2 1.5-1 1.5-2 1.5" strokeLinecap="round" />
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

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Notes', path: '/notes' },
    { name: 'Events', path: '/events' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/">
            <Logo />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg",
                  location.pathname === link.path 
                    ? "text-yellow-400 bg-yellow-400/10" 
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-zinc-400 hover:text-yellow-400 transition-colors"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden glass border-b border-white/5 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    location.pathname === link.path 
                      ? "bg-yellow-400/10 text-yellow-400" 
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-zinc-950 border-t border-white/5 py-24">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-24">
        <div className="col-span-1 md:col-span-2 space-y-6">
          <Link to="/">
            <Logo className="w-8 h-8" />
          </Link>
          <p className="text-zinc-400 max-w-sm text-sm leading-relaxed">
            The ultimate student community for Anurag University. Empowering students with structured academic resources, events, and a collaborative ecosystem.
          </p>
          <div className="flex space-x-4">
            <a href="https://github.com/ignitext" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg border border-white/5 flex items-center justify-center text-zinc-500 hover:text-yellow-400 hover:border-yellow-400/50 transition-all duration-300">
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
                <Link to={`/${item.toLowerCase()}`} className="text-zinc-400 hover:text-yellow-400 text-sm transition-colors">{item}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-zinc-100 font-semibold mb-6 text-sm">Support</h4>
          <ul className="space-y-3">
            {['Contact', 'Privacy Policy', 'Terms of Service', 'FAQ'].map((item) => (
              <li key={item}>
                <Link 
                  to={item === 'Contact' ? '/contact' : `/${item.toLowerCase().replace(/ /g, '-')}`} 
                  className="text-zinc-400 hover:text-yellow-400 text-sm transition-colors"
                >
                  {item}
                </Link>
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
          <p className="text-zinc-600 text-[10px] tracking-[0.2em] uppercase font-bold">
            Sadiq | Bharath | Mrudhula | Santhoshini | Rohit | Fathima
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
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-yellow-400/[0.07] blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-yellow-400/[0.07] blur-[150px] rounded-full animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-400/[0.03] blur-[200px] rounded-full" />
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-10"
          >
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-yellow-400/20 bg-yellow-400/5 text-yellow-400 text-[10px] font-bold uppercase tracking-[0.2em]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Anurag University's Premier Tech Hub</span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-[1.1]">
              <span className="text-yellow-400">IgniteXT</span> <span className="text-white">x AnuragU</span>
            </h1>
            
            <p className="text-base md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium">
              The ultimate student-led resource hub for Anurag University. Empowering the next generation of innovators.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/events" className="group px-8 py-3.5 bg-yellow-400 text-black font-bold rounded-xl shadow-lg shadow-yellow-400/20 hover:bg-yellow-300 transition-all duration-300 w-full sm:w-auto flex items-center justify-center space-x-2">
                <span>Explore Events</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/notes" className="px-8 py-3.5 bg-zinc-900 text-white font-bold rounded-xl border border-white/5 hover:border-yellow-400/50 transition-all duration-300 w-full sm:w-auto">
                Get Resources
              </Link>
            </div>
          </motion.div>
        </div>
      </section>



      {/* Communities Section */}
      <section className="py-24 bg-zinc-950 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-yellow-400/[0.03] via-transparent to-yellow-400/[0.03]" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-yellow-400/10 text-yellow-400 text-[10px] font-bold uppercase tracking-widest">
                <Users className="w-3 h-3" />
                <span>Join the Community</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                Hello <span className="text-yellow-400">Ignitians!</span> 🌟
              </h2>
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-xl">
                We've created separate department-wise IgniteXT Communities so you can access notes, resources, workshops, contests, career guidance, and event updates.
              </p>
              <div className="pt-4">
                <a 
                  href="https://whatsapp.com/channel/0029VbAfiQzD38CarXrTNj1g" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-3 px-6 py-3 bg-zinc-900 text-white rounded-xl border border-white/5 hover:border-yellow-400/50 transition-all font-bold text-sm"
                >
                  <MessageSquare className="w-4 h-4 text-yellow-400" />
                  <span>Official Announcements Channel</span>
                </a>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {[
                { name: 'CSE', link: 'https://chat.whatsapp.com/DgTk3d9KkthDqV7AFufk9U', icon: '💻' },
                { name: 'DS (Data Science)', link: 'https://chat.whatsapp.com/BXNValVCyNJ0EYxrYbvzwY', icon: '📊' },
                { name: 'ECE', link: 'https://chat.whatsapp.com/JarYz1OKCACAcPVJOXOy1i', icon: '📡' },
                { name: 'IT', link: 'https://chat.whatsapp.com/I0KwboMy8EWEwGqKkhSNt9', icon: '💾' },
                { name: 'AI', link: 'https://chat.whatsapp.com/K9M05Wk0WtpJru7QKXl8R0', icon: '🧠' }
              ].map((dept) => (
                <a 
                  key={dept.name}
                  href={dept.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-yellow-400/30 hover:bg-zinc-900 transition-all flex items-center space-x-4 group"
                >
                  <span className="text-xl">{dept.icon}</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{dept.name}</h4>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Join Group</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-yellow-400 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Technical Team Thanks Section */}
      <section className="py-24 bg-zinc-950 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              Special Thanks to our <span className="text-yellow-400">Technical Team</span>
            </h2>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto">
              The brilliant minds behind the IgniteXT digital experience.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: "Sadiq", role: "Developer" },
              { name: "Bharath", role: "Tech Lead" },
              { name: "Santhoshini", role: "Developer" },
              { name: "Mrudhula", role: "Developer" },
              { name: "Rohit", role: "Developer" },
              { name: "Fathima", role: "Developer" }
            ].map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 text-center space-y-3 group hover:border-yellow-400/30 transition-all"
              >
                <h4 className="text-white font-bold group-hover:text-yellow-400 transition-colors">{member.name}</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{member.role}</p>
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
    { name: "Sadiq", dept: "IT", year: "2nd", role: "Technical Team", category: "Technical Team", bio: "The lead architect behind this platform. Passionate about building seamless digital experiences for the IgniteXT community.", github: "https://github.com/skmdsadiq1607" },
    { name: "Bharath", dept: "AIML", year: "3rd", role: "Technical Team Lead", category: "Technical Team", bio: "Overseeing the technical architecture and development of community tools." },
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
    { name: "Fathima", dept: "AI", year: "2nd", role: "Technical Team", category: "Technical Team", bio: "Implementing AI-powered features to enhance the student experience." },
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
              About <span className="text-yellow-400">IgniteXT</span> <span className="text-white">x AnuragU</span>
            </h1>
            <p className="text-base md:text-lg text-zinc-400 leading-relaxed">
              IgniteXT is more than just a resource hub; it's a vibrant student-led ecosystem at Anurag University. Our mission is to bridge the gap between academic theory and practical innovation by providing students with the tools, community, and support they need to excel.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
              <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 space-y-3">
                <h3 className="text-lg font-semibold text-white">Our Mission</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">To empower every student at Anurag University with high-quality academic resources and a collaborative platform for growth.</p>
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
        <div className="mt-32 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-white tracking-tight">Our Core Values</h2>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto">The principles that guide our community and drive our innovation.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Collaboration', desc: 'We believe in the power of working together to solve complex problems and build better solutions.', icon: Users },
              { title: 'Innovation', desc: 'We constantly push the boundaries of what is possible, encouraging creative thinking and technical mastery.', icon: Sparkles },
              { title: 'Empowerment', desc: 'We provide students with the resources and support they need to take charge of their academic and professional journeys.', icon: Zap }
            ].map((value, i) => (
              <div key={i} className="p-8 rounded-2xl bg-zinc-900 border border-white/5 space-y-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                  <value.icon className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-semibold text-white">{value.title}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Join CTA */}
        <div className="mt-32 p-12 rounded-3xl bg-zinc-900 border border-white/5 relative overflow-hidden text-center space-y-8">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Ready to <span className="text-yellow-400">Ignite</span> your journey?
            </h2>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
              Join the most active student community at Anurag University. Access resources, build projects, and grow with us.
            </p>
            <Link to="/contact" className="inline-flex items-center px-8 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20">
              Join the Community
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
const ResourcesPage = () => {
  const depts = ['CSE', 'IT', 'AIML', 'DS', 'ECE'];
  const years = ['1st', '2nd', '3rd', '4th'];
  const sems = ['Sem 1', 'Sem 2'];

  const [filter, setFilter] = useState({ 
    dept: 'CSE', 
    year: '1st', 
    sem: 'Sem 1' 
  });

  const getExactLink = () => {
    const mapping: any = {
      'IT': {
        'folder': '1tos00iL_zOsPN2wPfLOP9feLA3vtpDFH',
        'years': {
          '1st': { 'Sem 1': '', 'Sem 2': '' },
          '2nd': { 'Sem 1': '', 'Sem 2': '' },
          '3rd': { 'Sem 1': '', 'Sem 2': '' },
          '4th': { 'Sem 1': '', 'Sem 2': '' }
        }
      },
      'CSE': {
        'folder': '121WbRgjQhf-L2wIYxLSm3WgmyfsBEshy',
        'years': {
          '1st': { 'Sem 1': '', 'Sem 2': '' },
          '2nd': { 'Sem 1': '', 'Sem 2': '' },
          '3rd': { 'Sem 1': '', 'Sem 2': '' },
          '4th': { 'Sem 1': '', 'Sem 2': '' }
        }
      },
      'AIML': {
        'folder': '1aOg7PAwONBKi4IhI0pKHRMAvcUX6-c5c',
        'years': {
          '1st': { 'Sem 1': '', 'Sem 2': '' },
          '2nd': { 'Sem 1': '', 'Sem 2': '' },
          '3rd': { 'Sem 1': '', 'Sem 2': '' },
          '4th': { 'Sem 1': '', 'Sem 2': '' }
        }
      },
      'DS': {
        'folder': '1pv_mZMjDbG0rf25TNtFy0TOXSeMbgdch',
        'years': {
          '1st': { 'Sem 1': '', 'Sem 2': '' },
          '2nd': { 'Sem 1': '', 'Sem 2': '' },
          '3rd': { 'Sem 1': '', 'Sem 2': '' },
          '4th': { 'Sem 1': '', 'Sem 2': '' }
        }
      },
      'ECE': {
        'folder': '1krirehu9X9xO5KxKuCL8wjmUreERSrwN',
        'years': {
          '1st': { 'Sem 1': '', 'Sem 2': '' },
          '2nd': { 'Sem 1': '', 'Sem 2': '' },
          '3rd': { 'Sem 1': '', 'Sem 2': '' },
          '4th': { 'Sem 1': '', 'Sem 2': '' }
        }
      }
    };

    const deptData = mapping[filter.dept];
    if (!deptData) return null;

    let link = `https://drive.google.com/drive/folders/${deptData.folder}`;
    
    const specific = deptData.years?.[filter.year]?.[filter.sem];
    if (specific) link = `https://drive.google.com/drive/folders/${specific}`;

    return link;
  };

  const copyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = getExactLink();
    if (link) {
      navigator.clipboard.writeText(link);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-zinc-950 flex flex-col md:flex-row relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-400/[0.02] via-transparent to-transparent pointer-events-none" />
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/5 p-6 space-y-8 sticky top-20 h-[calc(100vh-5rem)]">
        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Department</label>
          <div className="space-y-1">
            {depts.map(dept => (
              <button
                key={dept}
                onClick={() => setFilter({...filter, dept})}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
                  filter.dept === dept ? "bg-yellow-400 text-black font-bold" : "text-zinc-400 hover:bg-white/5"
                )}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Year</label>
          <div className="flex flex-wrap gap-2">
            {years.map(year => (
              <button
                key={year}
                onClick={() => setFilter({...filter, year})}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all border",
                  filter.year === year ? "bg-yellow-400 border-yellow-400 text-black font-bold" : "border-white/10 text-zinc-400 hover:border-white/20"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Semester</label>
          <div className="flex flex-wrap gap-2">
            {sems.map(sem => (
              <button
                key={sem}
                onClick={() => setFilter({...filter, sem})}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-all border",
                  filter.sem === sem ? "bg-yellow-400 border-yellow-400 text-black font-bold" : "border-white/10 text-zinc-400 hover:border-white/20"
                )}
              >
                {sem}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Access Sidebar (Mobile/Fallback) */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Quick Actions</label>
          </div>
          <a 
            href={getExactLink() || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20 group hover:bg-yellow-400/10 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Open Drive</span>
                <span className="text-[10px] text-zinc-500">New Tab</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-yellow-400 transition-colors" />
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              <Link to="/" className="hover:text-yellow-400">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-yellow-500">Resources</span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Academic <span className="text-yellow-400">Resources</span>
            </h1>
          </div>
        </div>

        {/* Direct Access Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 md:p-12 rounded-2xl bg-zinc-900 border border-yellow-400/20 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Zap className="w-48 h-48 text-yellow-400" />
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Direct Drive Access</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {filter.dept} {filter.year} Year <span className="text-yellow-400">{filter.sem}</span>
              </h2>
              <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
                Access the complete repository for your current selection. This folder contains all structured notes, previous year papers, and reference materials.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a 
                href={getExactLink() || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center space-x-3 px-8 py-4 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
              >
                <ExternalLink className="w-5 h-5" />
                <span>Open Google Drive</span>
              </a>
              <button 
                onClick={copyLink}
                className="w-full sm:w-auto flex items-center justify-center space-x-3 px-8 py-4 rounded-xl bg-zinc-950 border border-white/10 text-white font-bold hover:border-yellow-400/50 transition-all"
              >
                <Zap className="w-5 h-5 text-yellow-400" />
                <span>Copy Folder Link</span>
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

const Events = () => {
  const events: { title: string; date: string; type: 'upcoming' | 'past'; category: string; desc: string }[] = [];

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  return (
    <div className="pt-24 pb-24 bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-500">Stay Updated</span>
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">Campus <span className="text-yellow-400">Events</span></h1>
            <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">Join us for workshops, hackathons, and community meetups designed to ignite your potential.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a 
              href="https://chat.whatsapp.com/LQBXD6W3Oi9LaU30Ft9mKu" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-6 py-2.5 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-bold text-sm hover:bg-yellow-400 hover:text-black transition-all group"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Events Community</span>
              <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
            </a>
            
            <div className="flex p-1 bg-zinc-900 rounded-xl border border-white/5">
              <button 
                onClick={() => setActiveTab('upcoming')}
                className={cn(
                  "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === 'upcoming' ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20" : "text-zinc-400 hover:text-white"
                )}
              >
                Upcoming
              </button>
              <button 
                onClick={() => setActiveTab('past')}
                className={cn(
                  "px-6 py-2 rounded-lg text-sm font-bold transition-all",
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
                We're currently planning some amazing {activeTab} events for the community. Check back soon or join our WhatsApp channel for instant updates.
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
        to: 'skmdsadiq1607@gmail.com',
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
                { icon: Mail, title: 'Email Us', value: 'skmdsadiq1607@gmail.com', link: 'mailto:skmdsadiq1607@gmail.com' },
                { icon: MessageSquare, title: 'WhatsApp', value: 'Official Channel', link: 'https://whatsapp.com/channel/0029VbAfiQzD38CarXrTNj1g' },
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

            <div className="p-8 md:p-10 rounded-2xl bg-zinc-900 border border-white/5 space-y-6 relative">
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
                      href={`mailto:skmdsadiq1607@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(formData.message)}`}
                      className="inline-flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Open in Email Client</span>
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

// --- Main App ---
export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-black text-white selection:bg-yellow-500/30 selection:text-yellow-500">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/notes" element={<ResourcesPage />} />
              <Route path="/events" element={<Events />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
            </Routes>
          </main>
          <Footer />
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
          { q: "What is IgniteXT?", a: "IgniteXT is a student-led community at Anurag University dedicated to providing academic resources, workshops, and mentorship." },
          { q: "How can I contribute?", a: "You can contribute by sharing your notes, projects, or by joining our technical or content teams. Reach out via the contact form!" },
          { q: "Are the resources free?", a: "Yes, all resources provided by IgniteXT are completely free for all Anurag University students." },
          { q: "How do I join a department group?", a: "You can find the WhatsApp group links for each department on our Home page under the 'Communities' section." }
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
