package com.corexlr.focusbubble.focusnative

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Schedules the one alarm that fires when the current session ends.
 *
 * "Exact" needs the user-granted "Alarms & reminders" permission on Android 12+ (Android 14
 * denies it by default). Without it we fall back to an inexact alarm, which Android may
 * deliver a few minutes late while the phone is idle. The timer itself stays exact either
 * way, because time is always computed from the deadline, never from this alarm.
 */
object Alarms {
  private fun manager(context: Context): AlarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  fun canScheduleExact(context: Context): Boolean =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) manager(context).canScheduleExactAlarms()
      else true

  private fun pendingIntent(context: Context, sessionId: String?, flags: Int): PendingIntent? {
    val intent =
        Intent(context, AlarmReceiver::class.java)
            .setAction(FocusContract.ACTION_ALARM)
            .putExtra(FocusContract.EXTRA_SESSION_ID, sessionId)
    return PendingIntent.getBroadcast(
        context,
        FocusContract.REQUEST_ALARM,
        intent,
        flags or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  /** Schedules (or replaces) the completion alarm. Returns "exact" or "inexact". */
  fun schedule(context: Context, payload: AlertPayload): String {
    Prefs.setAlarmPayload(context, payload)
    val pi = pendingIntent(context, payload.sessionId, PendingIntent.FLAG_UPDATE_CURRENT)!!
    val am = manager(context)
    if (canScheduleExact(context)) {
      try {
        am.setExactAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            payload.deadlineElapsedMs,
            pi,
        )
        return "exact"
      } catch (e: SecurityException) {
        // Permission was revoked between the check and the call: fall through.
      }
    }
    am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, payload.deadlineElapsedMs, pi)
    return "inexact"
  }

  fun cancel(context: Context) {
    pendingIntent(context, null, PendingIntent.FLAG_NO_CREATE)?.let {
      manager(context).cancel(it)
      it.cancel()
    }
    Prefs.setAlarmPayload(context, null)
  }
}
