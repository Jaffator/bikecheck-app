package com.bikecheck.app;

import android.os.Build;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting the navigation bar color is a no-op on API 35+, so instead we
        // draw the web content edge-to-edge behind the system bars. The dark
        // footer (with safe-area padding, see AppLayout) then fills the gesture
        // bar area itself, instead of leaving a white system nav bar strip.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Remove the system's translucent contrast scrim behind the nav bar.
            getWindow().setNavigationBarContrastEnforced(false);
        }
    }
}
