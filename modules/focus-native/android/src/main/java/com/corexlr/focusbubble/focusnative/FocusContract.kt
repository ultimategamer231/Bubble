package com.corexlr.focusbubble.focusnative

/**
 * Names shared by every file in this module: intent actions, extras, notification
 * channels and IDs. Keeping them here means a typo can't make two files disagree.
 */
object FocusContract {
  const val ACTION_ALARM = "com.corexlr.focusbubble.action.ALARM"
  const val ACTION_COMMAND = "com.corexlr.focusbubble.action.COMMAND"

  const val EXTRA_SESSION_ID = "sessionId"
  const val EXTRA_COMMAND = "command"
  const val EXTRA_SOURCE = "source"
  const val EXTRA_RECEIVED_AT = "receivedAtElapsedMs"

  const val CHANNEL_RUNNING = "running"
  const val CHANNEL_ALERTS = "alerts"

  const val NOTIFICATION_ONGOING = 1001
  const val NOTIFICATION_COMPLETION = 1002
  const val REQUEST_ALARM = 2001

  /** The JavaScript task that receives every background command (src/services/headless.ts). */
  const val HEADLESS_TASK = "FocusCommand"

  /** Commands a notification or widget button is allowed to send. */
  val BUTTON_COMMANDS = setOf("Start", "Pause", "Resume", "Reset", "Skip")

  /**
   * Every incoming button intent must have our action, a known command and a session ID.
   * Anything else is ignored (docs/ANDROID_INTEGRATIONS.md → exported components audit).
   */
  fun isValidButtonIntent(action: String?, command: String?, sessionId: String?): Boolean =
      action == ACTION_COMMAND && command in BUTTON_COMMANDS && !sessionId.isNullOrEmpty()

  /** An alarm intent is valid only for the session the alarm was scheduled for. */
  fun isValidAlarmIntent(action: String?, sessionId: String?, scheduledFor: String?): Boolean =
      action == ACTION_ALARM && !sessionId.isNullOrEmpty() && sessionId == scheduledFor
}
