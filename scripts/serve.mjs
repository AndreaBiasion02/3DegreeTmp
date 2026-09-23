import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { serveCoasterApi } from "../server/node-api.mjs";
const root = path.resolve("out");
const types = {
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".glb": "model/gltf-binary",
  ".mp4": "video/mp4",
};
http
  .createServer(async (req, res) => {
    try {
      if (await serveCoasterApi(req, res)) return;
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
      }
      const url = new URL(req.url, "http://localhost");
      const file = path.resolve(root, "." + decodeURIComponent(url.pathname));
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let target = file;
      let stat;
      try {
        stat = await fs.stat(target);
        if (stat.isDirectory()) {
          target = path.join(target, "index.html");
          stat = await fs.stat(target);
        }
      } catch {}
      if (!stat || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(await fs.readFile(path.join(root, "404.html")));
        return;
      }
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
        "Content-Length": stat.size,
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : await fs.readFile(target));
    } catch {
      res.writeHead(500);
      res.end("Unable to serve page");
    }
  })
  .listen(8001, "127.0.0.1", () => console.log("Local: http://localhost:8001"));
