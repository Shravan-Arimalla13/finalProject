// client/src/pages/TakeQuizPage.jsx - FIXED: Answer Checking Logic
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { 
    ChevronLeft, Timer, Trophy, AlertCircle, 
    ArrowRight, CheckCircle, XCircle, Loader2,
    Code, BookOpen, Brain, Zap, Award,
    Target, TrendingUp, Clock
} from 'lucide-react';

// Code Block Component (for code questions)
const CodeBlock = ({ code }) => {
    const lines = code.split('\n');
    
    return (
        <div className="relative my-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs font-mono text-slate-400 ml-3">javascript</span>
                </div>
                <Code className="w-4 h-4 text-slate-400" />
            </div>
            <div className="bg-slate-950 p-6 overflow-x-auto">
                <pre className="text-sm leading-relaxed">
                    {lines.map((line, i) => (
                        <div key={i} className="flex gap-4 hover:bg-slate-800/50 transition-colors rounded px-2 -mx-2">
                            <span className="text-slate-600 select-none w-8 text-right flex-shrink-0 font-mono text-xs">
                                {i + 1}
                            </span>
                            <code className="text-slate-200 font-mono flex-1">
                                {line || '\u00A0'}
                            </code>
                        </div>
                    ))}
                </pre>
            </div>
        </div>
    );
};

// Progress Ring Component
const ProgressRing = ({ progress, size = 120 }) => {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;
    
    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="none"
                className="text-slate-200 dark:text-slate-800"
            />
            <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="text-indigo-500"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            />
        </svg>
    );
};

