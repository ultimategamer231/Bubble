package com.corexlr.focusbubble.focusnative

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/** What the alarm receiver needs to post the completion alert without running JavaScript. */
data class AlertPayload(
    val sessionId: String,
    val title: String,
    val body: String,
    /** Label and command for the optional button, e.g. "Start break" → "Start". */
    val actionLabel: String?,
    val actionCommand: String?,
    val deadlineElapsedMs: Long,
) {
  fun toJson(): String =
      JSONObject()
          .put("sessionId", sessionId)
          .put("title", title)
          .put("body", body)
          .put("actionLabel", actionLabel ?: JSONObject.NULL)
          .put("actionCommand", actionCommand ?: JSONObject.NULL)
          .put("deadlineElapsedMs", deadlineElapsedMs)
          .toString()

  companion object {
    fun fromJson(json: String?): AlertPayload? {
      if (json.isNullOrEmpty()) return null
      return try {
        val o = JSONObject(json)
        AlertPayload(
            sessionId = o.getString("sessionId"),
            title = o.getString("title"),
            body = o.getString("body"),
            actionLabel = if (o.isNull("actionLabel")) null else o.getString("actionLabel"),
            actionCommand = if (o.isNull("actionCommand")) null else o.getString("actionCommand"),
            deadlineElapsedMs = o.getLong("deadlineElapsedMs"),
        )
      } catch (e: Exception) {
        null
      }
    }
  }
}

/**
 * Small native key-value store (SharedPreferences) for the few things receivers must read
 * while JavaScript isn't running. The timer's real state lives in SQLite on the JS side.
 */
object Prefs {
  private const val FILE = "focus_native"
  private const val KEY_ALARM = "alarmPayload"
  private const val KEY_LAST_ALERTED = "lastAlertedSessionId"
  private const val KEY_SOUND = "sound"
  private const val KEY_VIBRATION = "vibration"
  private const val KEY_EVENT_LOG = "eventLog"
  private const val KEY_SPIKE_STATE = "spikeState"
  private const val MAX_LOG_LINES = 60

  private fun prefs(context: Context): SharedPreferences =
      context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

  fun setAlarmPayload(context: Context, payload: AlertPayload?) {
    prefs(context).edit().putString(KEY_ALARM, payload?.toJson()).apply()
  }

  fun alarmPayload(context: Context): AlertPayload? =
      AlertPayload.fromJson(prefs(context).getString(KEY_ALARM, null))

  /** Remembers which session already made a sound, so one session never alerts twice. */
  fun markAlerted(context: Context, sessionId: String): Boolean {
    val p = prefs(context)
    if (p.getString(KEY_LAST_ALERTED, null) == sessionId) return false
    p.edit().putString(KEY_LAST_ALERTED, sessionId).apply()
    return true
  }

  fun setAlertPrefs(context: Context, sound: Boolean, vibration: Boolean) {
    prefs(context).edit().putBoolean(KEY_SOUND, sound).putBoolean(KEY_VIBRATION, vibration).apply()
  }

  fun soundEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_SOUND, true)

  fun vibrationEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_VIBRATION, false)

  // ── Debug helpers used by the spike screen ──────────────────────────────

  /** Adds a timestamped line to a short log the debug screen can show. */
  fun log(context: Context, message: String) {
    val p = prefs(context)
    val lines = JSONArray(p.getString(KEY_EVENT_LOG, "[]"))
    lines.put("${System.currentTimeMillis()}|$message")
    val trimmed = JSONArray()
    for (i in maxOf(0, lines.length() - MAX_LOG_LINES) until lines.length()) trimmed.put(lines.get(i))
    p.edit().putString(KEY_EVENT_LOG, trimmed.toString()).apply()
  }

  fun eventLog(context: Context): List<String> {
    val lines = JSONArray(prefs(context).getString(KEY_EVENT_LOG, "[]"))
    return List(lines.length()) { lines.getString(it) }
  }

  fun clearEventLog(context: Context) {
    prefs(context).edit().remove(KEY_EVENT_LOG).apply()
  }

  /** Phase 2 only: the spike keeps its timer state here until SQLite arrives in Phase 3. */
  fun spikeState(context: Context): String? = prefs(context).getString(KEY_SPIKE_STATE, null)

  fun setSpikeState(context: Context, json: String?) {
    // commit(): the process may be killed right after a background command.
    prefs(context).edit().putString(KEY_SPIKE_STATE, json).commit()
  }
}
