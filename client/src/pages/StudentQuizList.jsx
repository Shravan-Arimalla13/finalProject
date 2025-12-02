// client/src/pages/StudentQuizList.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge-item";

function StudentQuizList() {
    const [quizzes, setQuizzes] = useState([]);

    useEffect(() => {
        api.get('/quiz/list').then(res => setQuizzes(res.data));
    }, []);

    return (
        <div className="p-8 bg-muted/40 min-h-screen">
            <h1 className="text-3xl font-bold mb-6">Available Skill Assessments</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {quizzes.map(q => (
                    <Card key={q._id} className="hover:shadow-lg transition">
                        <CardHeader>
                            <div className="flex justify-between">
                                <CardTitle>{q.topic}</CardTitle>
                                <Badge>{q.totalQuestions} Qs</Badge>
                            </div>
                        </CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{q.description}</p></CardContent>
                        <CardFooter>
                            <Link to={`/take-quiz/${q._id}`} className="w-full">
                                <Button className="w-full">Start Assessment</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
export default StudentQuizList;