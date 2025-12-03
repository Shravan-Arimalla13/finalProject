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
  const [wallet, setWallet] = useState(user.walletAddress || null);
  const [walletError, setWalletError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Watch for user object updates (fix for refresh issue)
  useEffect(() => {
    if (user && user.walletAddress) {
      setWallet(user.walletAddress);
    }
  }, [user]);

  useEffect(() => {
    const fetchCerts = async () => {
      try {
        const response = await api.get("/certificates/my-certificates");
        setCertificates(response.data);
      } catch (err) {
        setError("Failed to load your certificates.");
      } finally {
        setLoading(false);
      }
    };
    fetchCerts();
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      setWalletError(
        "MetaMask is not installed. Please install it to connect."
      );
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts[0];
      const response = await api.post("/users/save-wallet", {
        walletAddress: account,
      });
      setWallet(response.data.walletAddress);
      setWalletError(null);
    } catch (err) {
      setWalletError(err.response?.data?.message || err.message);
    }
  };
 const [poaps, setPoaps] = useState([]); // <-- New State
  // --- FETCH POAPS ---
    useEffect(() => {
        const fetchPoaps = async () => {
            try {
                const res = await api.get('/poap/my-poaps');
                setPoaps(res.data);
            } catch (err) {
                console.error("Failed to load POAPs");
            }
        };
        fetchPoaps();
    }, []);

  const latestCert = certificates.length > 0 ? certificates[0] : null;
  const otherCerts = certificates.length > 1 ? certificates.slice(1) : [];

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Profile Card */}
        {/* In StudentDashboard component */}
        {/* ... inside the first Card ... */}

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Student Profile</CardTitle>
            <CardDescription>
              USN: {user.usn} • {user.department}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {" "}
            {/* Added space-y-3 for spacing */}
            {/* Existing Link */}
            <Link
              to="/browse-events"
              className="text-primary hover:underline font-semibold flex items-center"
            >
              <Search className="h-4 w-4 mr-2" /> Browse & Register for Events
            </Link>
            {/* --- NEW LINK --- */}
            <Link
              to="/profile"
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center text-sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" /> View Gamified Profile &
              Badges
            </Link>
            {/* ---------------- */}
          </CardContent>
        </Card>
        {/* Wallet Card */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Web3 Wallet</CardTitle>
            <CardDescription>Your digital identity.</CardDescription>
          </CardHeader>
          <CardContent>
            {wallet ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Connected Address
                </Label>
                {/* --- UPDATED STYLING FOR VISIBILITY --- */}
                <div className="font-mono text-xs p-3 bg-secondary text-secondary-foreground rounded-md break-all border">
                  {wallet}
                </div>
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950"
                >
                  ● Connected
                </Badge>
              </div>
            ) : (
              <div>
                <Button
                  onClick={connectWallet}
                  variant="outline"
                  className="w-full"
                >
                  Connect MetaMask
                </Button>
                {walletError && (
                  <p className="text-destructive text-sm mt-2">{walletError}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <SmartRecommendations />
      {/* Latest Certificate */}
      {latestCert && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-yellow-500" /> Newest
            Achievement
          </h2>
          <div className="md:w-1/2 lg:w-1/3">
            <CertificateVisualCard cert={latestCert} />
          </div>
        </div>
      )}

                  {/* --- NEW: POAP COLLECTION --- */}
            {poaps.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-pink-500" /> Event Attendance (POAPs)
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {poaps.map((poap) => (
                            <Card key={poap._id} className="bg-slate-50 dark:bg-slate-900 border-l-4 border-l-pink-500">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm">{poap.eventName}</h4>
                                        <Badge variant="outline" className="text-[10px] bg-white">POAP</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> 
                                            {new Date(poap.checkInTime).toLocaleString()}
                                        </div>
                                        <div className="font-mono text-[10px] truncate bg-muted p-1 rounded">
                                            Hash: {poap.transactionHash?.substring(0, 10)}...
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            {/* ---------------------------- */}

      {/* All Certificates */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center">
          <Award className="h-5 w-5 mr-2" /> Portfolio
        </h2>
        {certificates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No certificates earned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(latestCert ? otherCerts : certificates).map((cert) => (
              <CertificateVisualCard key={cert._id} cert={cert} />
            ))}
          </div>
        )}
      </div>
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
