import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-red-50 rounded-lg border border-red-100 m-4">
          <div className="bg-red-100 p-4 rounded-full mb-4">
             <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-red-900">Something went wrong.</h2>
          <p className="text-red-700 mb-6">The application encountered an unexpected error.</p>
          <Button onClick={() => window.location.reload()} variant="destructive">
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;