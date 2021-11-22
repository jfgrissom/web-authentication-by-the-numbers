import express, { Application, NextFunction, Request, Response } from 'express'
import passport from 'passport'
import { Strategy } from 'passport-local'
import session from 'express-session'

const app: Application = express()
const port = 3000

interface iUser {
  id: number
  username: string
  password: string
}

const users: iUser[] = [{ id: 1, username: 'admin', password: 'supersecret' }]

passport.use(
  new Strategy({}, (username: string, password: string, done: Function) => {
    if (!users) return done(null, false, { message: 'Database Failure.' })

    const user = users.find((user) => {
      if (user.username === username && user.password === password) {
        return user
      }
    })
    const failedAuthMessage = "Username and password combo isn't registered."

    if (!user) return done(null, false, { message: failedAuthMessage })

    return done(null, user)
  })
)

const sessionConfig = {
  secret: 'Not Really A Secret'
}

app.use(session(sessionConfig))
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
  return done(null, user)
})

passport.deserializeUser((id: number, done: Function) => {
  const user = users.find((user) => user.id === id)
  if (!user) return done(null, false)

  return done(null, user)
})

app.get('/', (req: Request, res: Response) => {
  if (res.user) {
    console.log('Thar Be Users!')
  }
  return res.send(`
    Home | <a href="/login">Login</a>
    <H1>Home</H1>
    <p>This is a public route. No Authentication is needed.</p>
    <p>User: ${req.user}</p>
  `)
})

app.get('/login', (req: Request, res: Response, next: NextFunction) => {
  res.send(`
    <a href="/">Home</a>
    <H1>Login</H1>
    <form action="/login" method="post">
      <div>
        <label>Username:</label>
        <input type="text" name="username"/>
      </div>
      <div>
        <label>Password:</label>
        <input type="password" name="password"/>
      </div>
      <div>
        <input type="submit" value="Log In"/>
      </div>
    </form>
  `)
})

app.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/members',
    failureRedirect: '/auth-failed'
  })
)

app.get('/auth-failed', (req: Request, res: Response, next: NextFunction) => {
  res.send(`
    <a href="/">Home</a> | <a href="/login">Login</a>
    <H1>Failed!</H1>
    <p>How does it feel?</p>
    SessionID: ${req.session.id}
  `)
})

app.get(
  '/members',
  passport.authenticate('local', {
    successRedirect: '/members',
    failureRedirect: '/auth-failed'
  }),
  (req: Request, res: Response, next: NextFunction) => {
    res.send(`
    <H1>Members Only!<H1/>
    <p>Welcome</p>
  `)
  }
)

app.listen(port)
