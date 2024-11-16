Authorization
The createContext function is called for each incoming request, so here you can add contextual information about the calling user from the request object.

->also See middleware authorization section

2. ways:
Option 1: Authorize using resolver
import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from '../context';
export const t = initTRPC.context<Context>().create();
const appRouter = t.router({
  // open for anyone
  hello: t.procedure
    .input(z.string().nullish())
    .query((opts) => `hello ${opts.input ?? opts.ctx.user?.name ?? 'world'}`),
  // checked in resolver
  secret: t.procedure.query((opts) => {
    if (!opts.ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return {
      secret: 'sauce',
    };
  }),
});

Option 2: Authorize using middleware
import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from '../context';
export const t = initTRPC.context<Context>().create();
// you can reuse this for any procedure
export const protectedProcedure = t.procedure.use(
  async function isAuthed(opts) {
    const { ctx } = opts;
    // `ctx.user` is nullable
    if (!ctx.user) {
      //     ^?
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return opts.next({
      ctx: {
        // ✅ user value is known to be non-null now
        user: ctx.user,
        // ^?
      },
    });
  },
);
t.router({
  // this is accessible for everyone
  hello: t.procedure
    .input(z.string().nullish())
    .query((opts) => `hello ${opts.input ?? opts.ctx.user?.name ?? 'world'}`),
  admin: t.router({
    // this is accessible only to admins
    secret: protectedProcedure.query((opts) => {
      return {
        secret: 'sauce',
      };
    }),
  }),
});