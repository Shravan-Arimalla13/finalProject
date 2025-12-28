import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Medal, Star, Share2, Download, ExternalLink, 
  ShieldCheck, Award, MapPin, Calendar, Clock, 
  TrendingUp, Zap, Target, Sparkles, ChevronRight,
  Code, BookOpen, Briefcase, GraduationCap,
  Copy, Check, Github, Linkedin, Twitter, Mail
} from "lucide-react";

// Mock Data (replace with actual API calls)
const mockUser = {
  name: "Alex Johnson",
  email: "alex.johnson@college.edu",
  department: "Computer Science",
  usn: "1CS22CS001",
  semester: "6th",
  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Alex Johnson",
  joinDate: "2022-08-15",
  walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5"
};

const mockCertificates = [
  {
    _id: "1",
    eventName: "Full-Stack Web Development Bootcamp",
    eventDate: "2024-11-15",
    certificateId: "CERT-FS2024-001",
    isBlockchainVerified: true,
    skills: ["React", "Node.js", "MongoDB"],
    issuer: "Tech Academy",
    transactionHash: "0xabc123..."
  },
  {
    _id: "2", 
    eventName: "AI & Machine Learning Workshop",
    eventDate: "2024-10-20",
    certificateId: "CERT-AI2024-002",
    isBlockchainVerified: true,
    skills: ["Python", "TensorFlow", "Neural Networks"],
    issuer: "AI Institute",
    transactionHash: "0xdef456..."
  },
  {
    _id: "3",
    eventName: "Blockchain Developer Certification",
    eventDate: "2024-09-10",
    certificateId: "CERT-BC2024-003", 
    isBlockchainVerified: true,
    skills: ["Solidity", "Smart Contracts", "Web3"],
    issuer: "Blockchain Academy",
    transactionHash: "0xghi789..."
  }
];

const mockPOAPs = [
  { _id: "1", eventName: "DevCon 2024", checkInTime: "2024-11-01T10:30:00", attendanceScore: 100 },
  { _id: "2", eventName: "Hackathon Finals", checkInTime: "2024-10-15T09:00:00", attendanceScore: 95 }
];

const mockStats = {
  totalCerts: 8,
  verifiedCerts: 8,
  eventsAttended: 12,
  skillsAcquired: 24,
  avgScore: 94
};

