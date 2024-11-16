import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  //log: ["query", "info", "warn", "error"],
});

//Prisma supports two types of logging:
// Logging to stdout (default) //above in prisma client instance
// Event-based logging (use $on()  method to subscribe to events) //below
// prisma.$on("query", (e) => {
//   console.log("Query: " + e.query);
//   console.log("Params: " + e.params);
//   console.log("Duration: " + e.duration + "ms");
// });
//https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/logging

export { prisma };
