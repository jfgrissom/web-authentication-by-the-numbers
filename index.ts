import express, { Application, NextFunction, Request, Response } from 'express'
import passport from 'passport'
import { Strategy } from 'passport-local'
import session, { SessionOptions } from 'express-session'
import { flash } from 'express-flash-message'

const app: Application = express()
const port = 3000

// The user "database". I kept this as simple as possible to avoid confusion.
const users: Express.User[] = [
  { id: 1, username: 'admin', password: 'supersecret' }
]

// This Express.User is a custom type/interface that is required by PassportJS if
// you're using Typescript. Making this conform to your user model makes sense
// but that isn't strictly required.
declare global {
  namespace Express {
    interface User {
      id: number
      username?: string
      password?: string
    }
  }
}

// Normally the expression-session object doesn't contain a passport property.
// This extends the default session's data model to allow for passport to
// optionally exist. This is only needed if you're using Typescript.
declare module 'express-session' {
  interface SessionData {
    passport?: Object
  }
}

// Enable parsing of data that is posted from the user login form to the login endpoint.
app.use(express.urlencoded())

// Create a session configuration.
const sessionConfig: SessionOptions = {
  secret: 'Not Really A Secret But It Should Be In Production',
  cookie: {
    httpOnly: true, // Only let the browser modify this, not JS.
    secure: process.env.NODE_ENV === 'production' ? true : false, // In production only set cookies if the TLS is enabled on the connection.
    sameSite: 'strict' // Only send a cookie if the domain matches the browser url.
  }
}

// Enable sessions.
app.use(session(sessionConfig))

// Setup the passport strategy with your custom local logic.
// It's worth noting that the passport-local strategy explicitly expects a
// user/password combo used to authenticate the user.
// These inputs (username/password) could be anything though.
// It's also worth noting that this function doesn't get called if your user
// is already authenticated.
passport.use(
  new Strategy({}, (username: string, password: string, done: Function) => {
    // For this example this wouldn't fail but for completeness this check should be done in a real project.
    if (!users) return done(null, false, { message: 'Database Failure.' })

    // Locate the user in your database with the credentials passed to this function.
    const user = users.find((user) => {
      if (user.username === username && user.password === password) {
        return user
      }
    })

    // Fail if the credentials don't exits.
    const failedAuthMessage = "Username and password combo isn't registered."
    if (!user) return done(null, false, { message: failedAuthMessage })

    // Succeed without and error by passing a user without a name or password.
    const sanitizedUser: Express.User = {
      id: user.id
    }
    return done(null, sanitizedUser)
  })
)

// Takes a user that is passed in from the auth strategy
// and serializes the user into the session.
// It's worth noting that this only gets called after the a user has been authenticated.
passport.serializeUser((user, done) => {
  return done(null, user)
})

// Takes the user passed to it from the session and deserializes it so passport can use it.
// It's worth noting this gets called on every subsequent http request.
passport.deserializeUser((user: Express.User, done: Function) => {
  return done(null, user)
})

// Add passport to the existing session handler.
app.use(passport.initialize())
app.use(passport.session())

// Enable flash messages to display auth errors.
app.use(flash())

// Custom Middleware:
// Apply this to any route to secure it.
const authRequired = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) return res.redirect('/login')
  next()
}

// Route handlers below here:
app.get('/', (req: Request, res: Response) => {
  return res.send(`
    Home ${
      req.isAuthenticated()
        ? '| <a href="/logout">Logout</a>'
        : '| <a href="/login">Login</a>'
    } | <a href="/members">Members</a>
    <H1>Home</H1>
    <p>This is a public route. No Authentication is needed.</p>
    SessionID: ${req.session.id} <br/>
    Authenticated: ${req.isAuthenticated() ? 'Yes' : 'No'} <br/>
    User: ${JSON.stringify(req.user)}
  `)
})

// Gathers credentials from the user or redirects them if they are already authenticated.
app.get('/login', async (req: Request, res: Response, next: NextFunction) => {
  const errors = await req.consumeFlash('error')
  if (!req.isAuthenticated()) {
    return res.send(`
      <a href="/">Home</a>
      <H1>Login</H1>
      <form action="/auth" method="post">
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
      SessionID: ${req.session.id}
    `)
  }
  return res.redirect('/members')
})

// Receives posted data that can be used for authenticating a user.
// Inputs are received here from the form located at /login.
app.post(
  '/auth',
  passport.authenticate('local', {
    successRedirect: '/auth/success',
    failureRedirect: '/login',
    failureFlash: true
  })
)

// NIST digital identity guidelines recommend recreating a session for security reasons.
// https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63b.pdf
// To change the session id you'll need to update the cookie on the client side.
// A response with the new session needs to be sent in order to update the client's cookie.
// You'll need a place for them to land once they've been authenticated to change the session id.
// This is also a good place to make updates to the session in the database if you need to.
app.get('/auth/success', (req: Request, res: Response, next: NextFunction) => {
  const previousSessionData = req.session.passport
  const previousUser = req.user
  req.session.regenerate((err) => {
    if (err) return res.status(500)
    req.session.passport = previousSessionData
    req.user = previousUser
    req.session.save((err) => {
      if (err) return res.status(500)
    })
    return res.send(`
      <a href="/">Home</a> ${
        req.isAuthenticated()
          ? '| <a href="/logout">Logout</a>'
          : '| <a href="/login">Login</a>'
      } | <a href="/members">Members</a>
      <h1>Login Success!</h1>
      <p>Would you like to go to the <a href="/members">Members Area</a>?</p>

      <p>
        A client side redirect here could allow this intermediary step to be skipped.
        Note the new session ID!
      </p>
      SessionID: ${req.session.id} <br/>
      Authenticated: ${req.isAuthenticated() ? 'Yes' : 'No'} <br/>
      User: ${JSON.stringify(req.user)}
    `)
  })
})

// Logs a user out by destroying their session and redirecting them.
app.get('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.session.destroy(() => {
    return res.redirect('/logout/success')
  })
})

app.get(
  '/logout/success',
  (req: Request, res: Response, next: NextFunction) => {
    return res.send(`
      <a href="/">Home</a> ${
        req.isAuthenticated()
          ? '| <a href="/logout">Logout</a>'
          : '| <a href="/login">Login</a>'
      } | <a href="/members">Members</a>
      <h1>Logout Success!</h1>

      SessionID: ${req.session.id} <br/>
      Authenticated: ${req.isAuthenticated() ? 'Yes' : 'No'} <br/>
      User: ${JSON.stringify(req.user)}
    `)
  }
)

// For authenticated users only.
app.get(
  '/members',
  authRequired,
  (req: Request, res: Response, next: NextFunction) => {
    return res.send(`
    <a href="/">Home</a> | <a href="/logout">Logout</a>
    <H1>Members Only!</H1>
    <p>You're Authenticated! 😎</p>
    SessionID: ${req.session.id} <br/>
    User: ${JSON.stringify(req.user)}
  `)
  }
)

// Start the service.
app.listen(port)