const getRank = (count) => {
  if (count >= 20) return { name: "Legend", color: "from-purple-500 to-pink-500", icon: Trophy, level: 5 };
  if (count >= 10) return { name: "Expert", color: "from-red-500 to-orange-500", icon: Medal, level: 4 };
  if (count >= 5) return { name: "Advanced", color: "from-yellow-500 to-amber-500", icon: Star, level: 3 };
  if (count >= 2) return { name: "Intermediate", color: "from-blue-500 to-cyan-500", icon: Award, level: 2 };
  return { name: "Starter", color: "from-green-500 to-emerald-500", icon: ShieldCheck, level: 1 };
};

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedCert, setCopiedCert] = useState(null);
  
  const rank = getRank(mockStats.totalCerts);
  const RankIcon = rank.icon;
  const nextRankAt = rank.level === 5 ? null : [2, 5, 10, 20][rank.level];
  const progressToNext = nextRankAt ? ((mockStats.totalCerts / nextRankAt) * 100) : 100;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'wallet') {
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    } else {
      setCopiedCert(text);
      setTimeout(() => setCopiedCert(null), 2000);
    }
  };

  const shareCredential = (cert) => {
    const shareText = `I just earned a verified blockchain credential for ${cert.eventName}! 🎓 Verify it here:`;
    const verifyUrl = `https://your-domain.com/verify/${cert.certificateId}`;
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
    window.open(linkedinUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-blue-950/10 dark:to-purple-950/10 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl"
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "32px 32px"
            }} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative"
            >
              <div className="h-32 w-32 rounded-full border-4 border-white/30 overflow-hidden shadow-2xl bg-white/10 backdrop-blur-sm">
                <img 
                  src={mockUser.avatar} 
                  alt={mockUser.name}
                  className="h-full w-full object-cover"
                />
              </div>
              {/* Rank Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className={`absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-gradient-to-br ${rank.color} flex items-center justify-center border-4 border-white shadow-lg`}
              >
                <RankIcon className="h-6 w-6 text-white" />
              </motion.div>
            </motion.div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl font-bold mb-2"
              >
                {mockUser.name}
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4"
              >
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-sm font-medium">{mockUser.department}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">Semester {mockUser.semester}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">{rank.name}</span>
                </div>
              </motion.div>

              {/* Wallet Address */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 justify-center md:justify-start"
              >
                <div className="bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center gap-2 group">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-mono text-sm">
                    {mockUser.walletAddress.slice(0, 6)}...{mockUser.walletAddress.slice(-4)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(mockUser.walletAddress, 'wallet')}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                  >
                    {copiedWallet ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex gap-2"
            >
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                <Linkedin className="h-5 w-5" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                <Github className="h-5 w-5" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                <Mail className="h-5 w-5" />
              </motion.button>
            </motion.div>
          </div>

          {/* Progress Bar */}
          {nextRankAt && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 relative z-10"
            >
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Progress to {["Intermediate", "Advanced", "Expert", "Legend"][rank.level]}</span>
                <span className="font-mono">{mockStats.totalCerts}/{nextRankAt}</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNext}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-white to-yellow-200 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Certificates", value: mockStats.totalCerts, icon: Award, color: "blue" },
            { label: "Events", value: mockStats.eventsAttended, icon: MapPin, color: "purple" },
            { label: "Skills", value: mockStats.skillsAcquired, icon: Code, color: "green" },
            { label: "Avg Score", value: `${mockStats.avgScore}%`, icon: TrendingUp, color: "orange" },
            { label: "Verified", value: mockStats.verifiedCerts, icon: ShieldCheck, color: "pink" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-800 relative overflow-hidden group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative z-10">
                <stat.icon className={`h-8 w-8 text-${stat.color}-500 mb-2`} />
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex gap-1 p-2">
              {[
                { id: 'overview', label: 'Overview', icon: Sparkles },
                { id: 'certificates', label: 'Certificates', icon: Award },
                { id: 'attendance', label: 'Attendance', icon: MapPin }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Recent Achievements */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      Recent Achievements
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {mockCertificates.slice(0, 2).map((cert) => (
                        <motion.div
                          key={cert._id}
                          whileHover={{ scale: 1.02 }}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <Award className="h-8 w-8 text-blue-500" />
                            <ShieldCheck className="h-5 w-5 text-green-500" />
                          </div>
                          <h4 className="font-bold mb-1 line-clamp-1">{cert.eventName}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            {new Date(cert.eventDate).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2">
                            <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                              View
                            </button>
                            <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                              <Share2 className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Skills Overview */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Code className="h-5 w-5 text-green-500" />
                      Skills Acquired
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {["React", "Node.js", "Python", "Solidity", "AI/ML", "Blockchain", "Web3", "Docker"].map((skill) => (
                        <motion.div
                          key={skill}
                          whileHover={{ scale: 1.05 }}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium shadow-lg"
                        >
                          {skill}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'certificates' && (
                <motion.div
                  key="certificates"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {mockCertificates.map((cert, i) => (
                    <motion.div
                      key={cert._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ y: -5 }}
                      className="group relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg hover:shadow-2xl transition-all"
                    >
                      {/* Gradient Header */}
                      <div className="h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative">
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-4 right-4">
                          <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <h4 className="font-bold text-white line-clamp-2 text-sm">
                            {cert.eventName}
                          </h4>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Issued</span>
                          <span className="font-medium">{new Date(cert.eventDate).toLocaleDateString()}</span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {cert.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                            <ExternalLink className="h-3 w-3" />
                            Verify
                          </button>
                          <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                            <Download className="h-3 w-3" />
                            Download
                          </button>
                        </div>

                        <button
                          onClick={() => shareCredential(cert)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                        >
                          <Share2 className="h-3 w-3" />
                          Share on LinkedIn
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'attendance' && (
                <motion.div
                  key="attendance"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {mockPOAPs.map((poap, i) => (
                    <motion.div
                      key={poap._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold">{poap.eventName}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {new Date(poap.checkInTime).toLocaleDateString()} at {new Date(poap.checkInTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">{poap.attendanceScore}%</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Score</div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;