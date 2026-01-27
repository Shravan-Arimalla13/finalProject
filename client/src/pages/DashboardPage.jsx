// client/src/pages/DashboardPage.jsx - COMPLETE PROFESSIONAL VERSION
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { motion } from "framer-motion";
import { Wallet, Link as LinkIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-item";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import SmartRecommendations from "../components/SmartRecommendations";

// Icons
import {
  Award,
  Download,
  ExternalLink,
  MapPin,
  Clock,
  TrendingUp,
  Target,
  Calendar,
  Mail,
  Upload,
  GraduationCap,
  BarChart,
  Users,
  BrainCircuit,
  Trophy,
  Zap,
  Sparkles,
  BookOpen,
  Code,
  ShieldCheck,
  ChevronRight,
  Star,
  Share2,
  Copy,
  AlertCircle,
} from "lucide-react";


// ============================================
// SUPERADMIN DASHBOARD
// ============================================
const SuperAdminDashboard = ({ user }) => {
  const modules = [
    {
      title: "Invite Faculty",
      desc: "Send invites to new Dept. Admins.",
      icon: Mail,
      link: "/admin/invite",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Import Roster",
      desc: "Upload CSV to add students.",
      icon: Upload,
      link: "/admin/roster",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Manage Students",
      desc: "View registered students.",
      icon: Users,
      link: "/admin/students",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Manage Events",
      desc: "Create events & issue certs.",
      icon: Calendar,
      link: "/events",
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Analytics",
      desc: "View college statistics.",
      icon: BarChart,
      link: "/admin/analytics",
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: "View Faculty List",
      desc: "See all department admins.",
      icon: Users,
      link: "/admin/faculty",
      color: "text-indigo-600",
      bg: "bg-indigo-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">SuperAdmin Dashboard</h1>
        <p className="text-muted-foreground">Manage the entire credentialing system</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={mod.link}>
              <Card className="h-full hover:shadow-lg transition-all cursor-pointer group hover:border-primary">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className={`h-16 w-16 rounded-full ${mod.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <mod.icon className={`h-8 w-8 ${mod.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{mod.title}</h3>
                    <p className="text-sm text-muted-foreground">{mod.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// FACULTY DASHBOARD
// ============================================
const FacultyDashboard = ({ user }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome, {user.name}</h1>
      <p className="text-muted-foreground">Department: {user.department}</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Link to="/events">
        <Card className="hover:shadow-lg transition-all cursor-pointer group">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Manage Events</h3>
              <p className="text-sm text-muted-foreground">Create and track events</p>
            </div>
          </CardContent>
        </Card>
      </Link>

      <Link to="/faculty/quiz">
        <Card className="hover:shadow-lg transition-all cursor-pointer group">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BrainCircuit className="h-8 w-8 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Create AI Quiz</h3>
              <p className="text-sm text-muted-foreground">AI-powered assessments</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  </div>
);



// ============================================
// WALLET CONNECTION COMPONENT
// ============================================
// BULLETPROOF WalletConnectionCard - Prevents -32002 Error
// Replace in client/src/pages/DashboardPage.jsx

// ============================================
// SIMPLE & WORKING Wallet Connection Component
// Copy this COMPLETE component to replace WalletConnectionCard
// ============================================

const WalletConnectionCard = ({ user, onWalletConnected }) => {
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || null);
  const [copied, setCopied] = useState(false);

  const connectWallet = async () => {
    // Prevent double-clicks
    if (connecting) {
      toast.info('Already connecting, please wait...');
      return;
    }

    if (!window.ethereum) {
      toast.error('MetaMask not installed!', {
        description: 'Install MetaMask extension first'
      });
      return;
    }

    setConnecting(true);

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const address = accounts[0];
      await api.post('/users/save-wallet', { walletAddress: address });

      setWalletAddress(address);
      toast.success('Wallet connected!');
      
      if (onWalletConnected) onWalletConnected(address);

    } catch (error) {
      if (error.code === -32002) {
        toast.error('Close MetaMask popups and refresh page!');
      } else if (error.code === 4001) {
        toast.warning('Connection rejected');
      } else {
        toast.error('Connection failed: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setTimeout(() => setConnecting(false), 2000);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-l-4 border-l-indigo-500 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg">MetaMask Wallet</h3>
            <p className="text-sm text-muted-foreground">
              {walletAddress ? 'Connected' : 'Connect for blockchain'}
            </p>
          </div>
        </div>

        {walletAddress ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">Connected</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono text-green-700">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                  <button onClick={copyAddress} className="p-1 hover:bg-green-100 rounded">
                    {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                ✅ Enabled:
              </p>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li>• NFT certificates</li>
                <li>• SIWE login</li>
                <li>• Event POAPs</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert className="bg-amber-50 dark:bg-amber-900/10 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                Connect wallet to unlock blockchain features
              </AlertDescription>
            </Alert>

            <Button 
              onClick={connectWallet} 
              disabled={connecting}
              className="w-full"
              size="lg"
            >
              {connecting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Connect MetaMask
                </>
              )}
            </Button>

            {connecting && (
              <p className="text-xs text-center text-blue-600">
                👀 Check for MetaMask popup!
              </p>
            )}

            {!connecting && (
              <p className="text-xs text-center text-muted-foreground">
                Don't have MetaMask?{' '}
                <a href="https://metamask.io/download" target="_blank" className="text-blue-600 hover:underline">
                  Install here
                </a>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================
// IMMEDIATE FIX FOR -32002 ERROR
// ============================================
// If you STILL get the error after using this code:
//
// 1. Close ALL browser tabs
// 2. Restart browser completely
// 3. Open MetaMask → Settings → Advanced → "Clear activity tab data"
// 4. Refresh the page
// 5. Try connecting again
//
// This simple version:
// ✅ Prevents double-clicks (2 second cooldown)
// ✅ Shows clear error messages
// ✅ No useRef needed
// ✅ Works on all browsers


// ============================================
// BONUS: MetaMask Connection Checker
// Add this utility function to help debug
// ============================================

const checkMetaMaskStatus = async () => {
  if (!window.ethereum) {
    return { 
      installed: false, 
      message: 'MetaMask not detected' 
    };
  }

  try {
    // Check if MetaMask is locked
    const accounts = await window.ethereum.request({ 
      method: 'eth_accounts' // This doesn't prompt, just checks
    });

    if (accounts.length === 0) {
      return {
        installed: true,
        locked: true,
        message: 'MetaMask is locked. Please unlock it.'
      };
    }

    return {
      installed: true,
      locked: false,
      connected: true,
      currentAccount: accounts[0],
      message: 'MetaMask is ready'
    };
  } catch (error) {
    return {
      installed: true,
      error: true,
      message: error.message
    };
  }
};

// Usage: Call before connecting
// const status = await checkMetaMaskStatus();
// console.log('MetaMask Status:', status);


// ============================================
// STUDENT DASHBOARD - RESTORED & ENHANCED
// ============================================
const StudentDashboard = ({ user }) => {
  const [certificates, setCertificates] = useState([]);
  const [poaps, setPoaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, verified: 0, events: 0 });
  const [walletConnected, setWalletConnected] = useState(!!user?.walletAddress);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [certRes, poapRes] = await Promise.all([
        api.get("/certificates/my-certificates"),
        api.get("/poap/my-poaps")
      ]);

      const certs = certRes.data || [];
      const poapData = poapRes.data || [];

      setCertificates(certs);
      setPoaps(poapData);
      setStats({
        total: certs.length,
        verified: certs.filter(c => c.isBlockchainVerified !== false).length,
        events: poapData.length
      });
    } catch (err) {
      console.error("Student dashboard load failed:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnected = (address) => {
    setWalletConnected(true);
    console.log('✅ Wallet connected in dashboard:', address);
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HERO SECTION */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "24px 24px"
          }} />
        </div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name}</h1>
          <p className="opacity-90 mb-4">{user.department} • {user.usn}</p>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <Link to="/browse-events" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg backdrop-blur-sm transition-all">
              <Calendar className="h-4 w-4" />
              Browse Events
            </Link>
            <Link to="/profile" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg backdrop-blur-sm transition-all">
              <Trophy className="h-4 w-4" />
              My Achievements
            </Link>
          </div>
        </div>
      </motion.div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Certificates", value: stats.total, icon: Award, color: "blue" },
          { label: "Events", value: stats.events, icon: MapPin, color: "purple" },
          { label: "Verified", value: stats.verified, icon: ShieldCheck, color: "green" },
          { label: "Score", value: `${Math.min(100, stats.total * 10)}%`, icon: TrendingUp, color: "orange" }
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

      {/* 🆕 WALLET CONNECTION CARD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <WalletConnectionCard user={user} onWalletConnected={handleWalletConnected} />
      </motion.div>

      {/* AI RECOMMENDATIONS */}
      <SmartRecommendations />

      {/* CREDENTIALS SECTION */}
      <Tabs defaultValue="certificates" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="certificates" className="gap-2">
            <Award className="h-4 w-4" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="poaps" className="gap-2">
            <MapPin className="h-4 w-4" />
            Attendance
          </TabsTrigger>
        </TabsList>

        {/* CERTIFICATES TAB */}
        <TabsContent value="certificates" className="mt-6">
          {certificates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No certificates yet</p>
                <Link to="/browse-events">
                  <Button>Browse Events</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((cert) => (
                <motion.div
                  key={cert._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="overflow-hidden border-t-4 border-t-blue-500 hover:shadow-xl transition-all">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg leading-tight flex-1">
                          {cert.eventName}
                        </h3>
                        {cert.isBlockchainVerified !== false && (
                          <ShieldCheck className="h-5 w-5 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-sm text-white/80">
                        Issued {new Date(cert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-2">
                        <Link to={`/verify/${cert.certificateId}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <ExternalLink className="h-3 w-3 mr-2" />
                            Verify
                          </Button>
                        </Link>
                        <a
                          href={cert.ipfsUrl || `https://finalproject-jq2d.onrender.com/api/certificates/download/${cert.certificateId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button size="sm" className="w-full">
                            <Download className="h-3 w-3 mr-2" />
                            Download
                          </Button>
                        </a>
                      </div>
                      <Button
                        onClick={() => shareCredential(cert)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Share2 className="h-3 w-3 mr-2" />
                        Share
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* POAPS TAB */}
        <TabsContent value="poaps" className="mt-6">
          {poaps.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No attendance records yet</p>
                <Link to="/browse-events">
                  <Button>Find Events to Attend</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {poaps.map((poap) => (
                <Card key={poap._id} className="border-l-4 border-l-pink-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold flex-1">{poap.eventName}</h4>
                      <Badge variant="outline" className="ml-2">
                        {poap.attendanceScore}%
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {new Date(poap.checkInTime).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        GPS Verified
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* QUICK ACTIONS */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/student/quizzes">
              <Button variant="outline" className="w-full justify-start">
                <BrainCircuit className="h-4 w-4 mr-2" />
                Take Skill Quiz
              </Button>
            </Link>
            <Link to="/browse-events">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Upcoming Events
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" className="w-full justify-start">
                <Trophy className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================
function DashboardPage() {
  const { user } = useAuth();

  const renderDashboard = () => {
    if (!user) {
      return (
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      );
    }

    switch (user.role) {
      case "SuperAdmin":
        return <SuperAdminDashboard user={user} />;
      case "Faculty":
        return <FacultyDashboard user={user} />;
      case "Student":
        return <StudentDashboard user={user} />;
      default:
        return (
          <Alert variant="destructive">
            <AlertDescription>Unknown user role.</AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-blue-950/10 dark:to-purple-950/10 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {renderDashboard()}
      </div>
    </div>
  );
}

export default DashboardPage;