/* Service worker собранного сайта (4.3). Создаётся scripts/prepare-release.cjs:
   список файлов и имя кэша подставляются при сборке, в исходниках он не
   работает. Страница — сначала из сети (свежая версия), при отсутствии сети —
   из кэша; файлы с хешем в имени и картинки — из кэша. Наружу ничего не
   отправляется: работник только хранит копию сайта в браузере. */
"use strict";
var CACHE = "__CACHE__";
var FILES = __FILES__;
self.addEventListener("install", function(e){
  /* cache:"reload" — мимо HTTP-кэша: иначе в первые минуты после выкладки
     в новый кэш мог попасть прежний index.html со ссылками на старые файлы */
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(FILES.map(function(u){ return new Request(u, { cache:"reload" }); }));
  }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k.indexOf("pc-") === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("message", function(e){ if(e.data === "skip-waiting") self.skipWaiting(); });
self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if(req.mode === "navigate"){
    /* в кэш как главная страница попадает только удачный ответ на сам сайт,
       а не 404 на чужой адрес и не ошибка сервера */
    var home = new URL(req.url).pathname === new URL("./", self.registration.scope).pathname;
    e.respondWith(fetch(req).then(function(res){
      if(res.ok && home){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put("./", copy); }); }
      return res;
    }).catch(function(){ return caches.match("./"); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch:true }).then(function(hit){ return hit || fetch(req); }));
});
