import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// Example: Replace these with your actual paths or get them from config/env
const watchedPathsInbound = [
  "\\\\sttxcleoharmd02\\payload\\PERN",
  "/mnt/edifilesv2/inboundSNF",
  "/mnt/edifilesv2/JSONS",
  "\\\\sttxcleoharmd02\\payload\\Invex\\JSON\\Inbound"
];

const watchedPathsOutbound = [
  "\\\\sttxcleoharmd02\\payload\\Invex_Outbound\\Outbound",
  "/mnt/edifilesv2/outboundJSON",
  "/mnt/edifilesv2/SNFS",
  "\\\\sttxcleoharmd02\\payload\\X12_outbound"
];

const POLL_INTERVAL_MS = 5000; // poll every 5 seconds

// Backend endpoint should accept a path and return an array of file names (not folders)
async function fetchFiles(path) {
  const res = await fetch(
    `${process.env.REACT_APP_HOST}/api/listFiles?path=${encodeURIComponent(path)}`
  );
  if (!res.ok) return [];
  return await res.json(); // should be an array of file names
}

const EDIPathWatcher = () => {
  const location = useLocation();
      const searchParams = new URLSearchParams(location.search);
  const [filesByPath, setFilesByPath] = useState([[], [], [], []]);
  const [filesByPathOut, setFilesByPathOut] = useState([[], [], [], []]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let isMounted = true;
    let poller1;
    let poller2;

    const fetchAll = async () => {
      setLoading(true);
      const results = await Promise.all(watchedPathsInbound.map(fetchFiles));
      if (isMounted) {
        setFilesByPath(results);
      }
    };

    const fetchAll2 = async () => {
      setLoading(true);
      const results = await Promise.all(watchedPathsOutbound.map(fetchFiles));
      if (isMounted) {
        setFilesByPathOut(results);
        setLoading(false);
      }
    };

    const fetchBoth = async () => {
      setLoading(true);
      const [inboundResults, outboundResults] = await Promise.all([
        Promise.all(watchedPathsInbound.map(fetchFiles)),
        Promise.all(watchedPathsOutbound.map(fetchFiles))
      ]);
      if (isMounted) {
        setFilesByPath(inboundResults);
        setFilesByPathOut(outboundResults);
        setLoading(false);
      }
    };

    // Initial fetch for both
    fetchBoth();

    // Set up polling for both paths
    poller1 = setInterval(fetchBoth, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(poller1);
    };
  }, []);

  return (
    <div>
      <h1 style={{ textAlign: "center", margin: "20px" }}>EDI File Path Tracker</h1>
      <h2 style={{ textAlign: "left", marginBottom: "16px", marginLeft: "24px" }}>Inbound</h2>
      <div style={{ display: "flex", gap: "24px", padding: "24px" }}>
        {watchedPathsInbound.map((path, idx) => (
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
      <h2 style={{ textAlign: "left", marginBottom: "16px", marginLeft: "24px" }}>Outbound</h2>
      <div style={{ display: "flex", gap: "24px", padding: "24px" }}>
        {watchedPathsOutbound.map((path, idx) => (
          <div key={path} style={{ flex: 1, border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>{path}</h3>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <ul>
                {filesByPathOut[idx].length === 0 ? (
                  <li style={{ color: "#888" }}>No files found</li>
                ) : (
                  filesByPathOut[idx].map(file => (
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