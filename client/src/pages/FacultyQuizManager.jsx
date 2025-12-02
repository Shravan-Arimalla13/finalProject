// In client/src/pages/FacultyQuizManager.jsx
import React, { useState } from 'react';
import api from '../api';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner"; // <-- IMPORT TOAST
import { BrainCircuit, Loader2 } from "lucide-react";
// ---

function FacultyQuizManager() {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ 
        topic: '', 
        description: '', 
        totalQuestions: 15, 
        passingScore: 60 
    });

    const handleCreate = async () => {
        // Validation
        if (!form.topic || !form.description) {
            toast.error("Missing Details", {
                description: "Please provide a topic and description."
            });
            return;
        }

        setLoading(true);
        try {
            await api.post('/quiz/create', form);
            
            // --- SUCCESS TOAST ---
            toast.success("Quiz Created Successfully!", {
                description: `Topic: ${form.topic} | Passing Score: ${form.passingScore}%`,
                duration: 4000,
            });
            
            // Reset Form
            setForm({ topic: '', description: '', totalQuestions: 15, passingScore: 60 });

        } catch (err) {
            // --- ERROR TOAST ---
            toast.error("Creation Failed", {
                description: err.response?.data?.message || "Could not create quiz. Please try again."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-muted/40 min-h-screen flex justify-center items-start pt-12">
            <Card className="w-full max-w-xl shadow-lg border-t-4 border-indigo-600">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-indigo-100 p-2.5 rounded-xl">
                            <BrainCircuit className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Post Skill Assessment</CardTitle>
                            <CardDescription>Create an AI-adaptive quiz for your students.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label>Quiz Topic</Label>
                        <Input 
                            placeholder="e.g. Advanced React Patterns"
                            value={form.topic} 
                            onChange={e => setForm({...form, topic: e.target.value})} 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                            placeholder="Briefly describe what skills this quiz tests..."
                            value={form.description} 
                            onChange={e => setForm({...form, description: e.target.value})} 
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Total Questions</Label>
                            <Input 
                                type="number" 
                                min="5" 
                                max="50"
                                value={form.totalQuestions} 
                                onChange={e => setForm({...form, totalQuestions: Number(e.target.value)})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Passing Score (%)</Label>
                            <Input 
                                type="number" 
                                min="10" 
                                max="100"
                                value={form.passingScore} 
                                onChange={e => setForm({...form, passingScore: Number(e.target.value)})} 
                            />
                        </div>
                    </div>

                    <Button 
                        onClick={handleCreate} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-md h-11 mt-2"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {loading ? "Creating..." : "Post Quiz"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

export default FacultyQuizManager;