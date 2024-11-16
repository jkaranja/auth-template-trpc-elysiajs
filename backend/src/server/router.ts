import type { User } from "@prisma/client";

import { publicProcedure, router } from "./trpc";
import { prisma } from "../db";
import { z } from "zod";

// can have project be a TypeScript monorepos or stand alone
// either way, you will need to import client/types/server you need to be able to access

// tRPC (TypeScript Remote Procedure Call) is
// one implementation of RPC, designed for TypeScript monorepos.
//  It has its own flavor, but is RPC at its heart.

// RPC is short for "Remote Procedure Call".
// It is a way of calling functions on one computer (the server) from another computer (the client).
//With traditional HTTP/REST APIs, you call a URL and get a response.
//With RPC, you call a function and get a response.

//tRPC combines concepts from REST and GraphQL.

// If you inspect the network traffic of a tRPC app, you'll see that it's fairly standard HTTP requests and responses, but you don't need to think about the implementation details while writing your application code.
// You call functions, and tRPC takes care of everything else.
//  You should ignore details like HTTP Verbs, since they carry meaning in REST APIs,
//  but in RPC form part of your function names instead, for instance: getUser(id) instead of GET /users/:id.

// Procedure ↗	API endpoint (a function which is exposed to the client) - can be a query, mutation, or subscription.
// Query	A procedure that gets some data.
// Mutation	A procedure that creates, updates, or deletes some data.
// Subscription ↗	A procedure that creates a persistent connection and listens to changes.
// Router ↗	A collection of procedures (and/or other routers) under a shared namespace.
// Context ↗	Stuff that every procedure can access. Commonly used for things like session state and database connections.
// Middleware ↗	A function that can run code before and after a procedure. Can modify context.
// Validation ↗	"Does this input data contain the right stuff?"

export const appRouter = router({
  //1.  query procedure ->
  userList: publicProcedure.query(async (opts) => {
    //can also be called a resolver or procedure
    // opts is an object:
    //signal -> The AbortSignal of the request
    //ctx -> context-> available in all procedures
    //input -> data received. could be anything of type .input(type)
    const { input, signal, ctx } = opts;
    // input is the name

    // Retrieve users from a datasource, this is an imaginary database
    const users = await prisma.user.findMany();

    return users;
  }),
  // validation:
  // tRPC procedures may define validation logic for their input and/or output, and validators are also used to infer the types of inputs and outputs.

  //#1. Input Validators
  // Using input parser to validate procedure inputs
  // To implement the userById procedure, we need to accept input from the client.
  //tRPC lets you define input parsers to validate and parse the input.
  //You can define your own input parser or use a validation library of your choice,
  // like zod, yup, or superstruct.

  //validators are also used to infer the types of inputs and outputs

  // You define your input parser on publicProcedure.input(), which can then be accessed on the resolver function as shown below:

  //By defining an input validator, tRPC can check that a procedure call is correct and return a validation error if not.
  userById: publicProcedure.input(z.string()).query(async (opts) => {
    const { input } = opts;
    // const user = await prisma.user.findById(input);
    // return user;
  }),

  //#2. Output Validators
  //   Validating outputs is not always as important as defining inputs, since tRPC gives you automatic type-safety by inferring the return type of your procedures. Some reasons to define an output validator include:

  // Checking that data returned from untrusted sources is correct
  // Ensure that you are not returning more data to the client than necessary
  // If output validation fails, the server will respond with an INTERNAL_SERVER_ERROR.
  userById2: publicProcedure
    .output(
      z.object({
        greeting: z.string(),
      })
    )
    .query(async () => {
      //const { input } = opts;
      // const user = await prisma.user.findById(input);
      return {} as any; // must match output type
    }),

  //a validator can be a custom function: eg input(()=> {throw new Error(')})

  //2. mutation procedure-> create, update,delete
  //  Similar to GraphQL, tRPC makes a distinction between query and mutation
  //    procedures.
  // The way a procedure works on the server doesn't change much between a query and a mutation.
  // The method name is different, and the way that the client will use this procedure changes - but everything else is the same!

  userCreate: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async (opts) => {
      const { input } = opts;

      // Create a new user in the database
      // const user = await prisma.user.create(input);

      // return user;
    }),

  //3. subscription procedure->WebSockets

  //Writing all API-code in your code in the same file is not a great idea.
  // It's easy to merge routers with other routers. -> see procedures/user

  //##Defining an inline sub-router
  //When you define an inline sub-router, you can represent your router as a plain object.

  //In the below example, nested1 and nested2 are equal:
  // Shorthand plain object for creating a sub-router
  nested1: {
    proc: publicProcedure.query(() => "..."),
  },
  // Equivalent of(see user.ts for merge routers with other routers concept):
  nested2: router({
    proc: publicProcedure.query(() => "..."),
  }),

  //# don't have to inline procedures
  //can do 
  // user:{
  //   get: getUser -> see procedures/user.ts
  // }
});

// export type definition of API -> // for typing client end points
export type AppRouter = typeof appRouter;
