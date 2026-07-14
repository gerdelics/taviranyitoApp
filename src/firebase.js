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
// the app's own client-side login. `authReady` resolves once a signed-in
// user exists; the app waits on it before touching the database.
export const authReady = new Promise((resolve, reject) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      unsubscribe()
      resolve(user)
    }
  })
  signInAnonymously(auth).catch((error) => {
    console.error('Anonymous sign-in failed', error)
    unsubscribe()
    reject(error)
  })
})
