import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { appRouter } from "./server/router";

// Serving the API
// Now that we have defined our router, we can serve it. tRPC has many adapters so you can use any backend framework of your choice.
// To keep it simple, we'll use the standalone adapter.
// adapters -> https://trpc.io/docs/server/adapters

// Adapters
// tRPC is not a server on its own, and must therefore be served using other hosts,
// such as a simple Node.js HTTP Server, Express, or even Next.js.
// Most tRPC features are the same no matter which backend you choose. Adapters act as the glue between the host system and your tRPC API.

// Adapters typically follow some common conventions, allowing you to set up context creation via createContext, and globally handle errors via onError, but importantly allow you to choose an appropriate host for your application.

//#1.Standalone Adapter
//tRPC's Standalone Adapter is the simplest way to get a new project working. It's ideal for local development, and for server-based production environments. In essence it's just a wrapper around the standard Node.js HTTP Server with the normal options related to tRPC.
const server = createHTTPServer({
  //#//handling cors
  //By default the standalone server will not respond to HTTP OPTIONS requests, or set any CORS headers.
  //middleware: cors()// use cors package//throws open CORS to any request, which is useful for development, but you can and should configure it more strictly in a production environment
  //If you're not hosting in an environment which can handle this for you, like during local development, you may need to handle it.
  router: appRouter,

  // see context
  createContext() {
    console.log("context 3");
    return {};
  },
});

//#2.Express Adapter
//https://trpc.io/docs/server/adapters/express
// const app = express();
// app.use(
//   "/trpc",
//   trpcExpress.createExpressMiddleware({
//     router: appRouter,
//     createContext,
//   })
// );

console.log("TRPC Server is running at http://localhost:3000");

server.listen(3000);
