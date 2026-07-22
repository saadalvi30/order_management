require("dotenv").config();
const { startScheduler } = require("./jobs/scheduler");
const express = require("express");
const logger = require("./common/logger");
const db = require("./common/db");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./common/swagger");
const requestLogger = require("./common/middleWares/requestLogger");
const { errorHandler, notFoundHandler } = require("./common/middlewares/errorHandling");
const authRoutes = require("./modules/auth/authRoutes");
const productRoutes = require("./modules/products/productRoutes");
const orderRoutes = require("./modules/orders/orderRoutes");
const userRoutes = require("./modules/users/userRoutes");


const app = express();

app.use(express.json());
app.use(requestLogger);


app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/users", userRoutes);
app.use(notFoundHandler);

app.use(errorHandler);
const PORT = process.env.PORT || 3500;

async function startServer() {
  try {

    await db.query("SELECT 1");
    logger.info("Database connected successfully");

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
    startScheduler();
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
}

startServer();

module.exports = app; 