import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export const auth = getAuth(app)

// The Realtime Database rules require `auth != null`, so we sign in
// anonymously on startup. This blocks unauthenticated internet traffic
// (the scanners that dump/wipe open Firebase databases) without changing
// the app's own client-side login.

// Ensure an anonymous user exists, deduping concurrent calls so the startup
// sign-in and any keep-alive re-sign-in never fire twice at once.
let signInInFlight = null
function ensureSignedIn() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser)
  if (!signInInFlight) {
    signInInFlight = signInAnonymously(auth)
      .then(({ user }) => user)
      .finally(() => { signInInFlight = null })
  }
  return signInInFlight
}

// Self-heal: if the anonymous user is ever lost (e.g. the token lapsed while the
// app sat backgrounded on mobile and the SDK couldn't refresh it), sign back in
// so database access keeps working instead of silently failing with
// permission_denied.
onAuthStateChanged(auth, (user) => {
  if (!user) {
    ensureSignedIn().catch((error) => console.error('Anonymous re-sign-in failed', error))
  }
})

// Force a fresh ID token and make sure a user exists. Call this when the app
// returns to the foreground — a mobile OS can freeze the SDK's background token
// refresh, letting the 1-hour token lapse while the app is backgrounded.
export async function refreshAuth() {
  try {
    const user = await ensureSignedIn()
    if (user) await user.getIdToken(true)
  } catch (error) {
    console.error('Auth refresh failed', error)
  }
}

// `authReady` resolves once a signed-in user exists; the app waits on it before
// touching the database.
export const authReady = new Promise((resolve, reject) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      unsubscribe()
      resolve(user)
    }
  })
  ensureSignedIn().catch((error) => {
    console.error('Anonymous sign-in failed', error)
    unsubscribe()
    reject(error)
  })
})
