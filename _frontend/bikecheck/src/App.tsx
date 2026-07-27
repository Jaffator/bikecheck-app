import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { Dashboard } from "./features/dashboard_page/Dashboard";
import { AppLayout } from "./layout/AppLayout";
import { Garage } from "./features/garage_page/Garage";
import { Service } from "./features/service_page/Service";
import { Rides } from "./features/rides_page/Rides";
import { Login } from "./features/login_page/Login";
import { useCurrentUser } from "./features/users/users.queries";

function App(): ReactElement {
  return (
    <Routes>
      {/* Public routes go here, outside the auth gate — e.g. the future
          shareable public BikeCheck report. */}
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}

// Everything else requires a logged-in user.
function ProtectedApp(): ReactElement {
  const { data: user, isLoading: isUserLoading, isError: isUserError, error: userError } = useCurrentUser();

  if (isUserLoading) {
    return (
      <Center style={{ minHeight: "100dvh" }} bg="background.9">
        <Loader type="oval" color="primary.6" size="lg" />
      </Center>
    );
  }

  if (isUserError || !user) {
    console.log("user", user);
    console.log("error", userError);
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/garage" element={<Garage />} />
        <Route path="/service" element={<Service />} />
        <Route path="/rides" element={<Rides />} />
      </Route>
    </Routes>
  );
}

export default App;
