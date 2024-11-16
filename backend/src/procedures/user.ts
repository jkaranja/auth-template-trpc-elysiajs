import { prisma } from "../db";
import { publicProcedure } from "../server/trpc";

//Writing all API-code in your code in the same file is not a great idea.
// It's easy to merge routers with other routers.  

// @filename: trpc.ts
import { initTRPC } from "@trpc/server";
const t = initTRPC.create();
export const router = t.router;
export const publicProcedure = t.procedure;
// @filename: routers/_app.ts
import { router } from "../trpc";
import { z } from "zod";
import { userRouter } from "./user";
import { postRouter } from "./post";
const appRouter = router({
  user: userRouter, // put procedures under "user" namespace
  post: postRouter, // put procedures under "post" namespace
});
// You can then access the merged route with
// http://localhost:3000/trpc/<NAMESPACE>.<PROCEDURE>
export type AppRouter = typeof appRouter;
// @filename: routers/post.ts
import { router, publicProcedure } from "../trpc";
import { z } from "zod";
export const postRouter = router({
  create: publicProcedure
    .input(
      z.object({
        title: z.string(),
      })
    )
    .mutation((opts) => {
      const { input } = opts;

      const input: {
        title: string;
      };
      // [...]
    }),
  list: publicProcedure.query(() => {
    // ...
    return [];
  }),
});
// @filename: routers/user.ts
import { router, publicProcedure } from "../trpc";
import { z } from "zod";
export const userRouter = router({
  list: publicProcedure.query(() => {
    // [..]
    return [];
  }),
});


const getUsers = () =>
  publicProcedure.query(async () => {
    // Retrieve users from a datasource, this is an imaginary database
    const users = await prisma.user.findMany();

    return users;
  });