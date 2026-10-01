package app.vanguard.energy

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.geometry.Offset
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import android.graphics.Bitmap
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.junit.Before
import org.junit.After
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TrackerUiTest {
    @get:Rule val ui = createEmptyComposeRule()
    private var activity: ActivityScenario<MainActivity>? = null
    private val instrumentation get() = InstrumentationRegistry.getInstrumentation()
    private val context get() = instrumentation.targetContext
    @Before fun resetPreferences() {
        context.getSharedPreferences("vanguard-native-v1", 0).edit()
            .putString("preferences", PreferenceCodec.encode(Preferences())).commit()
    }
    @After fun closeActivity() { activity?.close() }
    private fun launch() { activity = ActivityScenario.launch(MainActivity::class.java); ready() }
    private fun ready() { ui.waitUntil(10_000) { ui.onAllNodesWithTag("setup").fetchSemanticsNodes().isNotEmpty() } }
    private fun screenshot(name: String) {
        val bitmap = instrumentation.uiAutomation.takeScreenshot()
        val directory = File(context.getExternalFilesDir(null), "screenshots").apply { mkdirs() }
        File(directory, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
    }
    @Test fun controlsLimitsAndHoldReset() {
        launch()
        screenshot("two-players")
        ui.onNodeWithTag("charge-0").performClick()
        ui.onNodeWithTag("energy-0").assertContentDescriptionEquals("Player 1: 3 energy")
        ui.onNodeWithTag("add-0").performTouchInput { click() }
        ui.onNodeWithTag("energy-0").assertContentDescriptionEquals("Player 1: 4 energy")
        ui.onNodeWithTag("remove-0").performTouchInput { down(center) }
        ui.waitUntil(2_000) { ui.onNodeWithTag("energy-0").fetchSemanticsNode().config[androidx.compose.ui.semantics.SemanticsProperties.ContentDescription] == listOf("Player 1: 0 energy") }
        ui.onNodeWithTag("remove-0").performTouchInput { up() }
        ui.onNodeWithTag("energy-0").assertContentDescriptionEquals("Player 1: 0 energy")
        ui.onNodeWithTag("setup").performClick()
        ui.onNodeWithTag("count-4").performClick()
        ui.onNodeWithTag("limit-0").performClick()
        screenshot("setup")
        ui.onNodeWithTag("done").performClick()
        ui.onNodeWithTag("player-3").assertExists()
        repeat(5) { ui.onNodeWithTag("charge-0").performClick() }
        ui.onNodeWithTag("energy-0").assertContentDescriptionEquals("Player 1: 15 energy")
        screenshot("four-players")
        ui.onNodeWithTag("setup").performClick()
        ui.onNodeWithTag("limit-0").assertIsNotEnabled()
    }
    @Test fun simultaneousPlayersAndCancelledHold() {
        launch()
        val p0 = ui.onNodeWithTag("add-0").fetchSemanticsNode().boundsInRoot.center
        val p1 = ui.onNodeWithTag("add-1").fetchSemanticsNode().boundsInRoot.center
        ui.onRoot().performTouchInput {
            down(0, p0); down(1, p1); up(0)
            down(2, p0); up(2); up(1)
        }
        ui.onNodeWithTag("energy-0").assertContentDescriptionEquals("Player 1: 2 energy")
        ui.onNodeWithTag("energy-1").assertContentDescriptionEquals("Player 2: 1 energy")
        ui.onNodeWithTag("remove-0").performTouchInput { down(center); moveTo(center + Offset(40f, 0f)); up() }
        ui.onNodeWithTag("energy-0").assertContentDescriptionEquals("Player 1: 2 energy")
        activity!!.recreate()
        ready()
        ui.onNodeWithTag("energy-0").assertContentDescriptionEquals("Player 1: 2 energy")
        activity!!.close()
        launch()
        ui.onNodeWithTag("energy-0").assertContentDescriptionEquals("Player 1: 0 energy")
    }
    @Test fun importsActualLegacyWebViewPreferences() {
        val latch = CountDownLatch(1)
        val players = (0..3).joinToString(",") { id ->
            """{"id":$id,"name":"Saved $id","color":"${PLAYER_COLORS[id]}","energy":15,"allowAbove10":true}"""
        }
        val raw = """{"board":{"count":4,"players":[$players]}}"""
        context.getSharedPreferences("vanguard-native-v1", 0).edit().clear().commit()
        instrumentation.runOnMainSync {
            @Suppress("SetJavaScriptEnabled")
            val webView = WebView(context)
            webView.settings.javaScriptEnabled = true
            webView.settings.domStorageEnabled = true
            webView.settings.blockNetworkLoads = true
            webView.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    view.evaluateJavascript("localStorage.setItem('vanguard-energy-v1', ${org.json.JSONObject.quote(raw)}); 'saved';") {
                        view.destroy(); latch.countDown()
                    }
                }
            }
            webView.loadDataWithBaseURL("https://localhost/", "<html></html>", "text/html", "UTF-8", null)
        }
        assertTrue("Legacy preferences seeded", latch.await(10, TimeUnit.SECONDS))
        launch()
        ui.onNodeWithTag("player-3").assertExists()
        ui.onNodeWithTag("energy-0").assertContentDescriptionEquals("Saved 0: 0 energy")
        repeat(5) { ui.onNodeWithTag("charge-0").performClick() }
        ui.onNodeWithTag("energy-0").assertContentDescriptionEquals("Saved 0: 15 energy")
    }
}
