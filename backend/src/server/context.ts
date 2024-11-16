/** 

Context
Your context holds data that all of your tRPC procedures will have access to, and is a great place to put things like database connections or authentication information.

Setting up the context is done in 2 steps, defining the type during initialization and then creating the runtime context for each request.

#1. Defining the context type

When initializing tRPC using initTRPC, you should pipe .context<TContext>() to the initTRPC builder function before calling .create(). The type TContext can either be inferred from a function's return type or be explicitly defined.

This will make sure your context is properly typed in your procedures and middlewares.

import { initTRPC } from '@trpc/server';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { getSession } from 'next-auth/react';
 
export const createContext = async (opts: CreateNextContextOptions) => {
  const session = await getSession({ req: opts.req });
 
  return {
    session,
  };
};
 
const t1 = initTRPC.context<typeof createContext>().create();
t1.procedure.use(({ ctx }) => { ... });
                    
(parameter) ctx: {
    session: Session | null;
}
 
type Context = Awaited<ReturnType<typeof createContext>>;
const t2 = initTRPC.context<Context>().create();
t2.procedure.use(({ ctx }) => { ... });
                    
(parameter) ctx: {
    session: Session | null;
}

#2. Creating the context
The createContext() function must be passed to the handler that is mounting your appRouter, which may be via HTTP, a server-side call or our server-side helpers.

createContext() is called for each invocation of tRPC, so batched requests will share a context.


The createContext() function must be passed to the handler that is mounting your appRouter, which may be via HTTP, a server-side call or our server-side helpers.

createContext() is called for each invocation of tRPC, so batched requests will share a context.

// 1. HTTP request
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { createContext } from './context';
import { appRouter } from './router';
const handler = createHTTPHandler({
  router: appRouter,
  createContext,
});
// 2. Server-side call
import { createContext } from './context';
import { createCaller } from './router';
const caller = createCaller(await createContext());
// 3. servers-side helpers
import { createServerSideHelpers } from '@trpc/react-query/server';
import { createContext } from './context';
import { appRouter } from './router';
const helpers = createServerSideHelpers({
  router: appRouter,
  ctx: await createContext(),
});

//######Inner and outer context

In some scenarios it could make sense to split up your context into "inner" and "outer" functions.

Inner context is where you define context which doesn’t depend on the request, e.g. your database connection. You can use this function for integration testing or server-side helpers, where you don’t have a request object. Whatever is defined here will always be available in your procedures.

Outer context is where you define context which depends on the request, e.g. for the user's session. Whatever is defined here is only available for procedures that are called via HTTP.


*/