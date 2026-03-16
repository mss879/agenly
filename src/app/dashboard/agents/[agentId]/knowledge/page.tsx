"use client";
import { useEffect, useState, useCallback, use } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Loader2, AlertTriangle, Globe, Link2 } from "lucide-react";
import { formatBytes } from "@/lib/utils";

export default function KnowledgePage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [files, setFiles] = useState<Array<Record<string, unknown>>>([]);
  const [uploading, setUploading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Website crawl state
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawlMaxPages, setCrawlMaxPages] = useState(50);
  const [crawling, setCrawling] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [agentId]);

  async function fetchFiles() {
    try {
      const res = await fetch(`/api/agents/${agentId}/knowledge`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Failed to fetch files:", res.status, errData);
        return;
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch (e) {
      console.error("fetchFiles error:", e);
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    let successCount = 0;
    const errors: string[] = [];

    for (const file of acceptedFiles) {
      try {
        // 1. Get signed upload URL
        const signedRes = await fetch(`/api/agents/${agentId}/files/signed-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileSize: file.size,
          }),
        });

        if (!signedRes.ok) {
          const errData = await signedRes.json().catch(() => ({ error: "Unknown error" }));
          errors.push(`${file.name}: Failed to get upload URL — ${errData.error || signedRes.statusText}`);
          continue;
        }

        const { signedUrl, path } = await signedRes.json();

        if (!signedUrl || !path) {
          errors.push(`${file.name}: Server returned empty upload URL`);
          continue;
        }

        // 2. Upload file to Supabase Storage via signed URL
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });

        if (!uploadRes.ok) {
          errors.push(`${file.name}: Storage upload failed (${uploadRes.status})`);
          continue;
        }

        // 3. Register file in database
        const registerRes = await fetch(`/api/agents/${agentId}/files/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
            storage_path: path,
          }),
        });

        if (!registerRes.ok) {
          const errData = await registerRes.json().catch(() => ({ error: "Unknown error" }));
          errors.push(`${file.name}: Registration failed — ${errData.error || registerRes.statusText}`);
          continue;
        }

        successCount++;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        errors.push(`${file.name}: ${errMsg}`);
      }
    }

    setUploading(false);

    if (errors.length > 0) {
      setUploadError(errors.join("\n"));
    }
    if (successCount > 0) {
      setUploadSuccess(`${successCount} file(s) uploaded successfully!`);
      setTimeout(() => setUploadSuccess(null), 5000);
    }

    fetchFiles();
  }, [agentId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
    },
  });

  const handleIngest = async (force = false) => {
    setIngesting(true);
    setUploadError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setUploadError(`Ingestion failed: ${data.error || res.statusText}`);
      } else if (data.results) {
        const failures = data.results.filter((r: Record<string, unknown>) => r.status === "failed");
        const successes = data.results.filter((r: Record<string, unknown>) => r.status === "completed");
        if (failures.length > 0) {
          const errorDetails = failures.map((f: Record<string, unknown>) => 
            `File ${(f.fileId as string).slice(0, 8)}...: ${f.error}`
          ).join("\n");
          setUploadError(`Ingestion failed for ${failures.length} file(s):\n${errorDetails}`);
        }
        if (successes.length > 0) {
          setUploadSuccess(`Successfully ingested ${successes.length} file(s)`);
          setTimeout(() => setUploadSuccess(null), 5000);
        }
      } else if (data.message) {
        setUploadSuccess(data.message);
        setTimeout(() => setUploadSuccess(null), 5000);
      }

      // Poll for status
      setTimeout(fetchFiles, 2000);
      setTimeout(fetchFiles, 5000);
      setTimeout(fetchFiles, 10000);
    } catch (e) {
      console.error(e);
      setUploadError("Ingestion request failed");
    } finally {
      setTimeout(() => setIngesting(false), 3000);
    }
  };

  const handleCrawl = async () => {
    if (!crawlUrl.trim()) return;

    setCrawling(true);
    setCrawlStatus("Crawling website pages...");
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl.trim(), maxPages: crawlMaxPages }),
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Crawl failed");
        setCrawlStatus(null);
      } else {
        setUploadSuccess(
          `${data.message} (${data.pagesIngested} pages, ${data.pagesFailed} failed)`
        );
        setCrawlStatus(null);
        setCrawlUrl("");
        setTimeout(() => setUploadSuccess(null), 8000);
        fetchFiles();
      }
    } catch (e) {
      console.error(e);
      setUploadError("Website crawl request failed");
      setCrawlStatus(null);
    } finally {
      setCrawling(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Delete this file and its chunks?")) return;
    await fetch(`/api/agents/${agentId}/knowledge/${fileId}`, { method: "DELETE" });
    fetchFiles();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle size={16} className="text-green-400" />;
      case "failed": return <XCircle size={16} className="text-red-400" />;
      case "processing": return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      default: return <Clock size={16} className="text-amber-400" />;
    }
  };

  const pendingFiles = files.filter((f) => f.ingestion_status === "pending");
  const websiteFiles = files.filter((f) => f.source_type === "website");
  const uploadedFiles = files.filter((f) => f.source_type !== "website");

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {uploadError && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertTriangle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium mb-1">Error</p>
            <pre className="text-red-300/80 text-xs whitespace-pre-wrap">{uploadError}</pre>
          </div>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Success Banner */}
      {uploadSuccess && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <CheckCircle size={18} className="text-green-400" />
          <p className="text-green-400 text-sm font-medium">{uploadSuccess}</p>
        </div>
      )}

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-primary-500 bg-primary-500/5"
            : "border-surface-700 hover:border-surface-600 bg-surface-900/30"
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={40} className={`mx-auto mb-4 ${isDragActive ? "text-primary-400" : "text-surface-500"}`} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="text-primary-400 animate-spin" />
            <p className="text-primary-400 font-medium">Uploading files...</p>
          </div>
        ) : isDragActive ? (
          <p className="text-primary-400 font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="text-white font-medium mb-1">Drop files here or click to upload</p>
            <p className="text-surface-500 text-sm">Supports PDF, TXT, MD, PNG, JPG, WebP, MP3, WAV</p>
          </>
        )}
      </div>

      {/* Website Crawl Section */}
      <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Globe size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Crawl Website</h2>
            <p className="text-xs text-surface-500">Enter a URL to automatically crawl and extract content from all pages</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="url"
              value={crawlUrl}
              onChange={(e) => setCrawlUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={crawling}
              className="w-full pl-10 pr-4 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all text-sm placeholder:text-surface-600 disabled:opacity-50"
              onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
            />
          </div>
          <div className="w-28">
            <select
              value={crawlMaxPages}
              onChange={(e) => setCrawlMaxPages(Number(e.target.value))}
              disabled={crawling}
              className="w-full px-3 py-3 bg-surface-800/50 border border-surface-700 rounded-xl text-white outline-none focus:border-primary-500 transition-all text-sm disabled:opacity-50"
            >
              <option value={10}>10 pages</option>
              <option value={25}>25 pages</option>
              <option value={50}>50 pages</option>
              <option value={100}>100 pages</option>
            </select>
          </div>
          <button
            onClick={handleCrawl}
            disabled={crawling || !crawlUrl.trim()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20 text-sm"
          >
            {crawling ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Crawling...
              </>
            ) : (
              <>
                <Globe size={16} />
                Crawl
              </>
            )}
          </button>
        </div>

        {/* Crawl Status */}
        {crawlStatus && (
          <div className="mt-3 flex items-center gap-2 text-sm text-cyan-400">
            <Loader2 size={14} className="animate-spin" />
            <span>{crawlStatus}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center justify-between bg-surface-900/50 border border-surface-800 rounded-xl p-4">
          <div>
            {pendingFiles.length > 0 ? (
              <p className="text-amber-400 text-sm font-medium">
                {pendingFiles.length} file(s) pending ingestion
              </p>
            ) : (
              <p className="text-surface-400 text-sm">
                {files.length} source(s) in knowledge base
                {websiteFiles.length > 0 && ` · ${websiteFiles.length} from websites`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {pendingFiles.length > 0 && (
              <button
                onClick={() => handleIngest(false)}
                disabled={ingesting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw size={16} className={ingesting ? "animate-spin" : ""} />
                {ingesting ? "Processing..." : "Ingest Pending"}
              </button>
            )}
            <button
              onClick={() => handleIngest(true)}
              disabled={ingesting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-400 rounded-lg hover:bg-primary-500/20 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw size={16} className={ingesting ? "animate-spin" : ""} />
              {ingesting ? "Processing..." : "Re-ingest All"}
            </button>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="bg-surface-900/50 backdrop-blur-sm border border-surface-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h2 className="text-lg font-semibold text-white">Knowledge Sources</h2>
          <button
            onClick={fetchFiles}
            className="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        {files.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="text-surface-700 mx-auto mb-4" />
            <p className="text-surface-400">No knowledge sources yet</p>
            <p className="text-surface-600 text-sm mt-1">Upload files or crawl a website to add to this agent&apos;s knowledge base</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-800">
            {files.map((file) => {
              const isWebsite = file.source_type === "website";
              return (
                <div key={file.id as string} className="flex items-center justify-between p-4 hover:bg-surface-800/30 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isWebsite
                        ? "bg-gradient-to-br from-cyan-500/20 to-blue-600/20"
                        : "bg-surface-800"
                    }`}>
                      {isWebsite ? (
                        <Globe size={18} className="text-cyan-400" />
                      ) : (
                        <FileText size={18} className="text-surface-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm truncate">{file.file_name as string}</p>
                      <p className="text-xs text-surface-500 truncate">
                        {isWebsite ? (
                          <span className="text-cyan-500/70">{file.source_url as string}</span>
                        ) : (
                          <>{formatBytes(file.file_size as number)}</>
                        )}
                        {" · "}{file.chunk_count as number} chunks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {statusIcon(file.ingestion_status as string)}
                      <span className="text-xs text-surface-400 capitalize">{file.ingestion_status as string}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(file.id as string)}
                      className="p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
