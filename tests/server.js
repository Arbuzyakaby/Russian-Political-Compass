/* Крошечный статический сервер для визуальных тестов.

   Открывать страницу по file:// нельзя: браузеры ограничивают
   localStorage и запросы к соседним файлам на этой схеме, а проект
   держит в localStorage и тему, и язык, и ответы теста — половина
   проверок просто не выполнилась бы.

   Готовый пакет ради этого не ставится: у проекта ноль зависимостей,
   и добавлять их ради тридцати строк на node:http значило бы менять
   свойство, которым проект и ценен. Отдаём файлы из корня, ничего
   не кэшируем, не поднимаемся выше корня по «..». */
"use strict";

const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const { gzipSync } = require("node:zlib");

const ROOT = path.resolve(process.env.PC_ROOT || path.join(__dirname, ".."));
const PORT = Number(process.env.PC_PORT) || 4173;

const TYPES = {
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".png":"image/png",
  ".webp":"image/webp",
  ".svg":"image/svg+xml",
  ".xml":"application/xml; charset=utf-8",
  ".txt":"text/plain; charset=utf-8"
};

const handler = (req, res) => {
  const url = new URL(req.url, "http://localhost");
  /* Адрес приходит от кого угодно, поэтому разбирается с оглядкой: битая
     процентная запись (%E0%A4%A) и нулевой байт — не опечатка, а попытка
     обмануть проверку пути ниже. Отвечаем 400 «плохой запрос» сразу,
     не пытаясь угадать, что имелось в виду. */
  let rel;
  try{ rel = decodeURIComponent(url.pathname); }catch(e){ res.writeHead(400).end("bad request"); return; }
  if(rel.includes("\0")){ res.writeHead(400).end("bad request"); return; }
  rel = rel.replace(/\\/g, "/");
  const file = path.join(ROOT, rel === "/" ? "index.html" : rel);

  /* выход за пределы корня — единственная опасность такого сервера,
     и закрывается она одной проверкой пути после нормализации */
  const relative = path.relative(ROOT, file);
  if(relative.startsWith("..") || path.isAbsolute(relative)){
    res.writeHead(403).end("forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if(err){
      res.writeHead(404, { "content-type":"text/plain; charset=utf-8" }).end("not found");
      return;
    }
    const compressed = /gzip/.test(req.headers["accept-encoding"] || "") && /\.(html|js|css|json|xml|txt)$/.test(file);
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
      "vary": "Accept-Encoding",
      ...(compressed ? { "content-encoding":"gzip" } : {})
    }).end(compressed ? gzipSync(data) : data);
  });
};
// Необязательный HTTPS: так локальные замеры сопоставимы с публичным сайтом, который открывается по https.
const server = process.env.PC_TLS_CERT && process.env.PC_TLS_KEY
  ? https.createServer({ cert:fs.readFileSync(process.env.PC_TLS_CERT), key:fs.readFileSync(process.env.PC_TLS_KEY) }, handler)
  : http.createServer(handler);

server.listen(PORT, "127.0.0.1", () => {
  console.log(`static server on http://localhost:${PORT}`);
});
