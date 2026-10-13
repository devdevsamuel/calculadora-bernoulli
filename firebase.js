// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCaU5afN-Y5A6nMPzuSQJPGE5Yt1RiZJJ4",
  authDomain: "calculadora-bernoulli.firebaseapp.com",
  projectId: "calculadora-bernoulli",
  storageBucket: "calculadora-bernoulli.firebasestorage.app",
  messagingSenderId: "811284296579",
  appId: "1:811284296579:web:4eaa815638a61000007cb6",
  measurementId: "G-WTCVDEXGTZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

