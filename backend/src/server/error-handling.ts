Error Handling
Whenever an error occurs in a procedure, tRPC responds to the client with an object that includes an "error" property. This property contains all the information that you need to handle the error in the client.

Note: the returned stack trace is only available in the development environment.

Here's an example error response caused by a bad request input:

{
  "id": null,
  "error": {
    "message": "\"password\" must be at least 4 characters",
    "code": -32600,
    "data": {
      "code": "BAD_REQUEST",
      "httpStatus": 400, //-> see error codes: https://trpc.io/docs/server/error-handling
      "stack": "...",
      "path": "user.changepassword"
    }
  }
} 



tRPC exposes a helper function, getHTTPStatusCodeFromError, to help you extract the HTTP code from the error:

// Example error you might get if your input validation fails
const error: TRPCError = {
  name: 'TRPCError',
  code: 'BAD_REQUEST',
  message: '"password" must be at least 4 characters',
};
 
if (error instanceof TRPCError) {
  const httpCode = getHTTPStatusCodeFromError(error);
  console.log(httpCode); // 400
}

# Throwing errors
tRPC provides an error subclass, TRPCError, which you can use to represent an error that occurred inside a procedure.

For example, throwing this error:

import { initTRPC, TRPCError } from '@trpc/server';
const t = initTRPC.create();
const appRouter = t.router({
  hello: t.procedure.query(() => {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred, please try again later.',
      // optional: pass the original error to retain stack trace
      cause: theError,
    });
  }),
});
Results to the following response:

{
  "id": null,
  "error": {
    "message": "An unexpected error occurred, please try again later.",
    "code": -32603,
    "data": {
      "code": "INTERNAL_SERVER_ERROR",
      "httpStatus": 500,
      "stack": "...",
      "path": "hello"
    }
  }
}

#Error Formatting
The error formatting in your router will be inferred all the way to your client (& React components)

import { initTRPC } from '@trpc/server';
export const t = initTRPC.context<Context>().create({
  errorFormatter(opts) {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});