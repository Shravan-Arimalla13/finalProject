// In client/src/pages/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

// UI Imports
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-item";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Install: npx shadcn@latest add avatar
import { Trophy, Medal, Star, Share2, Download, ExternalLink, ShieldCheck } from "lucide-react";

// Gamification Logic
const getRank = (count) => {
    if (count >= 20) return { name: "Grandmaster", color: "bg-purple-600", icon: Trophy };
    if (count >= 10) return { name: "Expert", color: "bg-red-500", icon: Medal };
    if (count >= 5) return { name: "Advanced", color: "bg-yellow-500", icon: Star };
    return { name: "Starter", color: "bg-blue-500", icon: ShieldCheck };
};

function ProfilePage() {
    const { user } = useAuth();
    const [certs, setCerts] = useState([]);
    const [stats, setStats] = useState({ total: 0, verified: 0 });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/certificates/my-certificates');
                setCerts(res.data);
                setStats({
                    total: res.data.length,
                    verified: res.data.filter(c => c.isBlockchainVerified).length // Assuming backend sends this status
                });
            } catch (e) { console.error(e); }
        };
        fetchData();
    }, []);

    const rank = getRank(stats.total);
    const RankIcon = rank.icon;

    return (
        <div className="min-h-screen bg-muted/40 p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <Card className="w-full md:w-1/3 shadow-lg border-t-4 border-blue-600">
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 mb-4 border-4 border-white shadow-md">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                                <AvatarFallback>{user.name[0]}</AvatarFallback>
                            </Avatar>
                            <h1 className="text-2xl font-bold">{user.name}</h1>
                            <p className="text-slate-500 text-sm">{user.department} • {user.usn || 'Faculty'}</p>
                            
                            <div className={`mt-4 px-4 py-1 rounded-full text-white text-sm font-bold flex items-center gap-2 ${rank.color}`}>
                                <RankIcon className="h-4 w-4" /> {rank.name}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Credentials</CardTitle></CardHeader>
                            <CardContent><div className="text-4xl font-bold">{stats.total}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Blockchain Verified</CardTitle></CardHeader>
                            <CardContent><div className="text-4xl font-bold text-green-600">{stats.total}</div></CardContent>
                        </Card>
                        {/* Add more stats here like "Skills Mastered" */}
                    </div>
                </div>

                {/* --- SHOWCASE GRID --- */}
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Medal className="h-6 w-6 text-yellow-500" /> Achievement Showcase
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certs.map((cert) => (
                        <Card key={cert._id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden border-slate-200">
                            <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg text-blue-700">{cert.eventName}</CardTitle>
                                        <CardDescription className="text-xs mt-1">Issued: {new Date(cert.eventDate).toLocaleDateString()}</CardDescription>
                                    </div>
                                    <Badge variant="outline" className="text-[10px]">NFT</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 mt-4">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`/verify/${cert.certificateId}`, '_blank')}>
                                        <ExternalLink className="h-3 w-3 mr-2" /> Verify
                                    </Button>
                                    
                                    {/* Smart Share Button */}
                                    {/* Smart Share Button */}
<Button variant="ghost" size="icon" className="text-blue-600" onClick={() => {
    const shareText = `I just earned a verified blockchain credential for ${cert.eventName} from ${cert.issuedBy?.name || 'my college'}! 🎓 Verify it here:`;
    const verifyUrl = `https://final-project-wheat-mu-84.vercel.app/verify/${cert.certificateId}`;
    
    // Construct Twitter/X URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(verifyUrl)}`;
    
    // Construct LinkedIn URL (LinkedIn only takes 'url')
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;

    // Open in new tab (User choice: let's default to LinkedIn as it's professional)
    window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
}}>
    <Share2 className="h-4 w-4" />
</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;