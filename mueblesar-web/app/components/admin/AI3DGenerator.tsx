"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface AI3DGeneratorProps {
  productId: number;
  productName: string;
  currentImageUrl?: string | null;
  currentArUrl?: string | null;
  onSuccess?: (glbUrl: string) => void;
}

interface GenerationJob {
  id: number;
  productId: number;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED";
  progress?: number;
  glbUrl?: string;
  error?: string;
}

export function AI3DGenerator({ productId, productName, currentImageUrl, currentArUrl, onSuccess }: AI3DGeneratorProps) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || "");
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3001";

  // Poll job status when in progress
  useEffect(() => {
    if (!job || job.status === "SUCCEEDED" || job.status === "FAILED") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/admin/ai-3d/jobs/${job.id}/status`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to check status");
        }

        const data = await res.json();
        setJob(data);

        if (data.status === "SUCCEEDED") {
          clearInterval(interval);
          if (onSuccess && data.glbUrl) {
            onSuccess(data.glbUrl);
          }
        } else if (data.status === "FAILED") {
          clearInterval(interval);
          setError(data.error || "Generation failed");
        }
      } catch (err) {
        console.error("Status check error:", err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [job, apiBase, onSuccess]);

  const handleGenerate = async () => {
    if (!imageUrl) {
      setError("Please provide an image URL");
      return;
    }

    setLoading(true);
    setError(null);
    setJob(null);

    try {
      const res = await fetch(`${apiBase}/api/admin/ai-3d/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId,
          imageUrl,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to start generation");
      }

      const data = await res.json();
      setJob({
        id: data.jobId,
        productId,
        status: "IN_PROGRESS",
        progress: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = () => {
    if (!job) return null;

    switch (job.status) {
      case "PENDING":
      case "IN_PROGRESS":
        return (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <span className="font-medium text-blue-900">Generating 3D model...</span>
            </div>
            <p className="text-sm text-blue-700">Progress: {job.progress || 0}%</p>
            <p className="mt-1 text-xs text-blue-600">This may take 1-3 minutes. You can leave this page.</p>
          </div>
        );

      case "SUCCEEDED":
        return (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium text-green-900">3D model generated!</span>
            </div>
            {job.glbUrl && (
              <div className="mt-2">
                <p className="text-sm text-green-700">GLB URL:</p>
                <a
                  href={job.glbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-xs text-green-600 underline hover:text-green-800"
                >
                  {job.glbUrl}
                </a>
              </div>
            )}
          </div>
        );

      case "FAILED":
        return (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium text-red-900">Generation failed</span>
            </div>
            {job.error && <p className="text-sm text-red-700">{job.error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="mb-1 font-semibold text-slate-900">🤖 AI 3D Model Generation</h3>
        <p className="text-sm text-slate-600">Generate a 3D model from a product image using AI</p>
      </div>

      {currentArUrl && (
        <div className="rounded border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">
            ✅ This product already has a 3D model:{" "}
            <a href={currentArUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
              View GLB
            </a>
          </p>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Image URL</label>
        <Input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/furniture-image.jpg"
          disabled={loading || (job?.status === "IN_PROGRESS" || job?.status === "PENDING")}
        />
        <p className="mt-1 text-xs text-slate-500">Use a clear, well-lit image with white background for best results</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {renderStatus()}

      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={loading || !imageUrl || job?.status === "IN_PROGRESS" || job?.status === "PENDING"}
          className="flex-1"
        >
          {loading ? "Starting..." : job?.status === "IN_PROGRESS" || job?.status === "PENDING" ? "Generating..." : "Generate 3D Model"}
        </Button>

        {job && job.status === "SUCCEEDED" && (
          <Button
            variant="secondary"
            onClick={() => {
              setJob(null);
              setError(null);
            }}
          >
            Generate Again
          </Button>
        )}
      </div>

      <div className="rounded border border-blue-100 bg-blue-50 p-3">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Generation typically takes 1-3 minutes and costs ~$0.30-2 per model. The product will be automatically updated when completed.
        </p>
      </div>
    </div>
  );
}
