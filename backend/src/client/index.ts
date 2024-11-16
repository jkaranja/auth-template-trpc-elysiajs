import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
 
import type { AppRouter } from "../server/router";
 

//Using your new backend on the client

// You can create client on the frontend too

// Let's now move to the client-side code and embrace the power of end-to-end typesafety.
//  When we import the AppRouter type for the client to use, we have achieved full typesafety for our system without leaking any implementation details to the client.

// Links in tRPC are similar to links in GraphQL, they let us control the data flow before being sent to the server.
//  In the example below, we use the httpBatchLink, which automatically batches up multiple calls into a single HTTP request.

//     👆 **type-only** import
// Pass AppRouter as generic here. 👇 This lets the `trpc` object know
// what procedures are available on the server and their input/output types.
const trpc = createTRPCClient<AppRouter>({

// Links enable you to customize the flow of data between the tRPC Client and Server. A link should do only one thing, which can be either a self-contained modification to a tRPC operation (query, mutation, or subscription) or a side-effect based on the operation (such as logging).

//You can compose links together into an array that you can provide to the tRPC client configuration via the links property, which represents a link chain. This means that the tRPC client will execute the links in the order they are added to the links array when doing a request and will execute them again in reverse when it's handling a response. Here's a visual representation of the link chain:
  links: [

    /**
     * The function passed to enabled is an example in case you want to the link to
     * log to your console in development and only log errors in production
     */

   // loggerLink is a link that lets you implement a logger for your tRPC client. It allows you to see more clearly what operations are queries, mutations, or subscriptions, their requests, and responses. The link, by default, prints a prettified log to the browser's console. However, you can customize the logging behavior and the way it prints to the console with your own implementations.
    loggerLink({
      enabled: (opts) =>
        (process.env.NODE_ENV === 'development' &&
          typeof window !== 'undefined') ||
        (opts.direction === 'down' && opts.result instanceof Error),
        //logger?: LogFn<TRouter>;
        //https://trpc.io/docs/client/links/loggerLink
    }),


    //retryLink is a link that allows you to retry failed operations in your tRPC client. It provides a customizable way to handle transient errors, such as network failures or server errors, by automatically retrying the failed requests based on specified conditions.
     retryLink({
      retry(opts) {
        if (
          opts.error.data &&
          opts.error.data.code !== 'INTERNAL_SERVER_ERROR'
        ) {
          // Don't retry on non-500s
          return false;
        }
        if (opts.op.type !== 'query') {
          // Only retry queries
          return false;
        }
        // Retry up to 3 times
        return opts.attempts <= 3;
      },
    }),
    //httpBatchLink is a terminating link that batches an array of individual tRPC operations into a single HTTP request that's sent to a single tRPC procedure.
    // alt: httpLink is a terminating link that sends a tRPC operation to a tRPC procedure over HTTP.
    httpBatchLink({
      url: "http://localhost:3000",

      //// 👇 disable batching
  //allowBatching: false,

      // You can pass any HTTP headers you wish here

//# Custom header
// The headers option can be customized in the config when using the httpBatchLink or the httpLink.

// headers can be both an object or a function. If it's a function it will get called dynamically for every HTTP request.
       async headers() {
        return {
          //authorization: getAuthCookie(),
        };
      },

     //# Send cookies cross-origin
     //If your API resides on a different origin than your front-end and you wish to send cookies to it, you will need to enable CORS on your server and send cookies with your requests by providing the option {credentials: "include"} to fetch.
    //You also need to enable CORS on your server by modifying your adapter, or the HTTP server which fronts your API. The best way to do this varies adapter-by-adapter 
     fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
      // options: https://trpc.io/docs/client/links/httpBatchLink
    }),
  ],
});




// Full autocompletion
// You can open up your Intellisense to explore your API on your frontend.
//  You'll find all of your procedure routes waiting for you along with the methods for calling them.

 // trpcClient.  -> click CTRL + space for autocompletion
// Querying & mutating in the frontend

#Querying & mutating
You now have access to your API procedures on the trpc object. 

const getUser = async ()=> await trpc.userById.query('1');

if using next.js, you can define getUser in "use server" and call it in a server component

// Inferred types
const user = await trpc.userById.query('1');

Aborting Procedure Calls
tRPC adheres to the industry standard when it comes to aborting procedures. All you have to do is pass an AbortSignal to the query or mutation options, and call the AbortController instance's abort method if you need to cancel the request.
// 1. Create an AbortController instance - this is a standard javascript API
//#usage: 

//const ac = new AbortController();
// 2. Pass the signal to a query or mutation
//const query = proxy.userById.query("id_bilbo", { signal: ac.signal });
 