package com.arandue.app;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeThemeBar")
public class NativeThemeBarPlugin extends Plugin {

    @PluginMethod
    public void setBarTheme(PluginCall call) {
        final String hex = call.getString("color", "#FFFFFF");
        final boolean isDark = call.getBoolean("isDark", false);

        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                int color = Color.parseColor(hex);

                // 1. Garante que o conteúdo respeite a altura correta (não ofuscando ícones do sistema)
                WindowCompat.setDecorFitsSystemWindows(window, true);

                // 2. No Android 15/16 (API 35/36), a barra de status herda o background da janela.
                // Atualizar o windowBackground garante a cor exata sem cinza!
                window.setBackgroundDrawable(new ColorDrawable(color));

                // 3. Define a cor direta da status bar e navigation bar
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setStatusBarColor(color);
                window.setNavigationBarColor(color);

                // 4. Remove o scrim cinza forçado pelo Samsung One UI / Android 10+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    window.setStatusBarContrastEnforced(false);
                    window.setNavigationBarContrastEnforced(false);
                }

                // 4. Alterna a cor dos ícones das barras (relógio, bateria, notificações, gestos):
                // isDark = true -> ícones brancos (fundo escuro)
                // isDark = false -> ícones escuros (fundo claro)
                WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(window, window.getDecorView());
                if (controller != null) {
                    controller.setAppearanceLightStatusBars(!isDark);
                    controller.setAppearanceLightNavigationBars(!isDark);
                }

                call.resolve();
            } catch (Exception e) {
                call.reject("Erro ao aplicar tema na barra nativa: " + e.getMessage());
            }
        });
    }
}
