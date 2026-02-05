import express from "express";
import statusRoute from "./routes/status";
import authRoutes from "./routes/auth";

export const app = express()

app.use(express.json())

app.use("/api/v1/status", statusRoute);
app.use("/api/v1/auth", authRoutes)

