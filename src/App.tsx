import React, { useState } from "react";
import { Activity, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface HealthCheck {
  status: string;
  timestamp: string;
  uptime: number;
  message: string;
  environment: string;
}

function App() {
  const [healthData, setHealthData] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend URL - replace with your Azure backend URL after deployment
  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  const checkHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Activity className="mx-auto h-12 w-12 text-blue-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Health Check Dashboard
          </h1>
          <p className="text-gray-600">
            Check the status of your backend service
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Activity className="h-5 w-5" />
              Check Backend Health
            </>
          )}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  Connection Error
                </h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {healthData && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800 mb-3">
                  Backend Status: {healthData.status}
                </h3>
                <div className="space-y-2 text-sm text-green-700">
                  <div className="flex justify-between">
                    <span className="font-medium">Environment:</span>
                    <span className="capitalize">{healthData.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Uptime:</span>
                    <span>{formatUptime(healthData.uptime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Last Check:</span>
                    <span>
                      {new Date(healthData.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-green-600 italic">
                  {healthData.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            Backend URL:{" "}
            <code className="bg-gray-100 px-1 rounded">{BACKEND_URL}</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
