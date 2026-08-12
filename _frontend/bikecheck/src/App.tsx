import { useEffect, useRef, type ReactElement } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { Dashboard } from "./features/dashboard_page/Dashboard";
import { AppLayout } from "./layout/AppLayout";
import { Bikes } from "./features/bikes_page/Bikes";
import { AddBikeIdentity } from "./features/add_bike_page/AddBikeIdentity";
import { Service } from "./features/service_page/Service";
import { Rides } from "./features/rides_page/Rides";
import { Login } from "./features/login_page/Login";
import { Profile } from "./features/profile_page/Profile";
import { Settings } from "./features/settings_page/Settings";
import { Notifications } from "./features/notification_page/Notifications";
import { useCurrentUser, useUpdateUser } from "./features/users/users.queries";
import { applyLanguage, detectLanguage } from "./i18n";

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
  const { data: user, isLoading: isUserLoading, isError: isUserError } = useCurrentUser();
  const { mutate: patchUser } = useUpdateUser();
  const navigate = useNavigate();
  const userId = user?.id;
  const userLanguage = user?.language;
  const isLoggedIn = Boolean(user);
  // Null until the session check settles, so the first resolved state is not
  // mistaken for a login. Restoring an existing session on app start must keep
  // the current URL — only a real login redirects.
  const wasLoggedIn = useRef<boolean | null>(null);

  // The login page renders in place of the app, so the URL still points at
  // whatever page was open before. Land on the dashboard whenever a login
  // happens — covers email, native Google and the Google web redirect alike.
  useEffect(() => {
    if (isUserLoading) return;
    if (isLoggedIn && wasLoggedIn.current === false) {
      navigate("/", { replace: true });
    }
    wasLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, isUserLoading, navigate]);

  // The stored preference wins over the device locale i18n booted with, so the
  // choice follows the account across devices. A null language means the account
  // never picked one (Google sign-in carries no locale) — backfill it once.
  useEffect(() => {
    if (userId === undefined) return;
    if (userLanguage) {
      void applyLanguage(userLanguage);
      return;
    }
    patchUser({ id: userId, data: { language: detectLanguage() } });
  }, [userId, userLanguage, patchUser]);

  if (isUserLoading) {
    return (
      <Center style={{ minHeight: "100dvh" }} bg="background.9">
        <Loader type="oval" color="primary.6" size="lg" />
      </Center>
    );
  }

  if (isUserError || !user) {
    console.log("User not logged in or error fetching user:", isUserError, user);
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bikes" element={<Bikes />} />
        <Route path="/bikes/new" element={<AddBikeIdentity />} />
        <Route path="/service" element={<Service />} />
        <Route path="/rides" element={<Rides />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>
    </Routes>
  );
}

export default App;
