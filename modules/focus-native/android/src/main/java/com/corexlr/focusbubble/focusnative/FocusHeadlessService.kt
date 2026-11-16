package com.corexlr.focusbubble.focusnative

import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Runs a short piece of the app's JavaScript without showing any screen.
 *
 * Receivers (alarm, notification buttons, boot) can't run JavaScript themselves, so they
 * start this service. React Native boots the JS engine if needed and calls the task named
 * "FocusCommand" (registered in src/services/headless.ts), which sends the command through
 * the same TimerController the screens use. The service holds a wake lock only while the
 * task runs, then stops itself.
 */
class FocusHeadlessService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    val command = extras.getString(FocusContract.EXTRA_COMMAND) ?: return null
    val data = Arguments.createMap()
    data.putString("command", command)
    data.putString("sessionId", extras.getString(FocusContract.EXTRA_SESSION_ID))
    data.putString("source", extras.getString(FocusContract.EXTRA_SOURCE))
    data.putDouble("receivedAtElapsedMs", extras.getLong(FocusContract.EXTRA_RECEIVED_AT).toDouble())
    // 30 s limit; allowed while the app is open too (a notification button can be tapped then).
    return HeadlessJsTaskConfig(FocusContract.HEADLESS_TASK, data, 30_000, true)
  }

  companion object {
    /**
     * Starts the JS task. Returns false if Android refused to start the service from the
     * background; that outcome is logged, because proving this works on real phones is the
     * point of the Phase 2 spike.
     */
    fun start(context: Context, command: String, sessionId: String?, source: String): Boolean {
      val intent =
          Intent(context, FocusHeadlessService::class.java)
              .putExtra(FocusContract.EXTRA_COMMAND, command)
              .putExtra(FocusContract.EXTRA_SESSION_ID, sessionId)
              .putExtra(FocusContract.EXTRA_SOURCE, source)
              .putExtra(FocusContract.EXTRA_RECEIVED_AT, Clock.elapsedMs())
      return try {
        context.startService(intent)
        HeadlessJsTaskService.acquireWakeLockNow(context)
        true
      } catch (e: Exception) {
        Prefs.log(context, "headless start REFUSED ($source/$command): ${e.javaClass.simpleName}")
        false
      }
    }
  }
}
