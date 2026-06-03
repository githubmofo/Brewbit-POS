import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { createTRPCContext } from "@web/server/trpc";
import { appRouter } from "@web/server/routers/_app.router";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC request failed on path "${path ?? "<no-path>"}" with error: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
