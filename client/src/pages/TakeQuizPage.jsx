// client/src/pages/TakeQuizPage.jsx - FIXED & MOBILE RESPONSIVE
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Badge } from "@/components/ui/badge-item";
import { Loader2, CheckCircle2, XCircle, Trophy, AlertTriangle } from "lucide-react";

export default function TakeQuizPage() {
    const { quizId } = useParams();
    const navigate = useNavigate();

    // Core State
    const [loading, setLoading] = useState(true);
    const [quizMeta, setQuizMeta] = useState(null);
    const [questionData, setQuestionData] = useState(null);
    const [history, setHistory] = useState([]);
    const [score, setScore] = useState(0);

    // Interaction State
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [finalResult, setFinalResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await api.get(`/quiz/${quizId}/details`);
                setQuizMeta(res.data);
                fetchNext([]);
            } catch (err) {
                setError('Failed to load quiz. Please try again.');
                setLoading(false);
            }
        };
        init();
    }, [quizId]);

    const fetchNext = async (currentHistory) => {
        setLoading(true);
        setIsAnswered(false);
        setSelectedOption(null);
        setError(null);
        
        try {
            const res = await api.post('/quiz/next', { quizId, history: currentHistory });
            setQuestionData(res.data);
        } catch (err) {
            console.error("AI Error:", err);
            setError('Failed to generate question. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (option) => {
        if (isAnswered) return;
        setSelectedOption(option);
        setIsAnswered(true);
        if (option === questionData.correctAnswer) setScore((s) => s + 1);
    };

    const handleNext = async () => {
        const isCorrect = selectedOption === questionData.correctAnswer;
        const newHistory = [...history, { questionText: questionData.question, isCorrect }];
        setHistory(newHistory);

        if (newHistory.length >= (quizMeta?.totalQuestions || 10)) {
            setLoading(true);
            try {
                const res = await api.post('/quiz/submit', { quizId, score: isCorrect ? score + 1 : score });
                setFinalResult(res.data);
                setGameOver(true);
            } catch (err) {
                setError("Submission failed. Please contact support.");
            } finally {
                setLoading(false);
            }
        } else {
            fetchNext(newHistory);
        }
    };

    const diffBadge = {
        Easy: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        Medium: "bg-sky-500/10 text-sky-600 border-sky-500/20",
        Hard: "bg-rose-500/10 text-rose-600 border-rose-500/20"
    };

    if (gameOver) return <GameOverScreen result={finalResult} navigate={navigate} />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                            {quizMeta?.topic || 'Loading Quiz...'}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            AI-Powered Assessment
                        </p>
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate('/student/quizzes')}
                        className="text-sm"
                    >
                        Cancel Quiz
                    </Button>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Question {history.length + 1} / {quizMeta?.totalQuestions || '--'}
                        </span>
                        {!loading && questionData && (
                            <Badge className={`text-xs ${diffBadge[questionData.difficulty]}`}>
                                {questionData.difficulty}
                            </Badge>
                        )}
                    </div>
                    <Progress 
                        value={((history.length + 1) / (quizMeta?.totalQuestions || 1)) * 100} 
                        className="h-2"
                    />
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                        <Button 
                            onClick={() => fetchNext(history)} 
                            variant="outline" 
                            size="sm"
                            className="mt-2"
                        >
                            Retry
                        </Button>
                    </Alert>
                )}

                {/* Main Quiz Card */}
                <Card className="shadow-xl border-slate-200 dark:border-slate-800">
                    <CardContent className="p-6 md:p-10">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                                <p className="text-slate-500 dark:text-slate-400 animate-pulse italic">
                                    AI is generating your next question...
                                </p>
                            </div>
                        ) : questionData ? (
                            <>
                                <h2 className="text-lg md:text-xl font-semibold leading-relaxed mb-8 text-slate-900 dark:text-slate-100">
                                    {questionData.question}
                                </h2>

                                <div className="grid gap-3">
                                    {questionData.options.map((opt, i) => {
                                        const isCorrect = opt === questionData.correctAnswer;
                                        const isSelected = opt === selectedOption;
                                        
                                        let stateStyles = "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50";
                                        
                                        if (isAnswered) {
                                            if (isCorrect) {
                                                stateStyles = "bg-green-50 dark:bg-green-950/20 border-green-500 text-green-700 dark:text-green-400";
                                            } else if (isSelected) {
                                                stateStyles = "bg-red-50 dark:bg-red-950/20 border-red-500 text-red-700 dark:text-red-400";
                                            } else {
                                                stateStyles = "opacity-40 border-slate-200 dark:border-slate-700";
                                            }
                                        }

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleAnswer(opt)}
                                                disabled={isAnswered}
                                                className={`group relative flex items-center p-4 md:p-5 rounded-xl border-2 transition-all text-left ${stateStyles} ${!isAnswered ? 'hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'}`}
                                            >
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 text-xs font-bold transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                    {String.fromCharCode(65 + i)}
                                                </span>
                                                <span className="flex-grow font-medium text-sm md:text-base">
                                                    {opt}
                                                </span>
                                                {isAnswered && isCorrect && (
                                                    <CheckCircle2 className="h-5 w-5 text-green-600 ml-2" />
                                                )}
                                                {isAnswered && isSelected && !isCorrect && (
                                                    <XCircle className="h-5 w-5 text-red-600 ml-2" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Explanation */}
                                {isAnswered && (
                                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-xl p-5">
                                            <p className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                                                Learning Insight
                                            </p>
                                            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                {questionData.explanation}
                                            </p>
                                        </div>
                                        <Button 
                                            onClick={handleNext}
                                            className="w-full mt-6 h-12 text-base font-semibold"
                                        >
                                            Next Question →
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                                <p className="text-slate-600 dark:text-slate-400">
                                    Unable to load question
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function GameOverScreen({ result, navigate }) {
    const passed = result?.passed;
    const score = result?.score || 0;
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-2xl animate-in zoom-in duration-300">
                <CardContent className="pt-10 pb-10 text-center">
                    <div className={`mx-auto p-4 rounded-full w-fit mb-6 ${passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                        {passed ? (
                            <Trophy className="h-16 w-16 text-green-600 dark:text-green-400" />
                        ) : (
                            <AlertTriangle className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                        )}
                    </div>
                    
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {passed ? 'Quiz Passed! 🎉' : 'Keep Learning!'}
                    </h2>
                    
                    <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm md:text-base">
                        {passed 
                            ? 'Your certificate has been issued to your wallet'
                            : 'You can retake this quiz anytime to improve'
                        }
                    </p>
                    
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 mb-8">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Final Score
                        </p>
                        <p className="text-5xl font-bold text-slate-900 dark:text-slate-100">
                            {score?.toFixed(1)}%
                        </p>
                    </div>

                    {result?.certificateId && (
                        <Button 
                            onClick={() => navigate(`/verify/${result.certificateId}`)}
                            variant="outline"
                            className="w-full mb-3"
                        >
                            View Certificate
                        </Button>
                    )}
                    
                    <Button 
                        onClick={() => navigate('/student/quizzes')}
                        className="w-full"
                    >
                        Back to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}