import { createTRPCRouter } from "../trpc";
import { floorRouter } from "./floor.router";
import { tableRouter } from "./table.router";
import { productRouter } from "./product.router";
import { sessionRouter } from "./session.router";
import { orderRouter } from "./order.router";
import { paymentRouter } from "./payment.router";
import { authRouter } from "./auth.router";

export const appRouter = createTRPCRouter({
  floor: floorRouter,
  table: tableRouter,
  product: productRouter,
  session: sessionRouter,
  order: orderRouter,
  payment: paymentRouter,
  auth: authRouter,
});

// Export only the type definition of our API to prevent leaking implementation details to client
export type AppRouter = typeof appRouter;
