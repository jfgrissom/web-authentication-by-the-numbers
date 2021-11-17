import express, { Application, Request, Response } from 'express'
import auth from 'basic-auth'

const app: Application = express()
const port = 3000

app.use((req, res, next) => {
  let user = auth(req)

  if (
    user === undefined ||
    user['name'] !== 'admin' ||
    user['pass'] !== 'supersecret'
  ) {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="Node"')
    res.end('Unauthorized')
  } else {
    next()
  }
})

app.get('/', async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).send({
    message: "Hello World! I'm authenticated."
  })
})

app.listen(port)
