import { initializeApp } from "firebase/app";

const configPRD = {
  apiKey: "AIzaSyBZJeSANyiJi6ijzDadJOJXSLqzSgf9xfk",
  authDomain: window?.location?.hostname === 'trip-viewer-prd.firebaseapp.com' ? 'trip-viewer-prd.firebaseapp.com' : "trip-viewer.com",
  projectId: "trip-viewer-prd",
  storageBucket: "trip-viewer-prd.appspot.com",
  messagingSenderId: "1065119817152",
  appId: "1:1065119817152:web:92a2a1d074b5314eee3c25",
  measurementId: "G-YYZBDKL1SB"
};

const configDEV = {
  apiKey: "AIzaSyDUiLWOMQwIHqfByPxfk8edR9PguSVsBWo",
  authDomain: "trip-viewer-dev.firebaseapp.com",
  projectId: "trip-viewer-dev",
  storageBucket: "trip-viewer-dev.appspot.com",
  messagingSenderId: "1091542096877",
  appId: "1:1091542096877:web:17d4b634a5d6dd497565e4",
  measurementId: "G-S08E56DVW2"
};

const configTCC = {
  apiKey: "AIzaSyAHNHyvBmM4FAXyr5e4DcJD03yn6Xh0iS0",
  authDomain: "trip-viewer-tcc.firebaseapp.com",
  projectId: "trip-viewer-tcc",
  storageBucket: "trip-viewer-tcc.appspot.com",
  messagingSenderId: "717252916774",
  appId: "1:717252916774:web:368fd1735359a66cb618e7",
  measurementId: "G-9RFY3B31ZS"
};

// Initialize Firebase
const app = initializeApp(_getConfig());

function _getConfig() {
  const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || '';
  switch (projectId) {
    case 'trip-viewer-dev':
      return configDEV;
    case 'trip-viewer-tcc':
      return configTCC;
    case 'trip-viewer-prd':
      return configPRD;
    default:
      console.error('Projeto não reconhecido:', projectId);
      return {};
  }
}

export function startFirebase() {
  let features = [
    'auth',
    'database',
    'firestore',
    'functions',
    'messaging',
    'storage',
    'analytics',
    'remoteConfig',
    'performance',
  ].filter(feature => typeof app[feature] === 'function');

  console.log(`Firebase SDK loaded with ${features.join(', ')}`);
}