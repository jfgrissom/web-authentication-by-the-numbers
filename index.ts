import express, { Application, Request, Response, NextFunction } from 'express'
import session from 'express-session'
import auth from 'basic-auth'

// Add the session data we need that is specific to our application.
declare module 'express-session' {
  interface SessionData {
    userToken?: string
    tokenExpiration?: number
  }
}

const app: Application = express()
const port = 3000

const sessionOptions = {
  secret: 'session secret that is not secret',
  cookie: {
    httpOnly: true // Only let the browser modify this, not JS.
  }
}

app.use(session(sessionOptions))

app.use((req: Request, res: Response, next: NextFunction) => {
  // If we have a previous session with key session data then we are authenticated.
  const currentTime = Date.now() / 1000
  if (
    req.session.userToken &&
    req.session.tokenExpiration &&
    req.session.tokenExpiration > currentTime
  ) {
    next()
    return
  }

  // If no prior session was established and bad credentials were passed.
  const user = auth(req)
  if (
    user === undefined ||
    user['name'] !== 'admin' ||
    user['pass'] !== 'supersecret'
  ) {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="Node"')
    res.end('Unauthorized')
    return
  }

  // Create a new session for the user who has passed good credentials.
  req.session.userToken = user.name
  req.session.tokenExpiration = currentTime + 15 // 15 second session.
  next()
})

app.get('/', async (req: Request, res: Response): Promise<Response> => {
  const currentTime = Date.now() / 1000
  return res.send(`
  Session ID: ${req.session.id} <br/>
  Authenticated Username: ${auth(req)?.name} <br/>
  User Token: ${req.session.userToken} <br/>
  Current Time: ${currentTime} <br/>
  Session Expiration: ${req.session.tokenExpiration}
  `)
})

app.listen(port)
