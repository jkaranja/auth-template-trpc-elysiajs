Server Side Calls
You may need to call your procedure(s) directly from the same server they're hosted in, createCallerFactory() can be used to achieve this. This is useful for server-side calls and for integration testing of your tRPC procedures.

info
createCaller should not be used to call procedures from within other procedures. This creates overhead by (potentially) creating context again, executing all middlewares, and validating the input - all of which were already done by the current procedure. Instead, you should extract the shared logic into a separate function and call that from within the procedures, like so:

// https://trpc.io/docs/server/server-side-calls