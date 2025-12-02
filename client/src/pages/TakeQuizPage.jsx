// In client/src/pages/TakeQuizPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge-item";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    Loader2, CheckCircle2, XCircle, Trophy, ShieldCheck, 
    ArrowRight, BrainCircuit, AlertCircle, LogOut 
} from "lucide-react";

function TakeQuizPage() {
    const { quizId } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [quizMeta, setQuizMeta] = useState(null); 
    const [questionData, setQuestionData] = useState(null);
    const [history, setHistory] = useState([]); 
    const [score, setScore] = useState(0); 
    
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [finalResult, setFinalResult] = useState(null);

    const difficultyBadgeColor = {
        Easy: "bg-green-500 hover:bg-green-600 border-transparent text-white",
        Medium: "bg-amber-500 hover:bg-amber-600 border-transparent text-white",
        Hard: "bg-red-600 hover:bg-red-700 border-transparent text-white"
    };

    const cleanOptionText = (text) => {
        if (!text) return "";
        return text.replace(/^[A-Da-d0-9]+[.)\s]+/, "").trim();
    };

    useEffect(() => {
        const initQuiz = async () => {
            try {
                const res = await api.get(`/quiz/${quizId}/details`);
                if (res.data.hasPassed) {
                    alert("You have already passed this assessment!");
                    navigate('/student/quizzes');
                    return;
                }
                setQuizMeta(res.data);
                // Pass empty history explicitly for first question
                fetchNext([]); 
            } catch (err) {
                console.error("Failed to load quiz details", err);
                navigate('/student/quizzes');
            }
        };
        initQuiz();
    }, [quizId, navigate]);

    // --- MODIFIED: Accept history as argument ---
    const fetchNext = async (currentHistory) => {
        setLoading(true);
        setSelectedOption(null);
        setIsAnswered(false);
        
        // Use the passed history OR the state history (fallback)
        const historyToSend = currentHistory || history;

        try {
            const res = await api.post('/quiz/next', { 
                quizId, 
                history: historyToSend 
            });
            setQuestionData(res.data);
        } catch (err) {
            console.error("Failed to fetch question", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (option) => {
        if (loading) return;
        setSelectedOption(option);
        setIsAnswered(true);
        if (option === questionData.correctAnswer) setScore(prev => prev + 1);
    };

    const handleNext = async () => {
        const isCorrect = selectedOption === questionData.correctAnswer;

        // 1. Create the updated history array immediately
        const newHistory = [...history, { 
            questionText: questionData.question, 
            isCorrect 
        }];
        
        // 2. Update State (this happens async)
        setHistory(newHistory);

        const limit = quizMeta?.totalQuestions || 5;

        if (newHistory.length >= limit) { 
            setLoading(true);
            setQuestionData(null); 
            try {
                const res = await api.post('/quiz/submit', {
                    quizId,
                    score: isCorrect ? score + 1 : score
                });
                setFinalResult(res.data);
                setGameOver(true);
            } catch (err) {
                alert("Error submitting quiz");
            } finally {
                setLoading(false);
            }
        } else {
            // 3. PASS THE NEW HISTORY DIRECTLY to the fetch function
            // This solves the repetition bug because we don't wait for state to update
            fetchNext(newHistory);
        }
    };

    // ... (Render logic remains exactly the same) ...
    return (
        <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-y-auto">
            <div className="w-full bg-white dark:bg-slate-900 border-b px-6 py-3 flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                        <BrainCircuit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="font-bold text-base leading-tight">{quizMeta?.topic || "Loading..."}</h2>
                        <p className="text-xs text-muted-foreground">AI Adaptive Assessment</p>
                    </div>
                </div>
                <Link to="/student/quizzes">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-600">
                        <LogOut className="h-4 w-4 mr-2" /> Exit
                    </Button>
                </Link>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center p-4 w-full">
                {gameOver ? (
                    <Card className="w-full max-w-md text-center shadow-2xl border-t-8 border-yellow-500 animate-in zoom-in-95">
                        <CardContent className="pt-10 pb-10 space-y-6">
                             {finalResult?.passed ? (
                                <div className="mx-auto bg-yellow-100 p-6 rounded-full w-fit mb-2 animate-bounce">
                                    <Trophy className="h-16 w-16 text-yellow-600" />
                                </div>
                            ) : (
                                <div className="mx-auto bg-slate-100 p-6 rounded-full w-fit mb-2">
                                    <AlertCircle className="h-16 w-16 text-slate-500" />
                                </div>
                            )}
                            
                            <div>
                                <h2 className="text-3xl font-bold">{finalResult?.passed ? "Certified!" : "Not Quite Yet"}</h2>
                                <p className="text-muted-foreground mt-2">{finalResult?.message}</p>
                            </div>

                            {finalResult?.passed && (
                                <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-3">
                                    <ShieldCheck className="h-8 w-8 text-green-600" />
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-green-800">Blockchain Proof Generated</p>
                                        <p className="text-xs text-green-600">Certificate minted to your wallet.</p>
                                    </div>
                                </div>
                            )}

                            <Link to="/student/quizzes">
                                <Button className="w-full h-12 text-lg shadow-lg">
                                    {finalResult?.passed ? "View My Certificates" : "Return to Menu"}
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="w-full max-w-3xl space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-medium text-muted-foreground">
                                Question {history.length + 1} of {quizMeta?.totalQuestions || "-"}
                            </span>
                            
                            {!loading && questionData ? (
                                <Badge className={`${difficultyBadgeColor[questionData.difficulty]} text-xs font-bold px-3 shadow-sm`}>
                                    {questionData.difficulty} Mode
                                </Badge>
                            ) : (
                                <Skeleton className="h-6 w-24 rounded-full" />
                            )}
                        </div>
                        <Progress value={(history.length / (quizMeta?.totalQuestions || 1)) * 100} className="h-1.5 w-full" />

                        <Card className="shadow-xl border-0 overflow-hidden flex flex-col w-full">
                            <div className="bg-slate-900 p-6 text-white min-h-[160px] flex flex-col justify-center w-full">
                                {loading ? (
                                    <div className="space-y-3 w-full">
                                        <Skeleton className="h-6 w-3/4 bg-slate-700" />
                                        <Skeleton className="h-6 w-1/2 bg-slate-700" />
                                    </div>
                                ) : (
                                    <h2 className="text-lg md:text-xl font-medium leading-relaxed whitespace-pre-wrap text-left font-sans">
                                        {questionData?.question}
                                    </h2>
                                )}
                            </div>

                            <CardContent className="p-6 grid gap-3 bg-white dark:bg-slate-950">
                                {loading ? (
                                    [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
                                ) : (
                                    questionData?.options.map((option, index) => {
                                        let style = "h-auto min-h-[3.5rem] py-3 px-4 text-base justify-start text-left whitespace-normal break-words border-2 hover:border-indigo-500 transition-all relative";
                                        
                                        if (isAnswered) {
                                            if (option === questionData.correctAnswer) style = "bg-green-50 border-green-500 text-green-800 hover:bg-green-50 h-auto min-h-[3.5rem] py-3 px-4 text-base justify-start text-left whitespace-normal break-words";
                                            else if (option === selectedOption) style = "bg-red-50 border-red-500 text-red-800 hover:bg-red-50 h-auto min-h-[3.5rem] py-3 px-4 text-base justify-start text-left whitespace-normal break-words";
                                            else style = "opacity-50 h-auto min-h-[3.5rem] py-3 px-4 text-base justify-start text-left whitespace-normal break-words border-2";
                                        }

                                        return (
                                            <Button 
                                                key={index} 
                                                variant="outline" 
                                                className={style}
                                                onClick={() => !isAnswered && handleAnswer(option)}
                                            >
                                                <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-bold shadow-sm shrink-0">
                                                    {String.fromCharCode(65 + index)}
                                                </span>
                                                
                                                <span className="flex-grow">{cleanOptionText(option)}</span>
                                                
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    {isAnswered && option === questionData.correctAnswer && (
                                                        <CheckCircle2 className="h-5 w-5 text-green-600 animate-in zoom-in" />
                                                    )}
                                                    {isAnswered && option === selectedOption && option !== questionData.correctAnswer && (
                                                        <XCircle className="h-5 w-5 text-red-600 animate-in zoom-in" />
                                                    )}
                                                </div>
                                            </Button>
                                        )
                                    })
                                )}

                                {!loading && isAnswered && (
                                    <div className="mt-4 pt-4 border-t flex flex-col md:flex-row gap-4 items-center justify-between animate-in slide-in-from-bottom-2">
                                        <div className="text-sm text-muted-foreground italic w-full">
                                            <span className="font-bold not-italic mr-2 text-primary">AI Analysis:</span>
                                            {questionData.explanation}
                                        </div>
                                        <Button onClick={handleNext} size="lg" className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none whitespace-nowrap">
                                            Next <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TakeQuizPage;