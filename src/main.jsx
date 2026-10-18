import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import App from "./App.jsx";
import AppLayout from "./AppLayout.jsx";
import ForYou from "./ForYou.jsx";
import BookDetails from "./BookDetails.jsx";
import PremiumPlayer from "./PremiumPlayer.jsx";
import Library from "./Library.jsx";
import Settings from "./Settings.jsx";
import ChoosePlan from "./ChoosePlan.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";

import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />

        <Route
          path="/for-you"
          element={
            <ProtectedRoute>
              <ForYou />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/book/:id" element={<BookDetails />} />
          <Route path="/player/:id" element={<PremiumPlayer />} />
          <Route path="/library" element={<Library />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/choose-plan" element={<ChoosePlan />} />

        <Route
          path="*"
          element={
            <main style={{ padding: 40 }}>
              <h1>Page not found</h1>
              <Link to="/">Return home</Link>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
