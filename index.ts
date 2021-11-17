import express, { Application, Request, Response } from 'express'
import session from 'express-session'

const app: Application = express()
const port = 3000

const sessionOptions = {
  secret: 'session secret that is not secret'
}

app.use(session(sessionOptions))

app.get('/', async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).send({
    message: "Hello World! I'm not authenticated."
  })
})

app.listen(port)
