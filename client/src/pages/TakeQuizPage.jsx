import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api'; // Your Axios instance

export default function TakeQuizPage() {
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

  useEffect(() => {
    const init = async () => {
      const res = await api.get(`/quiz/${quizId}/details`);
      setQuizMeta(res.data);
      fetchNext([]);
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
    } catch (err) { alert("AI Error. Try again."); }
    setLoading(false);
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
      const res = await api.post('/quiz/submit', { quizId, score: isCorrect ? score + 1 : score });
      setFinalResult(res.data);
      setGameOver(true);
    } else {
      fetchNext(newHistory);
    }
  };

  if (gameOver) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-4xl font-bold">{finalResult.passed ? '🎉 Passed!' : '❌ Try Again'}</h1>
      <p className="mt-4">Final Score: {finalResult.score.toFixed(1)}%</p>
      <button onClick={() => navigate('/student/quizzes')} className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-lg">Return Home</button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
        {/* Progress bar logic as per your previous UI code */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            <div className="bg-indigo-600 p-8 text-white min-h-[150px]">
                {loading ? "Loading AI Question..." : <h2 className="text-xl">{questionData?.question}</h2>}
            </div>
            <div className="p-6 space-y-3">
                {questionData?.options.map((opt, i) => (
                    <button 
                        key={i} 
                        disabled={isAnswered}
                        onClick={() => handleAnswer(opt)}
                        className={`w-full p-4 text-left border rounded-lg transition-all ${
                            isAnswered && opt === questionData.correctAnswer ? 'bg-green-100 border-green-500' : 
                            isAnswered && opt === selectedOption ? 'bg-red-100 border-red-500' : 'hover:border-indigo-500'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
                {isAnswered && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm"><b>Explanation:</b> {questionData.explanation}</p>
                        <button onClick={handleNext} className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg">Next</button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}