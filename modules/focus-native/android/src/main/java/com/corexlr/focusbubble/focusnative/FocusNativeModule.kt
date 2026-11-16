package com.corexlr.focusbubble.focusnative

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The bridge between JavaScript and Android. Each `Function` below becomes a method on the
 * `FocusNative` object in TypeScript (see ../index.ts). They are synchronous and thin: the
 * real work is in the small files next to this one, and no timer logic lives in Kotlin.
 */
class FocusNativeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("FocusNative")

    OnCreate { appContext.reactContext?.let { Notifications.ensureChannels(it) } }

    // ── Clock ──
    Function("now") { Clock.now(context) }

    Function("isDebugBuild") { BuildConfig.DEBUG }

    // ── Completion alarm ──
    Function("canScheduleExactAlarms") { Alarms.canScheduleExact(context) }

    Function("scheduleAlarm") {
        sessionId: String,
        deadlineElapsedMs: Double,
        title: String,
        body: String,
        actionLabel: String?,
        actionCommand: String? ->
      Alarms.schedule(
          context,
          AlertPayload(sessionId, title, body, actionLabel, actionCommand, deadlineElapsedMs.toLong()),
      )
    }

    Function("cancelAlarm") { Alarms.cancel(context) }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        open(
            Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                .setData(Uri.parse("package:${context.packageName}")))
      }
    }

    // ── Notifications ──
    Function("areNotificationsEnabled") { Notifications.areEnabled(context) }

    Function("openNotificationSettings") {
      open(
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
              .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName))
    }

    Function("showOngoing") {
        sessionId: String,
        title: String,
        text: String?,
        running: Boolean,
        deadlineElapsedMs: Double ->
      Notifications.showOngoing(
          context,
          OngoingModel(sessionId, title, text, running, deadlineElapsedMs.toLong()),
      )
    }

    Function("showCompletion") {
        sessionId: String,
        title: String,
        body: String,
        actionLabel: String?,
        actionCommand: String? ->
      Notifications.showCompletion(
          context,
          AlertPayload(sessionId, title, body, actionLabel, actionCommand, 0),
      )
    }

    Function("clearNotifications") { which: String -> Notifications.clear(context, which) }

    Function("setAlertPrefs") { sound: Boolean, vibration: Boolean ->
      Prefs.setAlertPrefs(context, sound, vibration)
    }

    // ── Appearance ──
    Function("getDynamicPalette") { DynamicPalette.read(context) }

    // ── Debug / spike helpers ──
    Function("getEventLog") { Prefs.eventLog(context) }
    Function("clearEventLog") { Prefs.clearEventLog(context) }
    Function("logEvent") { message: String -> Prefs.log(context, message) }
    Function("spikeLoad") { Prefs.spikeState(context) }
    Function("spikeSave") { json: String? -> Prefs.setSpikeState(context, json) }
  }

  private fun open(intent: Intent) {
    try {
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (e: Exception) {
      Prefs.log(context, "could not open settings: ${e.javaClass.simpleName}")
    }
  }
}
