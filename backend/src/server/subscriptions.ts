Subscriptions
Introduction
Subscriptions are a type of real-time event stream between the client and server. Use subscriptions when you need to push real-time updates to the client.

With tRPC's subscriptions, the client establishes and maintains a persistent connection to the server plus automatically attempts to reconnect and recover gracefully if disconnected with the help of tracked() events.

https://trpc.io/docs/server/subscriptions

WebSockets or Server-sent Events?
You can either use WebSockets or Server-sent Events (SSE) to setup real-time subscriptions in tRPC.

For WebSockets, see the WebSockets page
For SSE, see the httpSubscriptionLink
If you are unsure which one to use, we recommend using SSE for subscriptions as it's easier to setup and don't require setting up a WebSocket server.

https://trpc.io/docs/server/websockets