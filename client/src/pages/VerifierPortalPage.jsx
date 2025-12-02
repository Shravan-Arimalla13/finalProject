// In client/src/pages/VerifierPortalPage.jsx
import React, { useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Search, Loader2, Award, User, ExternalLink } from "lucide-react";
// ---

function VerifierPortalPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false); // To show "no results"

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setHasSearched(true);
        try {
            const response = await api.get(`/verifier/search?query=${query}`);
            setResults(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Search failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="w-full max-w-5xl">
                <Card className="shadow-lg mb-8">
                    <CardHeader className="text-center">
                        <Award className="h-12 w-12 mx-auto text-blue-600" />
                        <CardTitle className="text-3xl font-bold mt-4">Public Credential Verifier</CardTitle>
                        <CardDescription className="text-lg">
                            Search for credentials by event, workshop, or skill name.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex space-x-2">
                            <Input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="e.g., 'Python Workshop' or 'Hackathon'"
                                className="flex-1 text-base"
                            />
                            <Button type="submit" className="w-24" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* --- RESULTS --- */}
                {loading && (
                    <div className="flex items-center justify-center text-slate-500 py-10">
                        <Loader2 className="h-8 w-8 animate-spin mr-2" />
                        <span className="text-xl">Searching the ledger...</span>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
                )}

                {!loading && hasSearched && (
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>Verification Results</CardTitle>
                            <CardDescription>{results.length} credential(s) found for "{query}"</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Credential</TableHead>
                                            <TableHead>Issued By</TableHead>
                                            <TableHead>Verify</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-24">No verified credentials found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            results.map((cert) => (
                                                <TableRow key={cert.certificateId}>
                                                    <TableCell className="font-medium">{cert.studentName}</TableCell>
                                                    <TableCell>{cert.eventName}</TableCell>
                                                    <TableCell>{cert.issuedBy}</TableCell>
                                                    <TableCell>
                                                        <Link to={`/verify/${cert.certificateId}`} target="_blank">
                                                            <Button variant="outline" size="sm">
                                                                View Details <ExternalLink className="h-3 w-3 ml-2" />
                                                            </Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

            </div>
        </div>
    );
}

export default VerifierPortalPage;