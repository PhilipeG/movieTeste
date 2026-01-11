import { initializeApp } from "firebase/app"
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDC9yplwbk0jQI65AGT62XUqVOXxLZ8T78",
  authDomain: "dashmovie-7498c.firebaseapp.com",
  projectId: "dashmovie-7498c",
  storageBucket: "dashmovie-7498c.appspot.com",
  messagingSenderId: "14691378575",
  appId: "1:14691378575:web:4908dd7ecf80f3d0bd17fa",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

const sharedListDocRef = doc(db, "sharedLists", "mainList")

export async function getSharedLists(): Promise<{
  favorites: number[]
  seen: number[]
}> {
  const docSnap = await getDoc(sharedListDocRef)

  if (docSnap.exists()) {
    const data = docSnap.data()
    return {
      favorites: data.favorites || [],
      seen: data.seen || [],
    }
  } else {
    await setDoc(sharedListDocRef, { favorites: [], seen: [] })
    return { favorites: [], seen: [] }
  }
}

export async function updateFavoritesList(newFavorites: number[]) {
  await updateDoc(sharedListDocRef, {
    favorites: newFavorites,
  })
}

export async function updateSeenList(newSeenMovies: number[]) {
  await updateDoc(sharedListDocRef, {
    seen: newSeenMovies,
  })
}
