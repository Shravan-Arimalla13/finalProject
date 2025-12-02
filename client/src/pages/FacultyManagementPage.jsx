// client/src/pages/FacultyManagementPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../api';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge-item";
import { Trash2, Shield } from "lucide-react";
// ---

function FacultyManagementPage() {
    const [faculty, setFaculty] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchFaculty();
    }, []);

    const fetchFaculty = async () => {
        try {
            const response = await api.get('/users/faculty');
            setFaculty(response.data);
        } catch (err) {
            setError('Failed to fetch faculty list');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to remove this faculty member?')) {
            try {
                // Re-using the generic delete endpoint (ensure your deleteStudent controller handles any user ID)
                await api.delete(`/users/students/${id}`); 
                fetchFaculty();
            } catch (err) {
                alert('Failed to delete.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-muted/40 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-foreground mb-6">Faculty Management</h1>
                
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Registered Department Admins</CardTitle>
                        <CardDescription>Manage faculty members who have access to create events and issue certificates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {faculty.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No faculty members found.</TableCell></TableRow>
                                    ) : (
                                        faculty.map((f) => (
                                            <TableRow key={f._id}>
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-blue-600" /> {f.name}
                                                </TableCell>
                                                <TableCell><Badge variant="outline">{f.department}</Badge></TableCell>
                                                <TableCell className="text-muted-foreground">{f.email}</TableCell>
                                                <TableCell>
                                                    {f.isVerified ? <span className="text-green-600 text-xs font-bold">Active</span> : <span className="text-yellow-600 text-xs">Pending</span>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(f._id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default FacultyManagementPage;