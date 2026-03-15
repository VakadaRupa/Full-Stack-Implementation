import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/authRoutes.js'
import accountRoutes from './routes/accountRoutes.js'
import userRoutes from './routes/userRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/account', accountRoutes)
app.use('/api/users', userRoutes)
app.get("/", (req, res) => {
  res.send("Account Management API Running 🚀")
})
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})