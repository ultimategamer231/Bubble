package com.corexlr.focusbubble.focusnative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Fires when the session's deadline arrives (see Alarms.kt). The app may be completely
 * closed. It first does everything that needs no JavaScript — posts the completion
 * notification and plays the alert, using text saved when the alarm was set — and then asks
 * JavaScript to record the finished session ("Reconcile").
 */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val sessionId = intent.getStringExtra(FocusContract.EXTRA_SESSION_ID)
    val payload = Prefs.alarmPayload(context)
    if (!FocusContract.isValidAlarmIntent(intent.action, sessionId, payload?.sessionId)) {
      Prefs.log(context, "alarm ignored (stale or invalid)")
      return
    }
    val lateMs = Clock.elapsedMs() - payload!!.deadlineElapsedMs
    Prefs.log(context, "alarm fired, ${lateMs} ms after the deadline")
    Notifications.showCompletion(context, payload)
    FocusHeadlessService.start(context, "Reconcile", sessionId, "alarm")
  }
}

/**
 * Receives taps on notification buttons (and, from Phase 6, widget buttons). It contains no
 * timer logic: it checks the intent is ours and hands the command to JavaScript.
 */
class CommandReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val command = intent.getStringExtra(FocusContract.EXTRA_COMMAND)
    val sessionId = intent.getStringExtra(FocusContract.EXTRA_SESSION_ID)
    if (!FocusContract.isValidButtonIntent(intent.action, command, sessionId)) {
      Prefs.log(context, "command ignored (invalid intent)")
      return
    }
    Prefs.log(context, "button: $command")
    FocusHeadlessService.start(context, command!!, sessionId, "button")
  }
}

/**
 * Runs once after the phone restarts. The boot clock started again from zero, so a session
 * that was running can't be proven finished; JavaScript marks it interrupted and repairs
 * the notification/widget. A paused session is left as it was.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    Prefs.log(context, "boot completed")
    FocusHeadlessService.start(context, "Reconcile", null, "boot")
  }
}
