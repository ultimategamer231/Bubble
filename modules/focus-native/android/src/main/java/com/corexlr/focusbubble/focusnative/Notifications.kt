package com.corexlr.focusbubble.focusnative

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/** Everything needed to draw the ongoing (running / paused) notification. */
data class OngoingModel(
    val sessionId: String,
    val title: String,
    /** Second line, e.g. "Paused · 12:40 left". May be null while running. */
    val text: String?,
    val running: Boolean,
    val deadlineElapsedMs: Long,
)

/**
 * Builds and posts the two notifications:
 *
 * 1. Ongoing: while a session runs, Android itself ticks the countdown (a "chronometer"),
 *    so the app never has to wake up every second.
 * 2. Completion: "Bubble earned" (or "Break's over"), with an optional button.
 */
object Notifications {
  /** Creates the two channels. Safe to call every time; Android ignores repeats. */
  fun ensureChannels(context: Context) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val running =
        NotificationChannel(
                FocusContract.CHANNEL_RUNNING,
                context.getString(R.string.focus_channel_running_name),
                NotificationManager.IMPORTANCE_LOW,
            )
            .apply {
              description = context.getString(R.string.focus_channel_running_desc)
              setShowBadge(false)
            }
    val alerts =
        NotificationChannel(
                FocusContract.CHANNEL_ALERTS,
                context.getString(R.string.focus_channel_alerts_name),
                NotificationManager.IMPORTANCE_HIGH,
            )
            .apply {
              description = context.getString(R.string.focus_channel_alerts_desc)
              // Sound and vibration are played by AlertPlayer so the in-app switches work.
              setSound(null, null)
              enableVibration(false)
            }
    manager.createNotificationChannel(running)
    manager.createNotificationChannel(alerts)
  }

  fun areEnabled(context: Context): Boolean =
      NotificationManagerCompat.from(context).areNotificationsEnabled()

  /** Tapping a notification opens the app. */
  private fun openApp(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    launch.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
        context,
        0,
        launch,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  /** A button intent. It always carries the session ID it was drawn for. */
  fun commandIntent(context: Context, command: String, sessionId: String): PendingIntent =
      PendingIntent.getBroadcast(
          context,
          command.hashCode(),
          Intent(context, CommandReceiver::class.java)
              .setAction(FocusContract.ACTION_COMMAND)
              .putExtra(FocusContract.EXTRA_COMMAND, command)
              .putExtra(FocusContract.EXTRA_SESSION_ID, sessionId),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

  @SuppressLint("MissingPermission") // guarded by areEnabled()
  private fun post(context: Context, id: Int, builder: NotificationCompat.Builder) {
    if (!areEnabled(context)) return
    NotificationManagerCompat.from(context).notify(id, builder.build())
  }

  fun showOngoing(context: Context, model: OngoingModel) {
    ensureChannels(context)
    val builder =
        NotificationCompat.Builder(context, FocusContract.CHANNEL_RUNNING)
            .setSmallIcon(R.drawable.ic_stat_focus_bubble)
            .setColor(ContextCompat.getColor(context, R.color.focus_notification_accent))
            .setContentTitle(model.title)
            .setContentText(model.text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openApp(context))

    if (model.running) {
      // The system draws and ticks the countdown towards this wall-clock moment.
      val whenEpoch =
          Clock.deadlineToEpochMs(model.deadlineElapsedMs, Clock.elapsedMs(), Clock.epochMs())
      builder
          .setWhen(whenEpoch)
          .setShowWhen(true)
          .setUsesChronometer(true)
          .setChronometerCountDown(true)
          .addAction(
              0,
              context.getString(R.string.focus_action_pause),
              commandIntent(context, "Pause", model.sessionId),
          )
    } else {
      builder
          .setShowWhen(false)
          .addAction(
              0,
              context.getString(R.string.focus_action_resume),
              commandIntent(context, "Resume", model.sessionId),
          )
    }
    builder.addAction(
        0,
        context.getString(R.string.focus_action_end),
        commandIntent(context, "Reset", model.sessionId),
    )
    post(context, FocusContract.NOTIFICATION_ONGOING, builder)
  }

  /**
   * Posts the completion notification and, once per session, plays the sound/vibration.
   * Called from the alarm receiver (app possibly dead) and from JavaScript (app open).
   */
  fun showCompletion(context: Context, payload: AlertPayload) {
    ensureChannels(context)
    val builder =
        NotificationCompat.Builder(context, FocusContract.CHANNEL_ALERTS)
            .setSmallIcon(R.drawable.ic_stat_focus_bubble)
            .setColor(ContextCompat.getColor(context, R.color.focus_notification_accent))
            .setContentTitle(payload.title)
            .setContentText(payload.body)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openApp(context))
    if (payload.actionLabel != null && payload.actionCommand != null) {
      builder.addAction(
          0,
          payload.actionLabel,
          commandIntent(context, payload.actionCommand, payload.sessionId),
      )
    }
    NotificationManagerCompat.from(context).cancel(FocusContract.NOTIFICATION_ONGOING)
    post(context, FocusContract.NOTIFICATION_COMPLETION, builder)

    // Plays even when notifications are denied (decision T-06), but never twice per session.
    if (Prefs.markAlerted(context, payload.sessionId)) AlertPlayer.play(context)
  }

  /** which = "ongoing" or "all". */
  fun clear(context: Context, which: String) {
    val manager = NotificationManagerCompat.from(context)
    manager.cancel(FocusContract.NOTIFICATION_ONGOING)
    if (which == "all") manager.cancel(FocusContract.NOTIFICATION_COMPLETION)
  }
}
