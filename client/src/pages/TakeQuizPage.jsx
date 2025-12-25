import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// Ensure the path and casing match your file system exactly (api.js vs Api.js)
import api from '../api'; 
import { 
    ChevronLeft, Timer, Trophy, AlertCircle, 
    ArrowRight, CheckCircle, XCircle, Loader2 
} from 'lucide-react';

export default function TakeQuizPage() {
    const { quizId } = useParams();
    const navigate = useNavigate();

    // State Management
    const [loading, setLoading] = useState(true);
    const [quizMeta, setQuizMeta] = useState(null);
    const [questionData, setQuestionData] = useState(null);
    const [history, setHistory] = useState([]);
    const [score, setScore] = useState(0);
    const [seconds, setSeconds] = useState(0);

    // Interaction State
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [finalResult, setFinalResult] = useState(null);

    // Timer Logic
    useEffect(() => {
        let interval = null;
        if (!gameOver && !loading) {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameOver, loading]);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await api.get(`/quiz/${quizId}/details`);
                setQuizMeta(res.data);
                fetchNext([]);
            } catch (err) {
                console.error("Quiz Init Error:", err);
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
            // Adaptive AI Call
            const res = await api.post('/quiz/next', { quizId, history: currentHistory });
            setQuestionData(res.data);
        } catch (err) {
            console.error("AI Generation Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (option) => {
        if (isAnswered) return;
        setSelectedOption(option);
        setIsAnswered(true);
        if (option === questionData.correctAnswer) setScore(s => s + 1);
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
            } catch (err) { console.error("Submit Error:", err); }
        } else {
            fetchNext(newHistory);
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    if (gameOver) return <GameOverView result={finalResult} time={formatTime(seconds)} navigate={navigate} />;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header with Timer */}
                <div className="flex items-center justify-between mb-8">
                    <button 
                        onClick={() => navigate('/student/quizzes')}
                        className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors font-medium"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" /> Back
                    </button>
                    
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-800">
                        <Timer className="w-4 h-4 text-indigo-500" />
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{formatTime(seconds)}</span>
                    </div>
                </div>

                {/* Progress Tracking */}
                <div className="mb-10 space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Progress</span>
                        <span>{history.length + 1} / {quizMeta?.totalQuestions || 10}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-indigo-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${((history.length + 1) / (quizMeta?.totalQuestions || 10)) * 100}%` }}
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {loading ? (
                        <SkeletonLoader key="skeleton" />
                    ) : (
                        <motion.div
                            key={questionData?.question}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden p-8 md:p-12"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    {questionData?.difficulty}
                                </span>
                            </div>
                            
                            <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-tight mb-10">
                                {questionData?.question}
                            </h2>

                            <div className="grid gap-4">
                                {questionData?.options.map((option, i) => {
                                    const isCorrect = option === questionData.correctAnswer;
                                    const isSelected = option === selectedOption;
                                    const showResult = isAnswered;

                                    return (
                                        <button
                                            key={i}
                                            disabled={isAnswered}
                                            onClick={() => handleAnswer(option)}
                                            className={`flex items-center p-5 rounded-2xl border-2 transition-all text-left font-semibold ${
                                                showResult 
                                                    ? isCorrect 
                                                        ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                                                        : isSelected 
                                                            ? "bg-rose-50 border-rose-500 text-rose-700" 
                                                            : "opacity-40 border-slate-100"
                                                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-indigo-500"
                                            }`}
                                        >
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 text-xs font-bold ${
                                                isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                                            }`}>
                                                {String.fromCharCode(65 + i)}
                                            </span>
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>

                            {isAnswered && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6 text-sm text-slate-600 dark:text-slate-400 italic">
                                        <span className="font-bold text-indigo-500 not-italic">Note: </span>{questionData.explanation}
                                    </div>
                                    <button 
                                        onClick={handleNext}
                                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        Next Question <ArrowRight className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function SkeletonLoader() {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded mb-8" />
            <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded mb-4" />
            <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-12" />
            <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

function GameOverView({ result, time, navigate }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800">
                <Trophy className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Quiz Finished!</h2>
                <p className="text-slate-500 mb-8">Completed in {time}</p>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-6 mb-8 text-4xl font-black text-slate-900 dark:text-white">
                    {result?.score?.toFixed(1)}%
                </div>
                <button 
                    onClick={() => navigate('/student/quizzes')}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold"
                >
                    Back to Dashboard
                </button>
            </motion.div>
        </div>
    );
}