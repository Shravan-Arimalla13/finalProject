import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // For smooth animations
import api from '../api';

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
            console.error("AI Error:", err);
        }
        setLoading(false);
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
                const res = await api.post('/submit', { quizId, score: isCorrect ? score + 1 : score });
                setFinalResult(res.data);
                setGameOver(true);
            } catch (err) {
                alert("Submission failed");
            }
        } else {
            fetchNext(newHistory);
        }
    };

    const diffBadge = {
        Easy: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        Medium: "bg-sky-500/10 text-sky-500 border-sky-500/20",
        Hard: "bg-rose-500/10 text-rose-500 border-rose-500/20"
    };

    if (gameOver) return <GameOverScreen result={finalResult} navigate={navigate} />;

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30">
            {/* Animated Background Blur */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-4xl mx-auto px-4 py-8 md:py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            {quizMeta?.topic || 'Assessing...'}
                        </h1>
                        <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            AI-Powered Adaptive Assessment
                        </p>
                    </div>
                    <button onClick={() => navigate('/student/quizzes')} className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                        Cancel Quiz
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-10">
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            Progress: {history.length + 1} / {quizMeta?.totalQuestions || '--'}
                        </span>
                        {!loading && (
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${diffBadge[questionData?.difficulty]}`}>
                                {questionData?.difficulty}
                            </span>
                        )}
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${((history.length + 1) / (quizMeta?.totalQuestions || 1)) * 100}%` }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        />
                    </div>
                </div>

                {/* Main Quiz Card */}
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={questionData?.question}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl"
                    >
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                                <p className="text-slate-500 animate-pulse italic">Gemini is thinking...</p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl md:text-2xl font-semibold leading-relaxed mb-10">
                                    {questionData?.question}
                                </h2>

                                <div className="grid gap-4">
                                    {questionData?.options.map((opt, i) => {
                                        const isCorrect = opt === questionData.correctAnswer;
                                        const isSelected = opt === selectedOption;
                                        
                                        let stateStyles = "border-slate-800 hover:bg-slate-800/50 hover:border-slate-700";
                                        if (isAnswered) {
                                            if (isCorrect) stateStyles = "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]";
                                            else if (isSelected) stateStyles = "bg-rose-500/10 border-rose-500/50 text-rose-400";
                                            else stateStyles = "opacity-40 border-slate-800";
                                        }

                                        return (
                                            <motion.button
                                                key={i}
                                                whileHover={!isAnswered ? { scale: 1.01 } : {}}
                                                whileTap={!isAnswered ? { scale: 0.99 } : {}}
                                                onClick={() => handleAnswer(opt)}
                                                disabled={isAnswered}
                                                className={`group relative flex items-center p-5 rounded-2xl border-2 transition-all text-left ${stateStyles}`}
                                            >
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 text-xs font-bold transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                    {String.fromCharCode(65 + i)}
                                                </span>
                                                <span className="flex-grow font-medium">{opt}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                {/* Explanation Section */}
                                <AnimatePresence>
                                    {isAnswered && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            className="mt-8 pt-8 border-t border-slate-800"
                                        >
                                            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6">
                                                <p className="text-indigo-400 text-sm font-bold uppercase tracking-widest mb-2">Learning Insight</p>
                                                <p className="text-slate-400 text-sm leading-relaxed">{questionData.explanation}</p>
                                            </div>
                                            <button 
                                                onClick={handleNext}
                                                className="w-full mt-6 bg-white text-slate-900 hover:bg-slate-200 py-4 rounded-2xl font-bold transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] flex justify-center items-center gap-2"
                                            >
                                                Next Question
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function GameOverScreen({ result, navigate }) {
    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-center">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full bg-slate-900 border border-slate-800 p-10 rounded-[40px] shadow-2xl"
            >
                <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
                </div>
                <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
                <p className="text-slate-500 mb-8">Adaptive assessment finalized.</p>
                
                <div className="bg-slate-800/50 rounded-3xl p-6 mb-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Final Score</p>
                    <p className="text-4xl font-bold text-white">{result?.score?.toFixed(1)}%</p>
                </div>

                <button 
                    onClick={() => navigate('/student/quizzes')}
                    className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold transition-all"
                >
                    Return to Dashboard
                </button>
            </motion.div>
        </div>
    );
}