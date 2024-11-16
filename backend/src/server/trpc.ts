import { initTRPC } from "@trpc/server";


/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.create();
/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;

export const publicProcedure = t.procedure;

/** 
// As a general pattern we recommend you rename and export t.procedure as publicProcedure, which then makes room for you to create other named procedures for specific use cases and export those too.
// This pattern is called "base procedures" and is a key pattern for code and behaviour re-use in tRPC; every application is likely to need it.
// you can  create different base procedures with different middleware functions
// eg. create one that has auth middleware for authenticated endpoint and another for public


// In the below code, we're using reusable base procedures to build common use-cases for our app - we're making a reusable base procedures for logged in users (authedProcedure) & another base procedure that takes an organizationId and validates that a user is part of that organization.
// procedure that asserts that the user is logged in
export const authedProcedure = t.procedure.use(async function isAuthed(opts) {
  const { ctx } = opts;
  // `ctx.user` is nullable
  if (!ctx.user) {
            
(property) user: User | null
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
 
  return opts.next({
    ctx: {
      // ✅ user value is known to be non-null now
      user: ctx.user,
    },
  });
});
 
// procedure that a user is a member of a specific organization
export const organizationProcedure = authedProcedure
  .input(z.object({ organizationId: z.string() }))
  .use(function isMemberOfOrganization(opts) {
    const membership = opts.ctx.user.memberships.find(
      (m) => m.Organization.id === opts.input.organizationId,
    );
    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
      });
    }
    return opts.next({
      ctx: {
        Organization: membership.Organization,
      },
    });
  });
  

  // then usage:
  export const appRouter = t.router({
  whoami: authedProcedure.mutation(async (opts) => {
    // user is non-nullable here
    const { ctx } = opts;
            
const ctx: {
    user: User;
}
    return ctx.user;
  }),
  addMember: organizationProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation((opts) => {
      // ctx contains the non-nullable user & the organization being queried
      const { ctx } = opts;
              
const ctx: {
    user: User;
    Organization: Organization;
}
 
      // input includes the validate email of the user being invited & the validated organizationId
      const { input } = opts;
               
const input: {
    organizationId: string;
    email: string;
}
 
      return '...';
    }),
});

*/