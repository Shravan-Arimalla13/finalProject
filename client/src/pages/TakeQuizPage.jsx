import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { 
    ChevronLeft, Timer, Trophy, AlertCircle, 
    ArrowRight, CheckCircle, XCircle, Loader2 
} from 'lucide-react';

export default function TakeQuizPage() {
    const { quizId } = useParams();
    const navigate = useNavigate();

    // State
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

    // 1. Timer Logic
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
        } catch (err) {
            console.error("AI Generation Error");
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
            } catch (err) { console.error(err); }
        } else {
            fetchNext(newHistory);
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    if (gameOver) return <GameOverView result={finalResult} time={formatTime(seconds)} navigate={navigate} />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Custom Navigation Header */}
                <div className="flex items-center justify-between mb-8">
                    <button 
                        onClick={() => navigate('/student/quizzes')}
                        className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" />
                        <span className="text-sm font-semibold">Exit Session</span>
                    </button>
                    
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                            <Timer className="w-4 h-4 mr-2" />
                            {formatTime(seconds)}
                        </div>
                    </div>
                </div>

                {/* Progress Tracking */}
                <div className="mb-10">
                    <div className="flex justify-between items-end mb-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Assessment Progress
                        </p>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                            {history.length + 1} <span className="text-slate-400">/ {quizMeta?.totalQuestions || 10}</span>
                        </p>
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
                        <SkeletonLoader key="loader" />
                    ) : (
                        <motion.div
                            key={questionData?.question}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 border border-slate-100 dark:border-slate-800 overflow-hidden"
                        >
                            <div className="p-8 md:p-12">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md border ${
                                        questionData?.difficulty === 'Hard' ? 'border-rose-500 text-rose-500' : 'border-emerald-500 text-emerald-500'
                                    }`}>
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
                                                className={`group relative flex items-center p-5 rounded-2xl border-2 transition-all duration-200 text-left ${
                                                    showResult 
                                                        ? isCorrect 
                                                            ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                                                            : isSelected 
                                                                ? "bg-rose-50 border-rose-500 text-rose-700" 
                                                                : "opacity-40 border-slate-100"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10"
                                                }`}
                                            >
                                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 text-sm font-bold transition-colors ${
                                                    isSelected ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                                                }`}>
                                                    {String.fromCharCode(65 + i)}
                                                </span>
                                                <span className="flex-grow font-semibold">{option}</span>
                                                {showResult && isCorrect && <CheckCircle className="w-6 h-6 text-emerald-500" />}
                                                {showResult && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-rose-500" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                {isAnswered && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800"
                                    >
                                        <div className="bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-2xl mb-6">
                                            <p className="text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-2">Academic Insight</p>
                                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{questionData.explanation}</p>
                                        </div>
                                        <button 
                                            onClick={handleNext}
                                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            Next Question
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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

function SkeletonLoader() {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md mb-8" />
            <div className="space-y-4 mb-12">
                <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
            <div className="grid gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

function GameOverView({ result, time, navigate }) {
    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center justify-center p-6">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-center border border-slate-100 dark:border-slate-800"
            >
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Assessment Over</h2>
                <p className="text-slate-500 mb-8">Completed in {time}</p>
                
                <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-6 mb-8">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Score</p>
                    <p className="text-5xl font-black text-slate-900 dark:text-white">{result?.score?.toFixed(1)}%</p>
                </div>

                <button 
                    onClick={() => navigate('/student/quizzes')}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                >
                    Return to Dashboard
                </button>
            </motion.div>
        </div>
    );
}