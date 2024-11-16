import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { z } from "zod";

import { publicProcedure, router } from "./trpc";
import { prisma } from "../db";

// complete boilerplate for tRPC

const appRouter = router({
  userList: publicProcedure.query(async () => {
    const users = await prisma.user.findMany();
    return users;
  }),
  userById: publicProcedure.input(z.string()).query(async (opts) => {
    const { input } = opts;
    const user = await prisma.user.findById(input);
    return user;
  }),
  userCreate: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async (opts) => {
      const { input } = opts;
      const user = await prisma.user.create(input);
      return user;
    }),
});

export type AppRouter = typeof appRouter;

const server = createHTTPServer({
  router: appRouter,
});

server.listen(3000);
