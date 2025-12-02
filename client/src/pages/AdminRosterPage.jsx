// In client/src/pages/AdminRosterPage.jsx
import React, { useState } from 'react';
import api from '../api';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Upload, FileUp } from "lucide-react";
// ---

function AdminRosterPage() {
    const [file, setFile] = useState(null);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResponse(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file to upload.');
            return;
        }

        setLoading(true);
        setError('');
        setResponse(null);

        const formData = new FormData();
        formData.append('rosterFile', file);

        try {
            const res = await api.post('/admin/import-roster', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResponse(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        // --- FIXED BACKGROUND ---
        <div className="min-h-screen bg-muted/40 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    {/* --- FIXED TEXT COLOR --- */}
                    <h1 className="text-3xl font-bold text-foreground">Import Student Roster</h1>
                    <p className="text-muted-foreground mt-2">
                        Bulk activate student accounts by uploading a master CSV file.
                    </p>
                </div>
                
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileUp className="h-5 w-5 text-blue-600" />
                            Upload CSV
                        </CardTitle>
                        <CardDescription>
                            The CSV must contain headers: <strong>name, email, usn, department, year, semester</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="file">Student Roster File</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="cursor-pointer"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Uploading...' : 'Import Roster'}
                            </Button>
                        </form>

                        {error && (
                            <Alert variant="destructive" className="mt-4">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        {response && (
                            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md">
                                <h3 className="font-bold text-green-800 dark:text-green-300">Import Complete</h3>
                                <p className="text-sm text-green-700 dark:text-green-400 mt-1">{response.message}</p>
                                {response.errors && response.errors.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-sm text-red-700 dark:text-red-400">Import Errors:</h4>
                                        <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-300 mt-1 max-h-40 overflow-y-auto">
                                            {response.errors.slice(0, 10).map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                            {response.errors.length > 10 && (
                                                <li>...and {response.errors.length - 10} more.</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default AdminRosterPage;