// Difficulty Badge
const DifficultyBadge = ({ difficulty }) => {
    const styles = {
        Easy: "bg-green-100 text-green-700 border-green-300",
        Medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
        Hard: "bg-red-100 text-red-700 border-red-300",
        Expert: "bg-purple-100 text-purple-700 border-purple-300"
    };
    
    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${styles[difficulty] || styles.Medium}`}>
            <Target className="w-3 h-3" />
            {difficulty}
        </div>
    );
};

// Skeleton Loader
const QuestionSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="flex gap-3">
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        </div>
        <div className="space-y-3">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
        </div>
        <div className="space-y-3 pt-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
            ))}
        </div>
    </div>
);

// Game Over Screen
const GameOverView = ({ result, time, onRetry, onExit }) => {
    const passed = result?.score >= 70;
    
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950/20 dark:to-purple-950/20 flex items-center justify-center p-6"
        >
            <motion.div 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="max-w-lg w-full"
            >
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
                    <div className={`p-8 text-center ${passed ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-orange-500 to-red-600'}`}>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                        >
                            {passed ? (
                                <Trophy className="w-20 h-20 text-white mx-auto mb-4" />
                            ) : (
                                <Target className="w-20 h-20 text-white mx-auto mb-4" />
                            )}
                        </motion.div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}
                        </h2>
                        <p className="text-white/90 text-lg">
                            {passed ? 'You passed the quiz!' : 'Almost there! Try again to improve your score.'}
                        </p>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        <div className="flex justify-center">
                            <div className="relative inline-flex">
                                <ProgressRing progress={result?.score || 0} size={140} />
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <div className="text-4xl font-black text-slate-900 dark:text-white">
                                        {result?.score?.toFixed(0)}%
                                    </div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Score</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                                <Clock className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{time}</div>
                                <div className="text-xs text-slate-500 uppercase">Time Taken</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                                <Award className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {passed ? 'Earned' : 'Not Yet'}
                                </div>
                                <div className="text-xs text-slate-500 uppercase">Certificate</div>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={onRetry}
                                className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
                            >
                                Try Again
                            </button>
                            <button 
                                onClick={onExit}
                                className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
                            >
                                Exit
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// Main Quiz Component
export default function TakeQuizPage() {
    const { quizId } = useParams();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [quizMeta, setQuizMeta] = useState(null);
    const [questionData, setQuestionData] = useState(null);
    const [history, setHistory] = useState([]);
    const [score, setScore] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [finalResult, setFinalResult] = useState(null);
    
    useEffect(() => {
        let interval = null;
        if (!gameOver && !loading) {
            interval = setInterval(() => setSeconds(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [gameOver, loading]);
    
    useEffect(() => {
        const init = async () => {
            try {
                const res = await api.get(`/quiz/${quizId}/details`);
                setQuizMeta(res.data);
                await fetchNext([]);
            } catch (error) {
                console.error('Quiz initialization failed:', error);
                alert('Failed to load quiz. Please try again.');
                navigate('/student/quizzes');
            }
        };
        init();
    }, [quizId]);
    
    const fetchNext = async (currentHistory) => {
        setLoading(true);
        setIsAnswered(false);
        setSelectedOption(null);
        
        try {
            const res = await api.post('/quiz/next', { quizId, history: currentHistory });
            setQuestionData(res.data);
        } catch (error) {
            console.error('Failed to fetch question:', error);
            alert('Failed to load next question');
        } finally {
            setLoading(false);
        }
    };
    
    // --- FIXED: STRONGER STRING NORMALIZATION FOR ANSWER CHECKING ---
    const handleAnswer = (option) => {
        if (isAnswered) return;
        setSelectedOption(option);
        setIsAnswered(true);
        
        // Trim whitespace and compare lowercase to prevent false "wrong" results
        const normalizedSelected = option.trim().toLowerCase();
        const normalizedCorrect = questionData.correctAnswer.trim().toLowerCase();
        
        console.log('🎯 Comparing Answer:', {
            selected: normalizedSelected,
            correct: normalizedCorrect
        });

        if (normalizedSelected === normalizedCorrect) {
            setScore(s => s + 1);
            console.log('✅ Correct Answer detected.');
        } else {
            console.log('❌ Wrong Answer detected.');
        }
    };
    
    const handleNext = async () => {
        const normalizedSelected = selectedOption.trim().toLowerCase();
        const normalizedCorrect = questionData.correctAnswer.trim().toLowerCase();
        const isCorrect = normalizedSelected === normalizedCorrect;
        
        const newHistory = [...history, { 
            questionText: questionData.question, 
            isCorrect: isCorrect 
        }];
        setHistory(newHistory);
        
        if (newHistory.length >= (quizMeta?.totalQuestions || 10)) {
            const finalScorePercentage = (score / (quizMeta?.totalQuestions || 10)) * 100;
            
            try {
                const submitRes = await api.post('/quiz/submit', {
                    quizId,
                    score: score
                });
                
                setFinalResult({ 
                    score: finalScorePercentage,
                    passed: submitRes.data.passed,
                    certificateId: submitRes.data.certificateId
                });
                setGameOver(true);
            } catch (error) {
                console.error('Submit failed:', error);
                setFinalResult({ score: finalScorePercentage });
                setGameOver(true);
            }
        } else {
            await fetchNext(newHistory);
        }
    };
    
    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    
    if (gameOver) {
        return (
            <GameOverView 
                result={finalResult} 
                time={formatTime(seconds)}
                onRetry={() => window.location.reload()}
                onExit={() => navigate('/student/quizzes')}
            />
        );
    }
    
    const progress = ((history.length + 1) / (quizMeta?.totalQuestions || 10)) * 100;
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-indigo-950/10 dark:to-purple-950/10">
            {/* Header */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={() => navigate('/student/quizzes')}
                            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium group"
                        >
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            Exit Quiz
                        </button>
                        
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 px-4 py-2 rounded-full">
                                <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
                                    {quizMeta?.topic || 'Loading...'}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">
                                <Timer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                    {formatTime(seconds)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="max-w-5xl mx-auto px-6 pt-8">
                <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                        <span className="text-slate-500 dark:text-slate-400">Progress</span>
                        <span className="text-indigo-600 dark:text-indigo-400">
                            Question {history.length + 1} of {quizMeta?.totalQuestions || 10}
                        </span>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Score: {score}/{history.length + 1}</span>
                        <span>Accuracy: {history.length > 0 ? Math.round((score / history.length) * 100) : 0}%</span>
                    </div>
                </div>
            </div>
            
            {/* Question Card */}
            <div className="max-w-5xl mx-auto px-6 pb-12">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="skeleton"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12"
                        >
                            <QuestionSkeleton />
                        </motion.div>
                    ) : (
                        <motion.div
                            key={questionData?.question}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                        >
                            <div className="p-8 md:p-12 space-y-8">
                                <div className="flex items-center justify-between">
                                    <DifficultyBadge difficulty={questionData?.difficulty} />
                                    {questionData?.hasCode && (
                                        <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                            <Code className="w-3 h-3" />
                                            Code Question
                                        </div>
                                    )}
                                </div>
                                
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                                    {questionData?.question}
                                </h2>
                                
                                {questionData?.hasCode && questionData?.codeSnippet && (
                                    <CodeBlock code={questionData.codeSnippet} />
                                )}
                                
                                <div className="grid gap-4">
                                    {questionData?.options.map((option, i) => {
                                        // FIXED: Normalize both for UI feedback comparison
                                        const normalizedOption = option.trim().toLowerCase();
                                        const normalizedCorrect = questionData.correctAnswer.trim().toLowerCase();
                                        const normalizedSelected = selectedOption ? selectedOption.trim().toLowerCase() : null;
                                        
                                        const isCorrect = normalizedOption === normalizedCorrect;
                                        const isSelected = normalizedOption === normalizedSelected;
                                        const showResult = isAnswered;
                                        
                                        let className = "group relative flex items-center p-6 rounded-2xl border-2 transition-all text-left font-semibold text-lg cursor-pointer";
                                        
                                        if (showResult) {
                                            if (isCorrect) {
                                                className += " bg-green-50 dark:bg-green-950/20 border-green-500 text-green-800 dark:text-green-300 shadow-lg shadow-green-500/20";
                                            } else if (isSelected) {
                                                className += " bg-red-50 dark:bg-red-950/20 border-red-500 text-red-800 dark:text-red-300 shadow-lg shadow-red-500/20";
                                            } else {
                                                className += " opacity-50 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50";
                                            }
                                        } else {
                                            className += " bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:scale-[1.02] active:scale-[0.98]";
                                        }
                                        
                                        return (
                                            <motion.button
                                                key={i}
                                                disabled={isAnswered}
                                                onClick={() => handleAnswer(option)}
                                                className={className}
                                                whileHover={!isAnswered ? { x: 4 } : {}}
                                                whileTap={!isAnswered ? { scale: 0.98 } : {}}
                                            >
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold mr-4 transition-colors ${
                                                    showResult && isCorrect ? 'bg-green-500 text-white' :
                                                    showResult && isSelected ? 'bg-red-500 text-white' :
                                                    isSelected && !showResult ? 'bg-indigo-500 text-white' :
                                                    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900'
                                                }`}>
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                                
                                                <span className="flex-1">{option}</span>
                                                
                                                {showResult && isCorrect && (
                                                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                                                )}
                                                {showResult && isSelected && !isCorrect && (
                                                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                                
                                {isAnswered && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border-t border-slate-200 dark:border-slate-800 pt-8 space-y-6"
                                    >
                                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                                                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2">Explanation</h3>
                                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                                        {questionData.explanation}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={handleNext}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            Continue
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}