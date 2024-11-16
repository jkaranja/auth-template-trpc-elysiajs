/**

Middlewares
You are able to add middleware(s) to a procedure with the t.procedure.use() method. The middleware(s) will wrap the invocation of the procedure and must pass through its return value.

$1. Authorization
In the example below, any call to a adminProcedure will ensure that the user is an "admin" before executing.

import { TRPCError, initTRPC } from '@trpc/server';
 
interface Context {
  user?: {
    id: string;
    isAdmin: boolean;
    // [..]
  };
}
 
const t = initTRPC.context<Context>().create();
export const publicProcedure = t.procedure;
export const router = t.router;
 
export const adminProcedure = publicProcedure.use(async (opts) => {
  const { ctx } = opts;
  if (!ctx.user?.isAdmin) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return opts.next({
    ctx: {
      user: ctx.user,
    },
  });
});

usage:

const adminRouter = router({
  secretPlace: adminProcedure.query(() => 'a key'),
});
 
export const appRouter = router({
  foo: publicProcedure.query(() => 'bar'),
  admin: adminRouter,
});

#2. Logging
In the example below timings for queries are logged automatically.

export const loggedProcedure = publicProcedure.use(async (opts) => {
  const start = Date.now();
 
  const result = await opts.next();
 
  const durationMs = Date.now() - start;
  const meta = { path: opts.path, type: opts.type, durationMs };
 
  result.ok
    ? console.log('OK request timing:', meta)
    : console.error('Non-OK request timing', meta);
 
  return result;
});

//router:
import { loggedProcedure, router } from './trpc';
 
export const appRouter = router({
  foo: loggedProcedure.query(() => 'bar'),
  abc: loggedProcedure.query(() => 'def'),
});


#3. Context Extension

Context Extension
"Context Extension" enables middlewares to dynamically add and override keys on a base procedure's context in a typesafe manner.

Below we have an example of a middleware that changes properties of a context, the changes are then available to all chained consumers, such as other middlewares and procedures:

type Context = {
  // user is nullable
  user?: {
    id: string;
  };
};
 
const protectedProcedure = publicProcedure.use(async function isAuthed(opts) {
  const { ctx } = opts;
  // `ctx.user` is nullable
  if (!ctx.user) {
            
(property) user: {
    id: string;
} | undefined
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
 
  return opts.next({
    ctx: {
      // ✅ user value is known to be non-null now
      user: ctx.user,
       
(property) user: {
    id: string;
}
    },
  });
});

#4.Extending middlewares
info
We have prefixed this as unstable_ as it's a new API, but you're safe to use it! Read more.

We have a powerful feature called .pipe() which allows you to extend middlewares in a typesafe manner.
https://trpc.io/docs/server/middlewares
 */