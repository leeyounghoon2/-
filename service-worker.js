// service-worker.js
const CACHE_NAME = 'quotation-app-v2'; // 캐시 버전 (변경될 때마다 업데이트)
const urlsToCache = [
  '/', // 루트 경로
  '/index.html',
  '/style.css',
  '/script.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', // CDN 라이브러리도 캐시
  // PWA 아이콘 파일 경로도 캐시에 추가 (아래 3번에서 생성할 경로)
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png'
];

// 1. Install (설치): 서비스 워커가 설치될 때 정적 자원들을 캐시에 저장
self.addEventListener('install', event => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // 새 서비스 워커가 즉시 활성화되도록 함
  );
});

// 2. Activate (활성화): 이전 버전의 캐시를 정리하고 새 서비스 워커를 활성화
self.addEventListener('activate', event => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 서비스 워커가 현재 페이지를 제어하도록 함
  );
});

// 3. Fetch (가져오기): 네트워크 요청을 가로채서 캐시 또는 네트워크에서 응답
self.addEventListener('fetch', event => {
  // 동일 출처 (same-origin) 요청만 캐싱 전략 적용
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // 캐시에 응답이 있으면 캐시된 응답 반환
          if (response) {
            return response;
          }
          // 캐시에 없으면 네트워크 요청
          return fetch(event.request)
            .then(networkResponse => {
              // 네트워크 응답을 캐시에 저장하고 반환
              if (networkResponse && networkResponse.status === 200) {
                // 스트림 복제를 통해 응답을 두 번 사용 가능 (브라우저와 캐시)
                const clonedResponse = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, clonedResponse);
                });
              }
              return networkResponse;
            })
            .catch(error => {
              console.error('Fetch failed:', error);
              // 오프라인 시 대체 페이지 등을 반환할 수 있음
              // return caches.match('/offline.html'); // 오프라인 페이지가 있다면
            });
        })
    );
  } else {
    // Cross-origin 요청 (CDN 등)은 기본 fetch 사용
    event.respondWith(fetch(event.request));
  }

});
