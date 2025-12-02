// In client/src/pages/StudentManagementPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../api.js'; // Explicit .js extension
import { TableSkeleton } from '../components/TableSkeleton';

// --- SHADCN IMPORTS ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Trash2, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert-box";
import { Badge } from "@/components/ui/badge-item";

// ---

function StudentManagementPage() {
    const [students, setStudents] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true); // <-- New State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [department, setDepartment] = useState(''); 
    const [usn, setUsn] = useState('');
    const [semester, setSemester] = useState(''); 
    const [searchTerm, setSearchTerm] = useState('');

    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setIsLoadingData(true);
        try {
            const response = await api.get('/users/students');
            setStudents(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch students');
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        try {
            await api.post('/users/students', { name, email, department, usn, semester });
            setMessage('Student added to Roster successfully! Tell them to Activate their account.');
            
            setName('');
            setEmail('');
            setDepartment('');
            setUsn('');
            setSemester('');
            fetchStudents(); 
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add student');
        }
    };

    const handleDeleteStudent = async (id) => {
        if (window.confirm('Are you sure you want to delete this student?')) {
            try {
                await api.delete(`/users/students/${id}`);
                setMessage('Student deleted successfully');
                fetchStudents();
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete student');
            }
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.usn && s.usn.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-muted/40 p-4 md:p-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- Column 1: Add Student Form --- */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-8 shadow-lg">
                        <CardHeader>
                            <CardTitle>Add Student</CardTitle>
                            <CardDescription>Manually add a single student to the roster.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddStudent} className="space-y-4">
                                {message && <Alert className="bg-green-50 text-green-700 border-green-200"><AlertDescription>{message}</AlertDescription></Alert>}
                                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                                
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="usn">USN</Label>
                                    <Input id="usn" value={usn} onChange={(e) => setUsn(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. MCA" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="semester">Semester</Label>
                                    <Input id="semester" value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="e.g. 1st" required />
                                </div>
                                
                                <Button type="submit" className="w-full">Add Student to Roster</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Column 2: Student List --- */}
                <div className="lg:col-span-2">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>Registered Students</CardTitle>
                            <CardDescription>Total Activated: {students.length}</CardDescription>
                            <div className="relative pt-4">
                                <Input 
                                    placeholder="Search by name, email, or USN..." 
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Search className="absolute left-3 top-6 h-5 w-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>USN</TableHead>
                                            <TableHead>Dept</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* --- SKELETON LOADING --- */}
                                        {isLoadingData ? (
                                            <TableSkeleton columns={5} rows={5} />
                                        ) : filteredStudents.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No students found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredStudents.map((student) => (
                                                <TableRow key={student._id}>
                                                    <TableCell className="font-medium">{student.name}</TableCell>
                                                    <TableCell><Badge variant="secondary">{student.usn || 'N/A'}</Badge></TableCell>
                                                    <TableCell>{student.department}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{student.email}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            onClick={() => handleDeleteStudent(student._id)}
                                                        >
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
        </div>
    );
}

export default StudentManagementPage;