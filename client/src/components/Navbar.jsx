// In client/src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ModeToggle } from './ModeToggle'; 
import { Button } from "./ui/button"; 
import { GraduationCap, LayoutDashboard, LogOut, UserCircle, BrainCircuit } from "lucide-react";

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    
                    {/* --- Logo / Brand --- */}
                    <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight hidden md:block text-foreground">
                            CredentialChain
                        </span>
                    </Link>

                    {/* --- Right Side Actions --- */}
                    <div className="flex items-center gap-3">
                        
                        {/* 1. Dark Mode Toggle (Always Visible) */}
                        <ModeToggle />

                        {/* 2. Auth Buttons (Strictly Conditional) */}
{/* 2. Auth Buttons */}
{isAuthenticated && user ? (
        <>
            {/* 1. User Profile Link (Clickable Name) */}
            {/* 1. User Profile Link (Clickable Name) */}
            {user.role === 'Student' ? (
                <Link to="/profile" className="hidden md:flex items-center text-sm text-muted-foreground mr-2 border-r pr-4 h-6 hover:text-primary transition-colors">
                    <UserCircle className="h-4 w-4 mr-2" />
                    <span className="max-w-[100px] truncate font-medium">{user.name}</span>
                </Link>
            ) : (
                // Non-clickable name for Admin/Faculty
                <div className="hidden md:flex items-center text-sm text-muted-foreground mr-2 border-r pr-4 h-6 cursor-default">
                    <UserCircle className="h-4 w-4 mr-2" />
                    <span className="max-w-[100px] truncate font-medium">{user.name}</span>
                </div>
            )}

            {/* 2. Quiz Links (Existing) */}
            {(user.role === 'Faculty' || user.role === 'SuperAdmin') && (
                <Link to="/faculty/quiz">
                    <Button variant="ghost" size="sm" className="gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                        <BrainCircuit className="h-4 w-4" />
                        <span className="hidden sm:inline">Create Quiz</span>
                    </Button>
                </Link>
            )}

            {user.role === 'Student' && (
                <Link to="/student/quizzes">
                    <Button variant="ghost" size="sm" className="gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                        <BrainCircuit className="h-4 w-4" />
                        <span className="hidden sm:inline">Skill Quizzes</span>
                    </Button>
                </Link>
            )}
            
            {/* 3. Dashboard Link */}
            <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                </Button>
            </Link>
            
            {/* 4. Logout */}
            <Button onClick={handleLogout} variant="destructive" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
            </Button>
        </>
    ) : (
                            <Link to="/login">
                                <Button size="sm">Login</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;