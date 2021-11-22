import express, { Application, NextFunction, Request, Response } from 'express'
import passport from 'passport'
import { Strategy } from 'passport-local'
import session from 'express-session'
import { flash } from 'express-flash-message'

const app: Application = express()
const port = 3000

interface iUser {
  id: number
  username: string
  password: string
}

// Middleware to secure routes that use this passport strategy.
const authRequired = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) return res.redirect('/login')
  next()
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
  secret: 'Not Really A Secret But It Should Be In Production'
}

// Enable parsing of data that is posted from the user login form to the login endpoint.
app.use(express.urlencoded())
app.use(express.json())

// Setup the session
app.use(session(sessionConfig))
app.use(passport.initialize())
app.use(passport.session())

// Enable flash messages to display auth errors.
app.use(flash())

passport.serializeUser((user, done) => {
  console.log(`User to be Serialized: ${JSON.stringify(user)}`)
  return done(null, user)
})

passport.deserializeUser((user: iUser, done: Function) => {
  console.log(`Passed User: ${JSON.stringify(user)}`)

  const foundUser = users.find(
    (user) => user.username === user.username && user.password === user.password
  )

  if (!foundUser) return done(null, false)

  console.log(`Found User: ${JSON.stringify(foundUser)}`)
  return done(null, foundUser)
})

app.get('/', (req: Request, res: Response) => {
  return res.send(`
    Home | <a href="/login">Login</a> | <a href="/members">Members</a>
    <H1>Home</H1>
    <p>This is a public route. No Authentication is needed.</p>
    <p>User: ${JSON.stringify(req.user)}</p>
  `)
})

app.get('/login', async (req: Request, res: Response, next: NextFunction) => {
  const errors = await req.consumeFlash('error')
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
    Errors: ${errors} <br/>
    SessionID: ${req.session.id} <br/>
    User: ${JSON.stringify(req.user)}
  `)
})

app.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/members',
    failureRedirect: '/login',
    failureFlash: true
  })
)

app.get(
  '/members',
  authRequired,
  (req: Request, res: Response, next: NextFunction) => {
    res.send(`
    <a href="/">Home</a>
    <H1>Members Only!</H1>
    <p>Welcome</p>
    SessionID: ${req.session.id} <br/>
    User: ${JSON.stringify(req.user)}
  `)
  }
)

app.listen(port)
