import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDC9yplwbk0jQI65AGT62XUqVOXxLZ8T78",
  authDomain: "dashmovie-7498c.firebaseapp.com",
  projectId: "dashmovie-7498c",
  storageBucket: "dashmovie-7498c.appspot.com",
  messagingSenderId: "14691378575",
  appId: "1:14691378575:web:4908dd7ecf80f3d0bd17fa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exporta a instância do banco de dados Firestore
export const db = getFirestore(app);

// --- Funções de Interação com o Firestore ---

// Referência para um documento único que guardará as listas compartilhadas
const sharedListDocRef = doc(db, "sharedLists", "mainList");

// Função para buscar as listas do Firestore
export async function getSharedLists(): Promise<{ favorites: number[], seen: number[] }> {
  const docSnap = await getDoc(sharedListDocRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      favorites: data.favorites || [],
      seen: data.seen || []
    };
  } else {
    // Se o documento não existe pela primeira vez, cria um com listas vazias
    await setDoc(sharedListDocRef, { favorites: [], seen: [] });
    return { favorites: [], seen: [] };
  }
}

// Função para atualizar a lista de favoritos no Firestore
export async function updateFavoritesList(newFavorites: number[]) {
  await updateDoc(sharedListDocRef, {
    favorites: newFavorites
  });
}

// Função para atualizar a lista de vistos no Firestore
export async function updateSeenList(newSeenMovies: number[]) {
  await updateDoc(sharedListDocRef, {
    seen: newSeenMovies
  });
}
