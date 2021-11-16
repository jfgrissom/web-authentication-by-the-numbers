import express, { Application, Request, Response } from 'express'
const basicAuth = require('express-basic-auth')

const app: Application = express()
const port = 3000

app.use(
  basicAuth({
    users: { admin: 'supersecret' }
  })
)

app.get('/', async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).send({
    message: "Hello World! I'm not authenticated."
  })
})

app.listen(port)
