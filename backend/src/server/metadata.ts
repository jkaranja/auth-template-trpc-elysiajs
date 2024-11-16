Metadata
Procedure metadata allows you to add an optional procedure specific meta property which will be available in all middleware function parameters.

tip
Use metadata together with trpc-openapi if you want to expose REST-compatible endpoints for your application.

example:
import { initTRPC } from '@trpc/server';
// [...]
interface Meta {
  authRequired: boolean;
}
export const t = initTRPC.context<Context>().meta<Meta>().create();
export const authedProcedure = t.procedure.use(async (opts) => {
  const { meta, next, ctx } = opts;
  // only check authorization if enabled
  if (meta?.authRequired && !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next();
});
export const appRouter = t.router({
  hello: authedProcedure.meta({ authRequired: false }).query(() => {
    return {
      greeting: 'hello world',
    };
  }),
  protectedHello: authedProcedure.meta({ authRequired: true }).query(() => {
    return {
      greeting: 'hello-world',
    };
  }),
});