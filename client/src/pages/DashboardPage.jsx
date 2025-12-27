// In client/src/pages/DashboardPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { BrainCircuit } from "lucide-react";
import { MapPin, Clock } from "lucide-react";
// --- SHADCN IMPORTS ---
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SmartRecommendations from "../components/SmartRecommendations"; // <-- IMPORT
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Badge } from "@/components/ui/badge-item";
import { Label } from "@/components/ui/label"; // <-- Added missing Label import
import {
  MoreHorizontal,
  Sparkles,
  Award,
  Download,
  Search,
  Share2,
  ExternalLink,
  Users,
  Calendar,
  Mail,
  Upload,
  GraduationCap,
  Cloud,
  BarChart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import {
  ShieldCheck, TrendingUp, Target, ArrowRight,
  Copy, Check, Briefcase, Trophy
} from "lucide-react";

// ---

// --- VISUAL CARD COMPONENT ---
const CertificateVisualCard = ({ cert }) => (
  <div className="group relative bg-card text-card-foreground rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border">
    {/* Visual Header */}
    <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative p-4 flex flex-col justify-between">
      <div className="absolute top-0 right-0 p-2 opacity-10">
        <Award className="h-24 w-24 text-white" />
      </div>
      <Badge className="self-start bg-black/20 hover:bg-black/30 text-white border-none backdrop-blur-sm">
        {cert.isBlockchainVerified ? "Verified on-chain" : "Pending"}
      </Badge>
      <h3 className="text-white font-bold text-lg truncate leading-tight relative z-10">
        {cert.eventName}
      </h3>
    </div>

    {/* Details Body */}
    <div className="p-4 space-y-3">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Issued: {new Date(cert.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <a
          href={`https://finalproject-jq2d.onrender.com/api/certificates/download/${cert.certificateId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm" className="w-full">
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
        </a>
        <Link to={`/verify/${cert.certificateId}`}>
          <Button size="sm" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" /> Verify
          </Button>
        </Link>
        {/* NEW BUTTON: Only show if IPFS link exists */}
        {cert.ipfsUrl && (
          <a
            href={cert.ipfsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2"
          >
            <Button variant="secondary" size="sm" className="w-full text-xs">
              <Cloud className="h-3 w-3 mr-2" /> View Permanent Copy (IPFS)
            </Button>
          </a>
        )}
      </div>
    </div>
  </div>
);

// --- DASHBOARD COMPONENTS ---

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
      desc: "See all registered department admins.",
      icon: Users,
      link: "/admin/faculty",
      color: "text-indigo-600",
      bg: "bg-indigo-100",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        SuperAdmin Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod, index) => (
          <Link to={mod.link} key={index}>
            <Card className="h-full hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div
                  className={`h-16 w-16 rounded-full ${mod.bg} flex items-center justify-center`}
                >
                  <mod.icon className={`h-8 w-8 ${mod.color}`} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{mod.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {mod.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

// Update FacultyDashboard component
const FacultyDashboard = ({ user }) => (
  <Card>
    <CardHeader>
      <CardTitle>Welcome, Faculty {user.name}</CardTitle>
      <CardDescription>Department: {user.department}</CardDescription>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Link to="/events">
        <Button className="w-full h-24 text-lg" variant="outline">
          <Calendar className="mr-2 h-6 w-6" /> Manage Events
        </Button>
      </Link>
      {/* NEW BUTTON */}
      <Link to="/faculty/quiz">
        {" "}
        {/* NEW CORRECT LINK */}
        <Button className="w-full h-24 text-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-sm">
          <BrainCircuit className="mr-2 h-6 w-6" /> Create AI Quiz
        </Button>
      </Link>
    </CardContent>
  </Card>
);

const StudentDashboard = ({ user }) => {
  const [certificates, setCertificates] = useState([]);
  const [poaps, setPoaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const certRes = await api.get("/certificates/my-certificates");
        const poapRes = await api.get("/poap/my-poaps");
        setCertificates(certRes.data || []);
        setPoaps(poapRes.data || []);
      } catch (err) {
        console.error("Student dashboard load failed");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white"
      >
        <h1 className="text-3xl font-bold">Welcome back, {user.name}</h1>
        <p className="opacity-90 mt-1">
          {user.department} • {user.usn}
        </p>

        <div className="flex gap-4 mt-4">
          <Link to="/browse-events" className="underline flex items-center gap-1">
            <Search className="h-4 w-4" /> Browse Events
          </Link>
          <Link to="/profile" className="underline flex items-center gap-1">
            <Trophy className="h-4 w-4" /> Achievements
          </Link>
        </div>
      </motion.div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <Award className="h-6 w-6 mb-2 text-blue-600" />
            <p className="text-2xl font-bold">{certificates.length}</p>
            <p className="text-sm text-muted-foreground">Certificates</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <MapPin className="h-6 w-6 mb-2 text-pink-600" />
            <p className="text-2xl font-bold">{poaps.length}</p>
            <p className="text-sm text-muted-foreground">Events Attended</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <TrendingUp className="h-6 w-6 mb-2 text-purple-600" />
            <p className="text-2xl font-bold">Advanced</p>
            <p className="text-sm text-muted-foreground">Skill Level</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <Target className="h-6 w-6 mb-2 text-indigo-600" />
            <p className="text-2xl font-bold">70%</p>
            <p className="text-sm text-muted-foreground">Career Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* CERTIFICATES */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-600" />
          My Credentials
        </h2>

        {certificates.length === 0 ? (
          <p className="text-muted-foreground">No certificates yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <Card key={cert._id} className="overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
                  <h3 className="font-bold truncate">{cert.eventName}</h3>
                  {cert.isBlockchainVerified && (
                    <span className="text-xs flex items-center gap-1 mt-1">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Issued: {new Date(cert.createdAt).toLocaleDateString()}
                  </p>
                  <Link
                    to={`/verify/${cert.certificateId}`}
                    className="text-sm text-primary underline"
                  >
                    Verify Certificate
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* POAPS */}
      {poaps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-pink-600" />
            Event Attendance (POAPs)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {poaps.map((poap) => (
              <Card key={poap._id} className="border-l-4 border-pink-500">
                <CardContent className="p-4">
                  <h4 className="font-bold">{poap.eventName}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(poap.checkInTime).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


// --- MAIN PAGE WRAPPER ---
function DashboardPage() {
  const { user } = useAuth();

  const renderDashboard = () => {
    if (!user)
      return <div className="p-8 text-center">Loading user data...</div>;

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
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Unknown user role.</AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 p-4 md:p-8 animate-in fade-in">
      <div className="max-w-7xl mx-auto">
        {/* REMOVED THE DUPLICATE LOGOUT BUTTON HERE */}
        {renderDashboard()}
      </div>
    </div>
  );
}

export default DashboardPage;
