// client/src/pages/DashboardPage.jsx - COMPLETE PROFESSIONAL VERSION
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { motion } from "framer-motion";

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
  Award, Download, ExternalLink, MapPin, Clock, 
  TrendingUp, Target, Calendar, Mail, Upload, 
  GraduationCap, BarChart, Users, BrainCircuit,
  Trophy, Zap, Sparkles, BookOpen, Code,
  ShieldCheck, ChevronRight, Star
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
// STUDENT DASHBOARD - RESTORED & ENHANCED
// ============================================
const StudentDashboard = ({ user }) => {
  const [certificates, setCertificates] = useState([]);
  const [poaps, setPoaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, verified: 0, events: 0 });

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
        verified: certs.filter(c => c.isBlockchainVerified).length,
        events: poapData.length
      });
    } catch (err) {
      console.error("Student dashboard load failed");
    } finally {
      setLoading(false);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Certificates</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Award className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-l-4 border-l-pink-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Events Attended</p>
                  <p className="text-3xl font-bold">{stats.events}</p>
                </div>
                <MapPin className="h-8 w-8 text-pink-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Skill Level</p>
                  <p className="text-3xl font-bold">
                    {stats.total >= 10 ? "Advanced" : stats.total >= 5 ? "Intermediate" : "Beginner"}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-l-4 border-l-indigo-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Career Progress</p>
                  <p className="text-3xl font-bold">{Math.min(100, stats.total * 10)}%</p>
                </div>
                <Target className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI RECOMMENDATIONS - RESTORED */}
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
                        {cert.isBlockchainVerified && (
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