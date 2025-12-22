import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Mock API for demo - replace with your actual API
const mockAPI = {
  get: async (url) => {
    await new Promise(r => setTimeout(r, 500));
    if (url.includes('/details')) {
      return { data: { topic: 'JavaScript Fundamentals', totalQuestions: 10, passingScore: 60 } };
    }
  },
  post: async (url, data) => {
    await new Promise(r => setTimeout(r, 800));
    if (url.includes('/next')) {
      return {
        data: {
          question: 'What is a closure in JavaScript?',
          options: [
            'A function that has access to its outer scope',
            'A way to close browser windows',
            'A method to end loops',
            'A type of variable declaration'
          ],
          correctAnswer: 'A function that has access to its outer scope',
          explanation: 'A closure is a function that retains access to variables from its outer scope, even after that scope has finished executing.',
          difficulty: 'Medium',
          questionNumber: 1
        }
      };
    }
    if (url.includes('/submit')) {
      return { data: { passed: true, score: 80, certificateId: 'CERT-123', message: 'Congratulations!' } };
    }
  }
};

export default function EnhancedQuizUI() {
  const { quizId = 'demo' } = useParams();
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
    initQuiz();
  }, [quizId]);

  const initQuiz = async () => {
    try {
      const res = await mockAPI.get(`/quiz/${quizId}/details`);
      setQuizMeta(res.data);
      fetchNextQuestion([]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNextQuestion = async (currentHistory) => {
    setLoading(true);
    setSelectedOption(null);
    setIsAnswered(false);
    
    try {
      const res = await mockAPI.post('/quiz/next', { quizId, history: currentHistory });
      setQuestionData(res.data);
    } catch (err) {
      alert('Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (option) => {
    if (loading || isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    if (option === questionData.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = async () => {
    const isCorrect = selectedOption === questionData.correctAnswer;
    const newHistory = [...history, { questionText: questionData.question, isCorrect }];
    setHistory(newHistory);

    if (newHistory.length >= (quizMeta?.totalQuestions || 10)) {
      setLoading(true);
      const finalScore = isCorrect ? score + 1 : score;
      try {
        const res = await mockAPI.post('/quiz/submit', { quizId, score: finalScore });
        setFinalResult(res.data);
        setGameOver(true);
      } catch (err) {
        alert('Submission failed');
      }
    } else {
      fetchNextQuestion(newHistory);
    }
  };

  const difficultyColors = {
    Easy: 'bg-green-100 text-green-700 border-green-300',
    Medium: 'bg-amber-100 text-amber-700 border-amber-300',
    Hard: 'bg-red-100 text-red-700 border-red-300'
  };

  if (gameOver) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-t-8 border-yellow-500 animate-in zoom-in">
          <div className="mb-6">
            {finalResult?.passed ? (
              <div className="mx-auto bg-yellow-100 p-6 rounded-full w-fit mb-4 animate-bounce">
                <svg className="h-16 w-16 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            ) : (
              <div className="mx-auto bg-gray-100 p-6 rounded-full w-fit mb-4">
                <svg className="h-16 w-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              {finalResult?.passed ? 'Certified!' : 'Not Quite Yet'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">{finalResult?.message}</p>
          </div>

          {finalResult?.passed && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg mb-6 flex items-center gap-3">
              <svg className="h-8 w-8 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div className="text-left">
                <p className="text-sm font-bold text-green-800 dark:text-green-300">Blockchain Proof Generated</p>
                <p className="text-xs text-green-600 dark:text-green-400">Certificate minted to your wallet</p>
              </div>
            </div>
          )}

          <button 
            onClick={() => navigate('/student/quizzes')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg"
          >
            {finalResult?.passed ? 'View My Certificates' : 'Return to Menu'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
            <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight text-gray-800 dark:text-white">
              {quizMeta?.topic || 'Loading...'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI Adaptive Assessment</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/student/quizzes')}
          className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 text-sm flex items-center gap-2 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Exit
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Question {history.length + 1} of {quizMeta?.totalQuestions || '—'}
          </span>
          {!loading && questionData && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${difficultyColors[questionData.difficulty]}`}>
              {questionData.difficulty}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(history.length / (quizMeta?.totalQuestions || 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          {/* Question Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Question Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white min-h-[180px] flex items-center">
              {loading ? (
                <div className="space-y-3 w-full">
                  <div className="h-6 bg-white/20 rounded w-3/4 animate-pulse" />
                  <div className="h-6 bg-white/20 rounded w-1/2 animate-pulse" />
                </div>
              ) : (
                <h2 className="text-xl font-medium leading-relaxed">
                  {questionData?.question}
                </h2>
              )}
            </div>

            {/* Options */}
            <div className="p-6 grid gap-3">
              {loading ? (
                [1,2,3,4].map(i => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))
              ) : (
                questionData?.options.map((option, index) => {
                  let btnClass = 'min-h-[3.5rem] py-3 px-4 text-left border-2 hover:border-indigo-500 transition-all rounded-lg font-medium';
                  
                  if (isAnswered) {
                    if (option === questionData.correctAnswer) {
                      btnClass = 'min-h-[3.5rem] py-3 px-4 text-left bg-green-50 dark:bg-green-900/20 border-2 border-green-500 text-green-800 dark:text-green-300 rounded-lg font-medium';
                    } else if (option === selectedOption) {
                      btnClass = 'min-h-[3.5rem] py-3 px-4 text-left bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-800 dark:text-red-300 rounded-lg font-medium';
                    } else {
                      btnClass = 'min-h-[3.5rem] py-3 px-4 text-left border-2 border-gray-200 dark:border-gray-700 opacity-50 rounded-lg font-medium';
                    }
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => !isAnswered && handleAnswer(option)}
                      className={`${btnClass} flex items-center gap-3 group relative`}
                      disabled={isAnswered}
                    >
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-grow">{option}</span>
                      
                      {isAnswered && option === questionData.correctAnswer && (
                        <svg className="h-6 w-6 text-green-600 absolute right-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {isAnswered && option === selectedOption && option !== questionData.correctAnswer && (
                        <svg className="h-6 w-6 text-red-600 absolute right-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}

              {!loading && isAnswered && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">💡 Explanation: </span>
                      {questionData.explanation}
                    </p>
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    Next Question
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}