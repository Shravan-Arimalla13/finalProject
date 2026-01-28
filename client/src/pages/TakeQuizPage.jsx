// client/src/pages/TakeQuizPage.jsx - DUPLICATE REQUEST PREVENTION
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge-item";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    CheckCircle2, XCircle, Loader2, Award, 
    Trophy, Clock, Brain, Zap, AlertCircle, Lightbulb
} from "lucide-react";
import { toast } from "sonner";

const TakeQuizPage = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null);
    const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);

    // CRITICAL: Prevent duplicate requests
    const requestInProgress = useRef(false);
    const currentQuestionNumber = useRef(0);

    const currentIndex = answers.length;

    useEffect(() => {
        loadQuizDetails();
    }, [quizId]);

    useEffect(() => {
        if (quiz && !result && !showExplanation && !isLoadingQuestion && !requestInProgress.current) {
            if (answers.length < quiz.totalQuestions) {
                // Only load if we don't have a current question or question number changed
                if (!currentQuestion || currentQuestionNumber.current !== answers.length + 1) {
                    loadNextQuestion();
                }
            } else {
                console.log('✅ Limit reached, submitting');
                submitQuiz();
            }
        }
    }, [quiz, answers.length, showExplanation, isLoadingQuestion]);

    const loadQuizDetails = async () => {
        try {
            console.log(`📚 Loading quiz: ${quizId}`);
            const res = await api.get(`/quiz/${quizId}/details`);
            
            if (res.data.hasPassed) {
                toast.info("Already passed!");
                navigate(`/verify/${res.data.certificateId}`);
                return;
            }
            
            setQuiz(res.data);
            console.log(`✅ Quiz loaded: ${res.data.topic} (${res.data.totalQuestions}Q)`);
        } catch (err) {
            console.error('❌ Load failed:', err);
            setError('Failed to load quiz');
            toast.error('Could not load quiz');
        } finally {
            setLoading(false);
        }
    };

    const loadNextQuestion = async () => {
        // CRITICAL: Prevent duplicate requests
        if (requestInProgress.current) {
            console.log('⚠️ Request already in progress, skipping');
            return;
        }

        if (answers.length >= quiz.totalQuestions) {
            console.log('⚠️ At limit, skipping load');
            return;
        }

        const questionNum = answers.length + 1;
        
        // Check if we already have this question loaded
        if (currentQuestion && currentQuestionNumber.current === questionNum) {
            console.log(`⚠️ Q${questionNum} already loaded, skipping`);
            return;
        }

        requestInProgress.current = true;
        setIsLoadingQuestion(true);
        
        try {
            console.log(`🔄 Loading Q${questionNum}/${quiz.totalQuestions}`);
            
            const res = await api.post('/quiz/next', {
                quizId: quizId,
                history: answers
            });

            if (res.data.limitReached) {
                console.log('✅ Server confirmed limit');
                submitQuiz();
                return;
            }

            if (!res.data.question || !Array.isArray(res.data.options)) {
                throw new Error('Invalid question data');
            }

            setCurrentQuestion(res.data);
            currentQuestionNumber.current = questionNum;
            setSelectedAnswer(null);
            setShowExplanation(false);
            setLastAnswerCorrect(null);
            console.log(`✅ Q${questionNum} loaded`);
            
        } catch (err) {
            console.error('❌ Load failed:', err);
            
            if (err.response?.data?.limitReached) {
                submitQuiz();
            } else if (err.response?.status === 429) {
                toast.error('Rate limit hit, please wait...');
                setError('Rate limit exceeded. Please wait a moment.');
            } else {
                setError('Failed to load question');
                toast.error('Error loading question');
            }
        } finally {
            requestInProgress.current = false;
            setIsLoadingQuestion(false);
        }
    };

    const handleAnswer = () => {
        if (!selectedAnswer || !currentQuestion) return;

        const normalize = (str) => str.trim().toLowerCase();
        const isCorrect = normalize(selectedAnswer) === normalize(currentQuestion.correctAnswer);
        
        const newAnswer = {
            questionText: currentQuestion.question,
            selectedAnswer: selectedAnswer.trim(),
            correctAnswer: currentQuestion.correctAnswer.trim(),
            isCorrect: isCorrect,
            explanation: currentQuestion.explanation
        };

        console.log(`${isCorrect ? '✅' : '❌'} Q${currentIndex + 1}`);
        
        setLastAnswerCorrect(isCorrect);
        setShowExplanation(true);
        
        setAnswers(prev => {
            const updated = [...prev, newAnswer];
            console.log(`📊 Progress: ${updated.length}/${quiz.totalQuestions}`);
            return updated;
        });
    };

    const handleNext = () => {
        setShowExplanation(false);
        setCurrentQuestion(null); // Clear current to trigger reload
        currentQuestionNumber.current = 0;
    };

    const submitQuiz = async () => {
        if (submitting) return;
        
        setSubmitting(true);
        
        try {
            console.log(`📊 Submitting: ${answers.length} answers`);
            
            const correctCount = answers.filter(a => a.isCorrect).length;
            
            const res = await api.post('/quiz/submit', {
                quizId: quizId,
                score: correctCount
            });

            console.log('✅ Submitted:', res.data);
            setResult(res.data);

            if (res.data.passed) {
                toast.success('🎉 Passed!', { description: `Score: ${res.data.score}%` });
            } else {
                toast.error('Try Again', { description: `Score: ${res.data.score}%` });
            }
            
        } catch (err) {
            console.error('❌ Submit failed:', err);
            setError('Submission failed');
            toast.error('Could not submit');
        } finally {
            setSubmitting(false);
        }
    };

    // LOADING STATE
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
                <Card className="max-w-2xl w-full">
                    <CardContent className="p-12 text-center space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
                        <p className="text-lg font-medium">Loading Quiz...</p>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4 mx-auto" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ERROR STATE
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center space-y-4">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                        <h3 className="text-xl font-bold">Error</h3>
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={() => navigate('/student/quizzes')}>
                            Back to Quizzes
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // RESULTS STATE
    if (result) {
        const correctCount = answers.filter(a => a.isCorrect).length;
        const percentage = parseFloat(result.score);
        const passed = result.passed;

        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8 flex items-center justify-center">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-2xl w-full">
                    <Card className={`border-t-4 ${passed ? 'border-green-500' : 'border-red-500'}`}>
                        <CardHeader className="text-center space-y-4">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                                {passed ? <Trophy className="h-20 w-20 text-yellow-500 mx-auto" /> : <XCircle className="h-20 w-20 text-red-500 mx-auto" />}
                            </motion.div>
                            <CardTitle className="text-3xl">{passed ? '🎉 Quiz Passed!' : 'Quiz Failed'}</CardTitle>
                            <p className="text-lg text-muted-foreground">{result.message}</p>
                        </CardHeader>
                        
                        <CardContent className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-xl text-center border">
                                <div className="text-5xl font-black mb-2">{correctCount}/{quiz.totalQuestions}</div>
                                <div className="text-2xl font-bold text-indigo-600">{percentage}%</div>
                                <Progress value={percentage} className="mt-4 h-3" />
                            </div>

                            {passed && result.certificateId && (
                                <Alert className="bg-green-50 border-green-200">
                                    <Award className="h-5 w-5 text-green-600" />
                                    <AlertDescription className="text-green-800">Certificate generated!</AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-3">
                                {passed && result.certificateId ? (
                                    <Button className="flex-1" onClick={() => navigate(`/verify/${result.certificateId}`)}>
                                        <Award className="mr-2 h-4 w-4" />View Certificate
                                    </Button>
                                ) : (
                                    <Button className="flex-1" onClick={() => window.location.reload()}>Retry Quiz</Button>
                                )}
                                <Button variant="outline" onClick={() => navigate('/student/quizzes')}>Back</Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // QUESTION LOADING
    if (!currentQuestion || submitting || isLoadingQuestion) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
                <Card className="max-w-2xl w-full">
                    <CardContent className="p-12 text-center space-y-4">
                        {submitting ? (
                            <>
                                <Brain className="h-16 w-16 text-indigo-600 mx-auto animate-pulse" />
                                <h3 className="text-2xl font-bold">Analyzing...</h3>
                                <p className="text-muted-foreground">Calculating score</p>
                            </>
                        ) : (
                            <>
                                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
                                <p className="text-lg">Loading Q{currentIndex + 1}...</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    const progressPercentage = ((currentIndex + 1) / quiz.totalQuestions) * 100;

    // QUESTION DISPLAY
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
                    <Card className="border-b-4 border-indigo-500">
                        <CardHeader>
                            <div className="flex justify-between items-center mb-4">
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <Brain className="h-6 w-6 text-indigo-600" />{quiz.topic}
                                </CardTitle>
                                <Badge variant="secondary" className="text-lg px-4 py-1">
                                    {currentIndex + 1} / {quiz.totalQuestions}
                                </Badge>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                        </CardHeader>
                    </Card>
                </motion.div>

                <AnimatePresence mode="wait">
                    <motion.div key={`q${currentIndex}-${showExplanation}`} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}>
                        <Card className="shadow-xl">
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-indigo-100 text-indigo-700">Q{currentIndex + 1}</Badge>
                                    {currentQuestion.difficulty && <Badge variant="outline">{currentQuestion.difficulty}</Badge>}
                                </div>
                                <CardTitle className="text-xl leading-relaxed">{currentQuestion.question}</CardTitle>
                            </CardHeader>
                            
                            <CardContent className="space-y-3">
                                {currentQuestion.options.map((option, idx) => {
                                    const isSelected = selectedAnswer === option;
                                    const isCorrect = option.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
                                    const showFeedback = showExplanation;

                                    return (
                                        <motion.button
                                            key={idx}
                                            whileHover={{ scale: showFeedback ? 1 : 1.02 }}
                                            onClick={() => !showFeedback && setSelectedAnswer(option)}
                                            disabled={showFeedback}
                                            className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                                                showFeedback
                                                    ? isCorrect ? 'border-green-500 bg-green-50' : isSelected ? 'border-red-500 bg-red-50' : 'border-slate-200 opacity-50'
                                                    : isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${
                                                    showFeedback
                                                        ? isCorrect ? 'border-green-500 bg-green-500 text-white' : isSelected ? 'border-red-500 bg-red-500 text-white' : 'border-slate-300'
                                                        : isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'
                                                }`}>
                                                    {showFeedback ? (isCorrect ? <CheckCircle2 className="h-5 w-5" /> : isSelected ? <XCircle className="h-5 w-5" /> : String.fromCharCode(65 + idx)) : String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className="flex-1">{option}</span>
                                            </div>
                                        </motion.button>
                                    );
                                })}

                                {showExplanation && currentQuestion.explanation && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-4 p-4 rounded-lg border-2 ${lastAnswerCorrect ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                        <div className="flex items-start gap-2">
                                            <Lightbulb className={`h-5 w-5 ${lastAnswerCorrect ? 'text-green-600' : 'text-amber-600'}`} />
                                            <div>
                                                <p className={`font-semibold mb-1 ${lastAnswerCorrect ? 'text-green-800' : 'text-amber-800'}`}>
                                                    {lastAnswerCorrect ? '✓ Correct!' : '✗ Incorrect'}
                                                </p>
                                                <p className="text-sm">{currentQuestion.explanation}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </CardContent>

                            <CardContent className="pt-0">
                                {!showExplanation ? (
                                    <Button onClick={handleAnswer} disabled={!selectedAnswer} className="w-full h-12">
                                        Submit Answer<Zap className="ml-2 h-5 w-5" />
                                    </Button>
                                ) : (
                                    <Button onClick={handleNext} className="w-full h-12">
                                        {currentIndex + 1 >= quiz.totalQuestions ? <><CheckCircle2 className="mr-2 h-5 w-5" />Finish</> : <>Next<Zap className="ml-2 h-5 w-5" /></>}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TakeQuizPage;