import { useCallback, useEffect, useRef, type ReactElement } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { Center, Loader } from "@mantine/core";
import { Dashboard } from "./features/dashboard_page/Dashboard";
import { AppLayout } from "./layout/AppLayout";
import { Bikes } from "./features/bikes_page/Bikes";
import { BikeDetail } from "./features/bikes_page/BikeDetail";
import { AddBikeIdentity } from "./features/add_bike_page/AddBikeIdentity";
import { Service } from "./features/service_page/Service";
import { ServiceHistory } from "./features/service_page/ServiceHistory";
import { ServiceDetail } from "./features/service_page/ServiceDetail";
import { AddService } from "./features/add_service_page/AddService";
import { Rides } from "./features/rides_page/Rides";
import { Login } from "./features/login_page/Login";
import { Profile } from "./features/profile_page/Profile";
import { Settings } from "./features/settings_page/Settings";
import { Notifications } from "./features/notification_page/Notifications";
import { StravaConnected } from "./features/strava_connected_page/StravaConnected";
import { InAppNotification } from "./components/InAppNotification";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useCurrentUser, useUpdateUser } from "./features/users/users.queries";
import { applyLanguage, detectLanguage } from "./i18n";

function App(): ReactElement {
  return (
    <Routes>
      {/* Public routes remain outside the authentication gate. */}
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}

// Renders routes that require an authenticated user.
function ProtectedApp(): ReactElement {
  const { data: user, isLoading: isUserLoading, isError: isUserError } = useCurrentUser();
  const { mutate: patchUser } = useUpdateUser();
  const navigate = useNavigate();

  // Memoizes the notification handler to avoid resubscribing native listeners.
  const openNotificationRoute = useCallback(
    (route: string): void => {
      navigate(route);
    },
    [navigate],
  );
  const { foregroundNotification, dismiss: dismissNotification } = usePushNotifications(openNotificationRoute);
  const userId = user?.id;
  const userLanguage = user?.language;
  const isLoggedIn = Boolean(user);
  // Tracks session resolution so only a new login redirects to the dashboard.
  const wasLoggedIn = useRef<boolean | null>(null);

  // Redirects new logins to the dashboard while preserving restored routes.
  useEffect(() => {
    if (isUserLoading) return;
    if (isLoggedIn && wasLoggedIn.current === false) {
      navigate("/", { replace: true });
    }
    wasLoggedIn.current = isLoggedIn;
  }, [isLoggedIn, isUserLoading, navigate]);

  // Applies the account language or persists the detected device language.
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
    <>
      {/* Shows foreground pushes that receive no system tray notification. */}
      {foregroundNotification && <InAppNotification notification={foregroundNotification} onDismiss={dismissNotification} />}

      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bikes" element={<Bikes />} />
          {/* Must precede the parameterized bike route. */}
          <Route path="/bikes/new" element={<AddBikeIdentity />} />
          <Route path="/bikes/:id" element={<BikeDetail />} />
          <Route path="/service" element={<Service />} />
          {/* Must precede the parameterized service route. */}
          <Route path="/service/new" element={<AddService />} />
          <Route path="/service/history" element={<ServiceHistory />} />
          <Route path="/service/:id" element={<ServiceDetail />} />
          <Route path="/rides" element={<Rides />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          {/* Handles the completed Strava OAuth deep link. */}
          <Route path="/strava-connected" element={<StravaConnected />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
