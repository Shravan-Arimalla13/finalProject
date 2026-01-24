// client/src/pages/ProfilePage.jsx - COMPLETE VERSION
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  Trophy, Medal, Star, Share2, Download, ExternalLink, 
  ShieldCheck, Award, MapPin, Calendar, Clock, 
  TrendingUp, Zap, Target, Sparkles, ChevronRight,
  Code, BookOpen, Briefcase, GraduationCap,
  Copy, Check, Github, Linkedin, Twitter, Mail, Edit2, Save, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-item";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const getRank = (count) => {
  if (count >= 20) return { name: "Legend", color: "from-purple-500 to-pink-500", icon: Trophy, level: 5 };
  if (count >= 10) return { name: "Expert", color: "from-red-500 to-orange-500", icon: Medal, level: 4 };
  if (count >= 5) return { name: "Advanced", color: "from-yellow-500 to-amber-500", icon: Star, level: 3 };
  if (count >= 2) return { name: "Intermediate", color: "from-blue-500 to-cyan-500", icon: Award, level: 2 };
  return { name: "Starter", color: "from-green-500 to-emerald-500", icon: ShieldCheck, level: 1 };
};

const ProfilePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [poaps, setPoaps] = useState([]);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedCert, setCopiedCert] = useState(null);
  
  // Social links state
  const [socialLinks, setSocialLinks] = useState({
    linkedin: '',
    github: '',
    twitter: '',
    email: user?.email || ''
  });
  const [editingSocial, setEditingSocial] = useState(false);
  const [tempSocialLinks, setTempSocialLinks] = useState({...socialLinks});

  useEffect(() => {
    if (user) {
      loadProfileData();
      // Load saved social links from localStorage
      const savedLinks = localStorage.getItem(`social_links_${user.id}`);
      if (savedLinks) {
        const parsed = JSON.parse(savedLinks);
        setSocialLinks(parsed);
        setTempSocialLinks(parsed);
      } else {
        setSocialLinks(prev => ({ ...prev, email: user.email }));
        setTempSocialLinks(prev => ({ ...prev, email: user.email }));
      }
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Fetch real certificates
      const certRes = await api.get('/certificates/my-certificates');
      setCertificates(certRes.data || []);
      
      // Fetch real POAPs
      const poapRes = await api.get('/poap/my-poaps');
      setPoaps(poapRes.data || []);
      
      console.log('✅ Profile data loaded:', { 
        certificates: certRes.data?.length, 
        poaps: poapRes.data?.length 
      });
    } catch (error) {
      console.error('Failed to load profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSocialLinks = () => {
    setSocialLinks(tempSocialLinks);
    localStorage.setItem(`social_links_${user.id}`, JSON.stringify(tempSocialLinks));
    setEditingSocial(false);
    toast.success('Social links updated!');
  };

  const handleCancelEdit = () => {
    setTempSocialLinks(socialLinks);
    setEditingSocial(false);
  };

  const openSocialLink = (platform) => {
    const urls = {
      linkedin: socialLinks.linkedin?.startsWith('http') 
        ? socialLinks.linkedin 
        : `https://linkedin.com/in/${socialLinks.linkedin}`,
      github: socialLinks.github?.startsWith('http') 
        ? socialLinks.github 
        : `https://github.com/${socialLinks.github}`,
      twitter: socialLinks.twitter?.startsWith('http') 
        ? socialLinks.twitter 
        : `https://twitter.com/${socialLinks.twitter}`,
      email: `mailto:${socialLinks.email}`
    };
    
    if (socialLinks[platform]) {
      window.open(urls[platform], '_blank');
    } else {
      toast.info(`Add your ${platform} profile first!`);
      setEditingSocial(true);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'wallet') {
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
      toast.success('Wallet address copied!');
    } else {
      setCopiedCert(text);
      setTimeout(() => setCopiedCert(null), 2000);
      toast.success('Certificate ID copied!');
    }
  };

  const shareCredential = (cert) => {
    const shareText = `I just earned a verified blockchain credential for ${cert.eventName}! 🎓`;
    const verifyUrl = `${window.location.origin}/verify/${cert.certificateId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Certificate',
        text: shareText,
        url: verifyUrl
      });
    } else {
      const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
      window.open(linkedinUrl, '_blank');
    }
  };

  // Calculate real stats
  const stats = {
    totalCerts: certificates.length,
    verifiedCerts: certificates.filter(c => c.isBlockchainVerified !== false).length,
    eventsAttended: poaps.length,
    skillsAcquired: [...new Set(certificates.flatMap(c => 
      [c.eventName.split(' ')[0], c.eventName.split(' ')[1]].filter(Boolean)
    ))].length || certificates.length * 2,
    avgScore: poaps.length > 0 
      ? Math.round(poaps.reduce((sum, p) => sum + (p.attendanceScore || 100), 0) / poaps.length)
      : 100
  };

  const rank = getRank(stats.totalCerts);
  const RankIcon = rank.icon;
  const nextRankAt = rank.level === 5 ? null : [2, 5, 10, 20][rank.level];
  const progressToNext = nextRankAt ? ((stats.totalCerts / nextRankAt) * 100) : 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-blue-950/10 dark:to-purple-950/10 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-blue-950/10 dark:to-purple-950/10 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "32px 32px"
            }} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <motion.div whileHover={{ scale: 1.05 }} className="relative">
              <div className="h-32 w-32 rounded-full border-4 border-white/30 overflow-hidden shadow-2xl bg-white/10 backdrop-blur-sm">
                <img 
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
                  alt={user?.name}
                  className="h-full w-full object-cover"
                />
              </div>
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
                {user?.name}
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4"
              >
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-sm font-medium">{user?.department}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">Semester {user?.semester || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">{rank.name}</span>
                </div>
              </motion.div>

              {/* Wallet Address */}
              {user?.walletAddress && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 justify-center md:justify-start"
                >
                  <div className="bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg flex items-center gap-2 group">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="font-mono text-sm">
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(user.walletAddress, 'wallet')}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                      {copiedWallet ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Social Links */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col gap-2"
            >
              <div className="flex gap-2">
                <motion.button 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => openSocialLink('linkedin')}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                  title={socialLinks.linkedin || 'Add LinkedIn'}
                >
                  <Linkedin className="h-5 w-5" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => openSocialLink('github')}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                  title={socialLinks.github || 'Add GitHub'}
                >
                  <Github className="h-5 w-5" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.95 }} 
                  onClick={() => openSocialLink('email')}
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                  title={socialLinks.email}
                >
                  <Mail className="h-5 w-5" />
                </motion.button>
              </div>
              <Button
                onClick={() => setEditingSocial(true)}
                variant="ghost"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white text-xs"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit Links
              </Button>
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
                <span className="font-mono">{stats.totalCerts}/{nextRankAt}</span>
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

        {/* Social Links Edit Modal */}
        <AnimatePresence>
          {editingSocial && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => handleCancelEdit()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Edit Social Links</h3>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Linkedin className="h-4 w-4 text-blue-600" />
                      LinkedIn Profile
                    </label>
                    <Input
                      placeholder="username or full URL"
                      value={tempSocialLinks.linkedin}
                      onChange={(e) => setTempSocialLinks({...tempSocialLinks, linkedin: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Github className="h-4 w-4" />
                      GitHub Profile
                    </label>
                    <Input
                      placeholder="username or full URL"
                      value={tempSocialLinks.github}
                      onChange={(e) => setTempSocialLinks({...tempSocialLinks, github: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Twitter className="h-4 w-4 text-blue-400" />
                      Twitter/X Profile
                    </label>
                    <Input
                      placeholder="username or full URL"
                      value={tempSocialLinks.twitter}
                      onChange={(e) => setTempSocialLinks({...tempSocialLinks, twitter: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={handleSaveSocialLinks}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Certificates", value: stats.totalCerts, icon: Award, color: "blue" },
            { label: "Events", value: stats.eventsAttended, icon: MapPin, color: "purple" },
            { label: "Skills", value: stats.skillsAcquired, icon: Code, color: "green" },
            { label: "Avg Score", value: `${stats.avgScore}%`, icon: TrendingUp, color: "orange" },
            { label: "Verified", value: stats.verifiedCerts, icon: ShieldCheck, color: "pink" }
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
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      Recent Achievements
                    </h3>
                    {certificates.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Award className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>No certificates yet. Start earning by attending events!</p>
                        <Link to="/browse-events" className="mt-4 inline-block">
                          <Button>Browse Events</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {certificates.slice(0, 2).map((cert) => (
                          <motion.div
                            key={cert._id}
                            whileHover={{ scale: 1.02 }}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <Award className="h-8 w-8 text-blue-500" />
                              {cert.isBlockchainVerified !== false && (
                                <ShieldCheck className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                            <h4 className="font-bold mb-1 line-clamp-1">{cert.eventName}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                              {new Date(cert.eventDate || cert.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex gap-2">
                              <Link to={`/verify/${cert.certificateId}`} className="flex-1">
                                <button className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                  View
                                </button>
                              </Link>
                              <button 
                                onClick={() => shareCredential(cert)}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* CERTIFICATES TAB */}
              {activeTab === 'certificates' && (
                <motion.div
                  key="certificates"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {certificates.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Award className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-600 dark:text-slate-400 mb-4">No certificates earned yet</p>
                      <Link to="/browse-events">
                        <Button>Browse Events</Button>
                      </Link>
                    </div>
                  ) : (
                    certificates.map((cert, i) => (
                      <motion.div
                        key={cert._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ y: -5 }}
                        className="group relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg hover:shadow-2xl transition-all"
                      >
                        <div className="h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative">
                          <div className="absolute inset-0 bg-black/20" />
                          {cert.isBlockchainVerified !== false && (
                            <div className="absolute top-4 right-4">
                              <ShieldCheck className="h-6 w-6 text-white" />
                            </div>
                          )}
                          <div className="absolute bottom-4 left-4 right-4">
                            <h4 className="font-bold text-white line-clamp-2 text-sm">
                              {cert.eventName}
                            </h4>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Issued</span>
                            <span className="font-medium">
                              {new Date(cert.eventDate || cert.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Link to={`/verify/${cert.certificateId}`} className="flex-1">
                              <button className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                                <ExternalLink className="h-3 w-3" />
                                Verify
                              </button>
                            </Link>
                            <a
                              href={cert.ipfsUrl || `https://finalproject-jq2d.onrender.com/api/certificates/download/${cert.certificateId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1"
                            >
                              <button className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                <Download className="h-3 w-3" />
                                Download
                              </button>
                            </a>
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
                    ))
                  )}
                </motion.div>
              )}

              {/* ATTENDANCE TAB */}
              {activeTab === 'attendance' && (
                <motion.div
                  key="attendance"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {poaps.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                      <p className="text-slate-600 dark:text-slate-400 mb-4">No attendance records yet</p>
                      <Link to="/browse-events">
                        <Button>Find Events to Attend</Button>
                      </Link>
                    </div>
                  ) : (
                    poaps.map((poap, i) => (
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
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Quick Actions Card */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/student/quizzes">
                <Button variant="outline" className="w-full justify-start">
                  <Code className="h-4 w-4 mr-2" />
                  Take Skill Quiz
                </Button>
              </Link>
              <Link to="/browse-events">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Upcoming Events
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" className="w-full justify-start">
                  <Trophy className="h-4 w-4 mr-2" />
                  View Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;