package com.arandue.app;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.view.View;
import android.view.ViewGroup;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeThemeBarPlugin.class);
        super.onCreate(savedInstanceState);
        Window window = getWindow();

        // 1. Desativa scrim cinza forçado pelo Android / Samsung One UI
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        // 2. Garante desenho das barras do sistema e cor inicial
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.WHITE);
        window.setNavigationBarColor(Color.WHITE);
        window.setBackgroundDrawable(new ColorDrawable(Color.WHITE));

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }

        // 3. Aplica a altura do status bar e nav bar como margem no WebView
        ViewCompat.setOnApplyWindowInsetsListener(window.getDecorView(), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            View webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                ViewGroup.LayoutParams lp = webView.getLayoutParams();
                if (lp instanceof ViewGroup.MarginLayoutParams) {
                    ViewGroup.MarginLayoutParams mlp = (ViewGroup.MarginLayoutParams) lp;
                    mlp.topMargin = insets.top;
                    mlp.bottomMargin = insets.bottom;
                    mlp.leftMargin = insets.left;
                    mlp.rightMargin = insets.right;
                    webView.setLayoutParams(mlp);
                }
            }
            return windowInsets;
        });
    }
}
