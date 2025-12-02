// In client/src/pages/AdminRevokePage.jsx
import React, { useState } from 'react';
import api from '../api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert-box";
import { Loader2, XCircle } from "lucide-react";

function AdminRevokePage() {
    const [certId, setCertId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!certId) {
            setError('Please enter a Certificate ID.');
            return;
        }
        if (!window.confirm('Are you SURE you