import express from "express"
import statusRoute from "./routes/status"

export const app = express()

app.use(express.json())

app.use("/api/v1", statusRoute)
