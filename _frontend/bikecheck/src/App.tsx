import { usePushNotifications } from "./hooks/usePushNotifications";
import { InAppNotification } from "./components/InAppNotification";
import { Button } from "@mantine/core";
// import ServiceReportA4 from "./components/ServiceReportA4_Single";

function App() {
  // foregroundNotification is set only while the app is open.
  // Background/closed notifications are shown by the system tray automatically.
  const { foregroundNotification, dismiss } = usePushNotifications();

  return (
    <>
      {foregroundNotification && <InAppNotification notification={foregroundNotification} onDismiss={dismiss} />}
      <div className="flex flex-col items-center justify-center gap-4 m-10 p-10 border border-cards-300 bg-primary-600 rounded-lg">
        <Button variant="filled" color="primary.6" styles={{ label: { color: "var(--mantine-color-textDark-6)" } }}>
          Click Me
        </Button>
      </div>
      {/* <ServiceReportA4 /> */}
    </>
  );
}

export default App;
