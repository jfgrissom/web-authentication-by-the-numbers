import express, { Application, Request, Response, NextFunction } from 'express'
import session from 'express-session'
import auth from 'basic-auth'

const app: Application = express()
const port = 3000

const sessionOptions = {
  secret: 'session secret that is not secret'
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const user = auth(req)

  if (
    user === undefined ||
    user['name'] !== 'admin' ||
    user['pass'] !== 'supersecret'
  ) {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="Node"')
    res.end('Unauthorized')
  } else {
    console.log(user)
    next()
  }
})

app.use(session(sessionOptions))

app.get('/', async (req: Request, res: Response): Promise<Response> => {
  return res.send(`Session ID: ${req.session.id}`)
})

app.listen(port)
