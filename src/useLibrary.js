import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import app, { auth } from "./firebase";

const db = getFirestore(app);

function bookRecord(book) {
  if (!book || typeof book.id !== "string" || !book.id) {
    throw new Error("A valid book is required.");
  }

  return {
    id: book.id,
    title: book.title || "",
    author: book.author || "",
    subTitle: book.subTitle || "",
    imageLink: book.imageLink || "",
    averageRating: book.averageRating ?? null,
    subscriptionRequired: Boolean(book.subscriptionRequired),
  };
}

function getBookRef(section, id) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in to use your library.");
  }

  if (typeof id !== "string" || !id) {
    throw new Error("A valid book ID is required.");
  }

  return doc(db, "users", user.uid, section, id);
}

function readBooks(snapshot) {
  return snapshot.docs.map((item) => ({
    ...item.data(),
    id: item.id,
  }));
}

function libraryErrorMessage(error) {
  if (error.code === "permission-denied") {
    return "Library access was denied. Check that your Firestore rules are published and you are signed in.";
  }

  return "Unable to load your library. Check your connection and refresh the page.";
}

export default function useLibrary() {
  const [savedBooks, setSavedBooks] = useState([]);
  const [finishedBooks, setFinishedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let generation = 0;
    let stopSaved = () => {};
    let stopFinished = () => {};

    const stopAuth = onAuthStateChanged(auth, (user) => {
      const currentGeneration = ++generation;

      stopSaved();
      stopFinished();
      stopSaved = () => {};
      stopFinished = () => {};

      setSavedBooks([]);
      setFinishedBooks([]);
      setError("");

      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      let savedLoaded = false;
      let finishedLoaded = false;

      function isCurrent() {
        return (
          active &&
          currentGeneration === generation &&
          auth.currentUser?.uid === user.uid
        );
      }

      function updateLoading() {
        if (isCurrent()) {
          setLoading(!(savedLoaded && finishedLoaded));
        }
      }

      stopSaved = onSnapshot(
        collection(db, "users", user.uid, "savedBooks"),
        (snapshot) => {
          if (!isCurrent()) return;

          setSavedBooks(readBooks(snapshot));
          savedLoaded = true;
          updateLoading();
        },
        (err) => {
          if (!isCurrent()) return;

          setSavedBooks([]);
          setError(libraryErrorMessage(err));
          savedLoaded = true;
          updateLoading();
        },
      );

      stopFinished = onSnapshot(
        collection(db, "users", user.uid, "finishedBooks"),
        (snapshot) => {
          if (!isCurrent()) return;

          setFinishedBooks(readBooks(snapshot));
          finishedLoaded = true;
          updateLoading();
        },
        (err) => {
          if (!isCurrent()) return;

          setFinishedBooks([]);
          setError(libraryErrorMessage(err));
          finishedLoaded = true;
          updateLoading();
        },
      );
    });

    return () => {
      active = false;
      generation += 1;
      stopAuth();
      stopSaved();
      stopFinished();
    };
  }, []);

  function isSaved(id) {
    return savedBooks.some((book) => book.id === id);
  }

  async function toggleBook(book) {
    const record = bookRecord(book);
    const reference = getBookRef("savedBooks", record.id);

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);

      if (snapshot.exists()) {
        transaction.delete(reference);
      } else {
        transaction.set(reference, record);
      }
    });
  }

  async function removeBook(id) {
    await deleteDoc(getBookRef("savedBooks", id));
  }

  async function markFinished(book) {
    const record = bookRecord(book);

    await setDoc(getBookRef("finishedBooks", record.id), record);
  }

  async function removeFinished(id) {
    await deleteDoc(getBookRef("finishedBooks", id));
  }

  return {
    savedBooks,
    finishedBooks,
    loading,
    error,
    isSaved,
    toggleBook,
    removeBook,
    markFinished,
    removeFinished,
  };
}
