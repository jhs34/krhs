import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Initialize Firebase Admin
try {
  if (fs.existsSync("./firebase-admin-key.json")) {
    const serviceAccount = JSON.parse(fs.readFileSync("./firebase-admin-key.json", "utf8"));
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin initialized successfully.");
  } else {
    console.warn("firebase-admin-key.json not found. Firebase Admin not initialized.");
  }
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON request bodies
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Background Data Cleanup API Endpoint
  app.post("/api/admin/cleanup", async (req, res) => {
    try {
      console.log("Starting background data cleanup...");
      if (getApps().length === 0) {
        return res.status(500).json({ success: false, error: "Firebase Admin not initialized" });
      }

      const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
      const db = getFirestore(undefined, firebaseConfig.firestoreDatabaseId);
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const oneYearAgoStr = oneYearAgo.toISOString();

      let archivesDeleted = 0;

      // 1. Delete Archive (documents) older than 1 year, excluding highlights
      const archiveRef = db.collection("documents");
      const oldArchiveSnapshot = await archiveRef.where("createdAt", "<", oneYearAgoStr).get();
      
      if (!oldArchiveSnapshot.empty) {
        const batch = db.batch();
        let operations = 0;
        
        for (const doc of oldArchiveSnapshot.docs) {
          const data = doc.data();
          if (!data.isHighlight) {
            batch.delete(doc.ref);
            archivesDeleted++;
            operations++;
          }
          
          if (operations === 490) { 
            await batch.commit();
            operations = 0;
          }
        }
        
        if (operations > 0) {
          await batch.commit();
        }
      }

      res.json({ 
        success: true, 
        message: "Cleanup completed successfully",
        details: {
          archivesDeleted
        }
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Internal Server Error", stack: error instanceof Error ? error.stack : undefined });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
