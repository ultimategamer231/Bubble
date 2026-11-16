package com.corexlr.focusbubble.focusnative

import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.VibrationEffect
import android.os.Vibrator

/**
 * The rules for when the completion sound and vibration may play. Pure functions, unit
 * tested. The numbers are Android's own constants, repeated here so the tests need no device.
 */
object AlertGate {
  const val RINGER_SILENT = 0 // AudioManager.RINGER_MODE_SILENT
  const val RINGER_VIBRATE = 1 // AudioManager.RINGER_MODE_VIBRATE
  const val RINGER_NORMAL = 2 // AudioManager.RINGER_MODE_NORMAL
  const val FILTER_ALL = 1 // NotificationManager.INTERRUPTION_FILTER_ALL (Do Not Disturb off)

  /** Sound only when the setting is on, the phone rings normally and Do Not Disturb is off. */
  fun shouldPlaySound(enabled: Boolean, ringerMode: Int, interruptionFilter: Int): Boolean =
      enabled && ringerMode == RINGER_NORMAL && interruptionFilter == FILTER_ALL

  /** Vibration when the setting is on and the phone isn't fully silent. */
  fun shouldVibrate(enabled: Boolean, ringerMode: Int): Boolean =
      enabled && ringerMode != RINGER_SILENT
}

/**
 * Plays the completion chime and/or vibration. The app plays these itself (instead of the
 * notification channel) so the in-app Sound and Vibration switches keep working, and so the
 * alert still happens when notifications are turned off (decision T-06).
 */
object AlertPlayer {
  fun play(context: Context) {
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val notifications =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val ringer = audio.ringerMode
    val filter = notifications.currentInterruptionFilter

    if (AlertGate.shouldPlaySound(Prefs.soundEnabled(context), ringer, filter)) playChime(context)
    if (AlertGate.shouldVibrate(Prefs.vibrationEnabled(context), ringer)) vibrate(context)
  }

  private fun playChime(context: Context) {
    try {
      val player = MediaPlayer()
      // "Notification" usage: follows the notification volume slider.
      player.setAudioAttributes(
          AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_NOTIFICATION)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build())
      val file = context.resources.openRawResourceFd(R.raw.focus_chime)
      player.setDataSource(file.fileDescriptor, file.startOffset, file.length)
      file.close()
      player.setOnCompletionListener { it.release() }
      player.setOnErrorListener { mp, _, _ ->
        mp.release()
        true
      }
      player.prepare()
      player.start()
    } catch (e: Exception) {
      Prefs.log(context, "sound failed: ${e.javaClass.simpleName}")
    }
  }

  @Suppress("DEPRECATION") // getSystemService(Vibrator) still works on every supported version
  private fun vibrate(context: Context) {
    try {
      val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 180, 120, 180), -1))
    } catch (e: Exception) {
      Prefs.log(context, "vibration failed: ${e.javaClass.simpleName}")
    }
  }
}
