# Shared Real-Time State — Design

`SseEventPublisher` writes typed event payloads to `SseConnectionManager`; `StreamController` exposes them. `useScheduleStream` parses event names and updates `weekStore`, `plannerStore`, today, discovery, capture/library, GOTO and search-promotion stores. `weekStore` owns matching-week and move-echo guards; other handlers have their own narrower checks. `useScheduleStream.test.ts`, store tests, controller/publisher tests and OpenAPI stream schemas are evidence. Feature packets define persistence, authorization, and recovery semantics.
