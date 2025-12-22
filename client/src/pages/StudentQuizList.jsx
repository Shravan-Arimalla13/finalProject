// client/src/pages/StudentQuizList.jsx - FIXED VERSION
import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-item";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, CheckCircle2, Clock, Sparkles, Award } from "lucide-react";

function StudentQuizList() {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            console.log('📚 Fetching available quizzes...');
            const res = await api.get('/quiz/list');
            console.log('✅ Quizzes loaded:', res.data);
            
            // Sort: New quizzes first, then by hasPassed status
            const sorted = res.data.sort((a, b) => {
                // First priority: Not passed comes before passed
                if (a.hasPassed !== b.hasPassed) {
                    return a.hasPassed ? 1 : -1;
                }
                // Second priority: Newer quizzes first
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            
            setQuizzes(sorted);
        } catch (err) {
            console.error('❌ Failed to load quizzes:', err);
            setError('Failed to load quizzes. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Check if quiz was created in last 7 days
    const isNewQuiz = (createdAt) => {
        const quizDate = new Date(createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return quizDate > weekAgo;
    };

    if (loading) {
        return (
            <div className="p-8 bg-muted/40 min-h-screen">
                <h1 className="text-3xl font-bold mb-6">Available Skill Assessments</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2 mt-2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3 mt-2" />
                            </CardContent>
                            <CardFooter>
                                <Skeleton className="h-10 w-full" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-muted/40 min-h-screen flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p className="text-destructive">{error}</p>
                        <Button onClick={fetchQuizzes} className="mt-4">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 bg-muted/40 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Available Skill Assessments</h1>
                <p className="text-muted-foreground">
                    Test your knowledge and earn blockchain certificates
                </p>
            </div>

            {/* Quiz Grid */}
            {quizzes.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">No quizzes available yet.</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Check back later or contact your faculty.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map(q => {
                        const isNew = isNewQuiz(q.createdAt);
                        const isPassed = q.hasPassed;
                        
                        return (
                            <Card 
                                key={q._id} 
                                className={`
                                    hover:shadow-lg transition-all duration-300 
                                    ${isNew && !isPassed ? 'border-2 border-indigo-500 shadow-md' : ''}
                                    ${isPassed ? 'opacity-75 border-green-200' : ''}
                                `}
                            >
                                <CardHeader className="relative pb-3">
                                    {/* NEW BADGE */}
                                    {isNew && !isPassed && (
                                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                                            <Sparkles className="h-3 w-3" />
                                            NEW
                                        </div>
                                    )}
                                    
                                    {/* PASSED BADGE */}
                                    {isPassed && (
                                        <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            PASSED
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg pr-12 leading-tight">
                                            {q.topic}
                                        </CardTitle>
                                    </div>
                                    
                                    <div className="flex gap-2 mt-3">
                                        <Badge variant="outline" className="text-xs">
                                            <BrainCircuit className="h-3 w-3 mr-1" />
                                            {q.totalQuestions} Questions
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                            Pass: {q.passingScore}%
                                        </Badge>
                                    </div>
                                </CardHeader>
                                
                                <CardContent className="pb-3">
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {q.description || 'Test your skills and earn a certificate'}
                                    </p>
                                    
                                    {/* Created Date for New Quizzes */}
                                    {isNew && !isPassed && (
                                        <div className="flex items-center gap-1 mt-3 text-xs text-indigo-600 font-medium">
                                            <Clock className="h-3 w-3" />
                                            Added {new Date(q.createdAt).toLocaleDateString()}
                                        </div>
                                    )}
                                </CardContent>
                                
                                <CardFooter className="pt-2">
                                    {isPassed ? (
                                        <Link to={`/verify/${q.certificateId}`} className="w-full">
                                            <Button variant="outline" className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-300">
                                                <Award className="h-4 w-4 mr-2" />
                                                View Certificate
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Link to={`/take-quiz/${q._id}`} className="w-full">
                                            <Button 
                                                className={`w-full ${isNew ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' : ''}`}
                                            >
                                                {isNew ? (
                                                    <>
                                                        <Sparkles className="h-4 w-4 mr-2" />
                                                        Start New Quiz
                                                    </>
                                                ) : (
                                                    'Start Assessment'
                                                )}
                                            </Button>
                                        </Link>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Info Box */}
            <Card className="mt-8 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <BrainCircuit className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                            <p className="font-semibold mb-1">How it works:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>AI generates adaptive questions based on your performance</li>
                                <li>Pass the quiz to earn a blockchain-verified certificate</li>
                                <li>Certificates are automatically minted as NFTs to your wallet</li>
                                <li>New quizzes are highlighted with a special badge</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default StudentQuizList;