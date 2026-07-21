import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { BikeList } from "./features/bikes";
import { Hovno } from "./features/users/Hovno";
function App(): ReactElement {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/bikes" replace />} />
        <Route path="/bikes" element={<BikeList />} />
        <Route path="/hovno" element={<Hovno />} />
      </Route>
    </Routes>
  );
}

export default App;
