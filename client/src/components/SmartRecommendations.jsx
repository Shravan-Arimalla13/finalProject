import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';

// UI Imports
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-item"; // Check your filename!
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    Sparkles, Target, Calendar, 
    BrainCircuit, ArrowRight, Lightbulb 
} from "lucide-react";

const SmartRecommendations = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecs = async () => {
            try {
                const res = await api.get('/recommendations/me');
                setData(res.data);
            } catch (error) {
                console.error('Failed to load recommendations');
            } finally {
                setLoading(false);
            }
        };
        fetchRecs();
    }, []);

    if (loading) {
        return <Skeleton className="h-64 w-full rounded-xl" />;
    }
    
    // Empty State / Beginner State
    if (!data || (data.recommendations.length === 0 && data.level === 'Beginner')) {
        return (
            <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/10 mb-8">
                <CardContent className="flex flex-col items-center text-center p-6">
                    <Lightbulb className="h-8 w-8 text-blue-500 mb-2" />
                    <h3 className="font-bold text-lg">Start Your Journey</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Complete a quiz or attend an event to unlock AI career paths.
                    </p>
                    <Link to="/student/quizzes">
                        <Button variant="outline">Browse Quizzes</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* 1. CAREER TRAJECTORY CARD (ML PREDICTIONS) */}
            <Card className="lg:col-span-1 border-t-4 border-t-purple-500 bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-950/10">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-purple-600" />
                            <CardTitle className="text-base">Career Trajectory</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-xs">{data.level}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Render Top Career Paths */}
                    {data.careerPaths && data.careerPaths.map((path, index) => (
                        <div key={index}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {path.path}
                                </span>
                                <span className="text-purple-600 font-mono font-bold">
                                    {path.completion}%
                                </span>
                            </div>
                            <Progress value={path.completion} className="h-2" />
                        </div>
                    ))}

                    <div className="space-y-2 pt-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Skills Detected</p>
                        <div className="flex flex-wrap gap-1">
                            {data.currentSkills.length > 0 ? (
                                data.currentSkills.slice(0, 6).map(skill => (
                                    <Badge key={skill} variant="outline" className="bg-background text-[10px]">
                                        {skill}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground">None yet</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. RECOMMENDATIONS LIST (NEXT STEPS) */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        <CardTitle className="text-base">Recommended Next Steps</CardTitle>
                    </div>
                    <CardDescription>
                        AI-curated activities to boost your progress.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {data.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                            <div className="flex gap-3">
                                {/* Icon based on type */}
                                <div className={`p-2 rounded-md ${rec.type === 'quiz' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                                    {rec.type === 'quiz' ? <BrainCircuit className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{rec.title}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{rec.reason}</p>
                                </div>
                            </div>
                            
                            {/* Dynamic Link */}
                            <Link to={rec.type === 'quiz' ? `/take-quiz/${rec.id}` : '/browse-events'}>
                                <Button size="sm" variant="ghost" className="group-hover:translate-x-1 transition-transform">
                                    Start <ArrowRight className="ml-1 h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                    ))}

                    {data.recommendations.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No specific recommendations found. Try exploring the quiz library!
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SmartRecommendations;