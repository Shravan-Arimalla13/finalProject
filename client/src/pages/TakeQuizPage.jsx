// client/src/pages/TakeQuizPage.jsx - FIXED CLIENT VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge-item";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    CheckCircle2, XCircle, Loader2, Award, 
    Trophy, Clock, Brain, Zap, AlertCircle 
} from "lucide-react";
import { toast } from "sonner";

const TakeQuizPage = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();

    // States
    const [quiz, setQuiz] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const currentIndex = answers.length;

    // Load quiz details on mount
    useEffect(() => {
        loadQuizDetails();
    }, [quizId]);

    // Load next question when answers change
    useEffect(() => {
        if (quiz && !result && answers.length < quiz.totalQuestions) {
            loadNextQuestion();
        }
    }, [quiz, answers]);

    const loadQuizDetails = async () => {
        try {
            console.log(`📚 Loading quiz details for: ${quizId}`);
            const res = await api.get(`/quiz/${quizId}/details`);
            
            if (res.data.hasPassed) {
                toast.info("You've already passed this quiz!");
                navigate(`/verify/${res.data.certificateId}`);
                return;
            }
            
            setQuiz(res.data);
            console.log('✅ Quiz loaded:', res.data.topic);
        } catch (err) {
            console.error('❌ Failed to load quiz:', err);
            setError('Failed to load quiz. Please try again.');
            toast.error('Could not load quiz');
        } finally {
            setLoading(false);
        }
    };

    const loadNextQuestion = async () => {
        try {
            console.log(`🔄 Loading question ${currentIndex + 1}/${quiz.totalQuestions}...`);
            
            const res = await api.post('/quiz/next', {
                quizId: quizId,
                history: answers
            });

            // Handle quiz completion
            if (res.data.shouldEnd) {
                console.log('✅ All questions answered, submitting...');
                await submitQuiz();
                return;
            }

            setCurrentQuestion(res.data);
            setSelectedAnswer(null);
            console.log('✅ Question loaded:', res.data.question.substring(0, 50) + '...');
            
        } catch (err) {
            console.error('❌ Failed to load question:', err);
            setError('Failed to load question. Please try again.');
            toast.error('Error loading question');
        }
    };

    const handleAnswer = () => {
        if (!selectedAnswer || !currentQuestion) return;

        const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
        
        const newAnswer = {
            questionText: currentQuestion.question,
            selectedAnswer: selectedAnswer,
            correctAnswer: currentQuestion.correctAnswer,
            isCorrect: isCorrect,
            explanation: currentQuestion.explanation
        };

        console.log(`${isCorrect ? '✅ Correct' : '❌ Wrong'} answer for Q${currentIndex + 1}`);
        
        setAnswers([...answers, newAnswer]);
        setCurrentQuestion(null); // Clear current question to trigger next load
    };

    const submitQuiz = async () => {
        setSubmitting(true);
        
        try {
            console.log(`📊 Submitting quiz with ${answers.length} answers...`);
            
            const correctCount = answers.filter(a => a.isCorrect).length;
            
            const res = await api.post('/quiz/submit', {
                quizId: quizId,
                score: correctCount
            });

            console.log('✅ Quiz submitted:', res.data);
            setResult(res.data);

            if (res.data.passed) {
                toast.success('Congratulations! You passed!', {
                    description: `Score: ${res.data.score}%`
                });
            } else {
                toast.error('Quiz Failed', {
                    description: `Score: ${res.data.score}% (Need ${quiz.passingScore}%)`
                });
            }
            
        } catch (err) {
            console.error('❌ Submit failed:', err);
            setError('Failed to submit quiz. Please try again.');
            toast.error('Submission error');
        } finally {
            setSubmitting(false);
        }
    };

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-muted/40 p-8 flex items-center justify-center">
                <Card className="max-w-2xl w-full">
                    <CardContent className="p-12 text-center space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
                        <p className="text-lg font-medium">Loading Quiz...</p>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4 mx-auto" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="min-h-screen bg-muted/40 p-8 flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center space-y-4">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                        <h3 className="text-xl font-bold">Error Loading Quiz</h3>
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={() => navigate('/student/quizzes')}>
                            Return to Quizzes
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Results Screen
    if (result) {
        const correctCount = answers.filter(a => a.isCorrect).length;
        const percentage = parseFloat(result.score);
        const passed = result.passed;

        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20 p-8 flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-2xl w-full"
                >
                    <Card className={`border-t-4 ${passed ? 'border-green-500' : 'border-red-500'}`}>
                        <CardHeader className="text-center space-y-4">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                            >
                                {passed ? (
                                    <Trophy className="h-20 w-20 text-yellow-500 mx-auto" />
                                ) : (
                                    <XCircle className="h-20 w-20 text-red-500 mx-auto" />
                                )}
                            </motion.div>
                            <CardTitle className="text-3xl">
                                {passed ? 'Quiz Passed! 🎉' : 'Quiz Failed'}
                            </CardTitle>
                            <CardDescription className="text-lg">
                                {result.message}
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-6">
                            {/* Score Display */}
                            <div className="bg-muted/50 p-6 rounded-xl text-center">
                                <div className="text-5xl font-black mb-2">
                                    {correctCount}/{quiz.totalQuestions}
                                </div>
                                <div className="text-2xl font-bold text-primary">
                                    {percentage}%
                                </div>
                                <Progress value={percentage} className="mt-4 h-3" />
                            </div>

                            {/* Certificate Info */}
                            {passed && result.certificateId && (
                                <Alert className="bg-green-50 border-green-200">
                                    <Award className="h-5 w-5 text-green-600" />
                                    <AlertDescription className="text-green-800">
                                        Your certificate is being generated! Check your dashboard in a moment.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                {passed && result.certificateId ? (
                                    <Button 
                                        className="flex-1"
                                        onClick={() => navigate(`/verify/${result.certificateId}`)}
                                    >
                                        <Award className="mr-2 h-4 w-4" />
                                        View Certificate
                                    </Button>
                                ) : (
                                    <Button 
                                        className="flex-1"
                                        onClick={() => window.location.reload()}
                                    >
                                        Retry Quiz
                                    </Button>
                                )}
                                <Button 
                                    variant="outline"
                                    onClick={() => navigate('/student/quizzes')}
                                >
                                    Back to Quizzes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Question Screen
    if (!currentQuestion && !submitting) {
        return (
            <div className="min-h-screen bg-muted/40 p-8 flex items-center justify-center">
                <Card className="max-w-2xl w-full">
                    <CardContent className="p-12 text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
                        <p className="text-lg">Loading next question...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (submitting) {
        return (
            <div className="min-h-screen bg-muted/40 p-8 flex items-center justify-center">
                <Card className="max-w-2xl w-full">
                    <CardContent className="p-12 text-center space-y-4">
                        <Brain className="h-16 w-16 text-indigo-600 mx-auto animate-pulse" />
                        <h3 className="text-2xl font-bold">Analyzing Your Answers...</h3>
                        <p className="text-muted-foreground">Please wait while we process your quiz</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const progressPercentage = ((currentIndex + 1) / quiz.totalQuestions) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950/20 dark:to-purple-950/20 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-6"
                >
                    <Card className="border-b-4 border-indigo-500">
                        <CardHeader>
                            <div className="flex justify-between items-center mb-4">
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <Brain className="h-6 w-6 text-indigo-600" />
                                    {quiz.topic}
                                </CardTitle>
                                <Badge variant="secondary" className="text-lg px-4 py-1">
                                    {currentIndex + 1} / {quiz.totalQuestions}
                                </Badge>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                        </CardHeader>
                    </Card>
                </motion.div>

                {/* Question Card */}
                <AnimatePresence mode="wait">
                    {currentQuestion && (
                        <motion.div
                            key={currentIndex}
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="shadow-xl">
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-indigo-100 text-indigo-700">
                                            Question {currentIndex + 1}
                                        </Badge>
                                        {currentQuestion.difficulty && (
                                            <Badge variant="outline">
                                                {currentQuestion.difficulty}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl leading-relaxed">
                                        {currentQuestion.question}
                                    </CardTitle>
                                </CardHeader>
                                
                                <CardContent className="space-y-3">
                                    {currentQuestion.options.map((option, idx) => (
                                        <motion.button
                                            key={idx}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedAnswer(option)}
                                            className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                                                selectedAnswer === option
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${
                                                    selectedAnswer === option
                                                        ? 'border-indigo-500 bg-indigo-500 text-white'
                                                        : 'border-slate-300'
                                                }`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className="flex-1 text-base">{option}</span>
                                            </div>
                                        </motion.button>
                                    ))}
                                </CardContent>

                                <CardContent className="pt-0">
                                    <Button
                                        onClick={handleAnswer}
                                        disabled={!selectedAnswer}
                                        className="w-full h-12 text-lg"
                                    >
                                        {currentIndex + 1 === quiz.totalQuestions ? (
                                            <>
                                                <CheckCircle2 className="mr-2 h-5 w-5" />
                                                Submit Quiz
                                            </>
                                        ) : (
                                            <>
                                                Next Question
                                                <Zap className="ml-2 h-5 w-5" />
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TakeQuizPage;