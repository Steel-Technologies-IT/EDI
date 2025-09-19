import React, { useEffect, useState } from "react";

// Example: Replace these with your actual paths or get them from config/env
const watchedPathsInbound = [
  "\\\\sttxcleoharmd02\\payload\\PERN",
  "\\\\az-cld-ivap-q1\\inboundSNF",
  "\\\\az-cld-ivap-q1\\JSONS",
  "\\\\sttxcleoharmd02\\payload\\Invex\\JSON\\Inbound"
];

const watchedPathsOutbound = [
  "\\\\sttxcleoharmd02\\payload\\Invex_test\\Outbound",
  "\\\\az-cld-ivap-q1\\outboundJSON",
  "\\\\az-cld-ivap-q1\\SNFS",
  "\\\\sttxcleoharmd02\\payload\\X12_outbound"
];

const POLL_INTERVAL_MS = 5000; // poll every 5 seconds

// Backend endpoint should accept a path and return an array of file names (not folders)
async function fetchFiles(path) {
  const res = await fetch(
    `https://${process.env.REACT_APP_HOST}:5000/api/listFiles?path=${encodeURIComponent(path)}`
  );
  if (!res.ok) return [];
  return await res.json(); // should be an array of file names
}

const EDIPathWatcher = () => {
  const location = useLocation();
      const searchParams = new URLSearchParams(location.search);
      const mode = searchParams.get('mode') || 'I';
  const [filesByPath, setFilesByPath] = useState([[], [], [], []]);
  const [loading, setLoading] = useState(false);
const watchedPaths = mode === 'I' ? watchedPathsInbound : watchedPathsOutbound;
  useEffect(() => {
    let isMounted = true;
    let poller;

    const fetchAll = async () => {
      setLoading(true);
      const results = await Promise.all(watchedPaths.map(fetchFiles));
      if (isMounted) {
        setFilesByPath(results);
        setLoading(false);
      }
    };

    fetchAll(); // initial fetch

    poller = setInterval(fetchAll, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(poller);
    };
  }, []);

  return (
    <div>
      <h1 style={{ textAlign: "center", marginBottom: "32px" }}>{mode === 'I' ? 'EDI File Path Tracker Inbound' : 'EDI File Path Tracker Outbound'}</h1>
      <div style={{ display: "flex", gap: "24px", padding: "24px" }}>
        {watchedPaths.map((path, idx) => (
          <div key={path} style={{ flex: 1, border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>{path}</h3>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <ul>
                {filesByPath[idx].length === 0 ? (
                  <li style={{ color: "#888" }}>No files found</li>
                ) : (
                  filesByPath[idx].map(file => (
                    <li key={file}>{file}</li>
                  ))
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EDIPathWatcher;