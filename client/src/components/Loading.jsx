import React from 'react';
import { Loader2 } from "lucide-react";

const Loading = () => (
    <div className="h-screen w-full flex items-center justify-center bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
    </div>
);

export default Loading;