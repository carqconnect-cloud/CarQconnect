package com.fioner.carqconnect.app

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

object CarQNotificationHelper {
    const val CHANNEL_ID = "carq_alerts_high"
    const val CHANNEL_NAME = "CarQConnect Alerts & Updates"
    const val CHANNEL_DESC = "Real-time vehicle alerts, QR scans, trips, SOS and order updates"
    const val ACTION_POLL_NOTIFICATIONS = "com.fioner.carqconnect.app.ACTION_POLL_NOTIFICATIONS"
    const val EXTRA_ROUTE = "carq_route"
    const val ROUTE_NOTIFICATIONS = "notifications"

    private const val PREFS_NAME = "carq_notif_prefs"
    private const val KEY_BASE_URL = "base_url"
    private const val KEY_TOKEN = "access_token"
    private const val KEY_ENABLED = "notifications_enabled"
    private const val KEY_SEEN_IDS = "seen_ids"
    private const val KEY_HAS_BASELINE = "has_baseline"
    private const val JOB_ID = 4102
    private const val ALARM_REQUEST_CODE = 4103
    private const val POLL_INTERVAL_MS = 120_000L

    private val executor = Executors.newSingleThreadExecutor()

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val existing = manager.getNotificationChannel(CHANNEL_ID)
            if (existing == null || existing.importance < NotificationManager.IMPORTANCE_HIGH) {
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .build()
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = CHANNEL_DESC
                    enableLights(true)
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0L, 220L, 120L, 220L)
                    setSound(soundUri, audioAttributes)
                    lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                    setShowBadge(true)
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    fun hasNotificationPermission(context: Context): Boolean {
        val managerEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
        if (!managerEnabled) return false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        }
        return true
    }

    fun showSystemNotification(
        context: Context,
        idKey: String,
        title: String,
        body: String,
        type: String = "general"
    ) {
        if (!hasNotificationPermission(context)) return
        ensureChannel(context)

        val safeTitle = if (title.isBlank()) "CarQConnect Update" else title
        val safeBody = if (body.isBlank()) "Tap to view details." else body

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            putExtra(EXTRA_ROUTE, ROUTE_NOTIFICATIONS)
            putExtra("notification_id", idKey)
            putExtra("notification_type", type)
        }

        val notifId = (idKey.hashCode() and 0x7FFFFFFF).let { if (it == 0) 1001 else it }
        val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getActivity(context, notifId, launchIntent, pendingFlags)

        val largeIcon = try {
            BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)
        } catch (_: Exception) {
            null
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_carq)
            .setColor(ContextCompat.getColor(context, R.color.carq_notification_accent))
            .setContentTitle(safeTitle)
            .setContentText(safeBody)
            .setStyle(NotificationCompat.BigTextStyle().bigText(safeBody))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(
                if (type.equals("SOS", ignoreCase = true) || type.equals("alert", ignoreCase = true))
                    NotificationCompat.CATEGORY_ALARM
                else
                    NotificationCompat.CATEGORY_MESSAGE
            )
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)

        if (largeIcon != null) {
            builder.setLargeIcon(largeIcon)
        }

        try {
            NotificationManagerCompat.from(context).notify(notifId, builder.build())
        } catch (_: SecurityException) {
            // Ignored if permission revoked concurrently
        }
    }

    fun syncConfig(
        context: Context,
        baseUrl: String,
        token: String,
        enabled: Boolean,
        seedIds: List<String>? = null
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val editor = prefs.edit()
            .putString(KEY_BASE_URL, baseUrl.trimEnd('/'))
            .putString(KEY_TOKEN, token)
            .putBoolean(KEY_ENABLED, enabled)

        if (seedIds != null) {
            val current = (prefs.getStringSet(KEY_SEEN_IDS, emptySet()) ?: emptySet()).toMutableSet()
            current.addAll(seedIds)
            val trimmed = current.toList().takeLast(250).toSet()
            editor.putStringSet(KEY_SEEN_IDS, trimmed)
            editor.putBoolean(KEY_HAS_BASELINE, true)
        }

        if (token.isBlank()) {
            editor.putBoolean(KEY_HAS_BASELINE, false)
            editor.remove(KEY_SEEN_IDS)
        }
        editor.apply()

        if (token.isNotBlank() && enabled) {
            scheduleBackgroundSync(context)
        } else {
            cancelBackgroundSync(context)
        }
    }

    fun markSeenIds(context: Context, ids: List<String>) {
        if (ids.isEmpty()) return
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val current = (prefs.getStringSet(KEY_SEEN_IDS, emptySet()) ?: emptySet()).toMutableSet()
        current.addAll(ids)
        prefs.edit()
            .putStringSet(KEY_SEEN_IDS, current.toList().takeLast(250).toSet())
            .putBoolean(KEY_HAS_BASELINE, true)
            .apply()
    }

    fun scheduleBackgroundSync(context: Context) {
        ensureChannel(context)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(KEY_TOKEN, "") ?: ""
        val enabled = prefs.getBoolean(KEY_ENABLED, true)
        if (token.isBlank() || !enabled) return

        // 1. Periodic persistent JobScheduler (runs even after app close & reboot)
        val jobScheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as? JobScheduler
        if (jobScheduler != null) {
            val hasJob = jobScheduler.allPendingJobs.any { it.id == JOB_ID }
            if (!hasJob) {
                val jobInfo = JobInfo.Builder(
                    JOB_ID,
                    ComponentName(context, NotificationSyncJobService::class.java)
                )
                    .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                    .setPersisted(true)
                    .setPeriodic(15 * 60 * 1000L)
                    .build()
                try {
                    jobScheduler.schedule(jobInfo)
                } catch (_: Exception) {}
            }
        }

        // 2. Wakeup Alarm for faster background delivery between 15m JobScheduler ticks
        scheduleNextAlarm(context)
    }

    fun scheduleNextAlarm(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(KEY_TOKEN, "") ?: ""
        val enabled = prefs.getBoolean(KEY_ENABLED, true)
        if (token.isBlank() || !enabled) return

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, NotificationPollReceiver::class.java).apply {
            action = ACTION_POLL_NOTIFICATIONS
        }
        val pi = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val triggerAt = SystemClock.elapsedRealtime() + POLL_INTERVAL_MS
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi)
            } else {
                alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi)
            }
        } catch (_: Exception) {}
    }

    fun cancelBackgroundSync(context: Context) {
        val jobScheduler = context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as? JobScheduler
        jobScheduler?.cancel(JOB_ID)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, NotificationPollReceiver::class.java).apply {
            action = ACTION_POLL_NOTIFICATIONS
        }
        val pi = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pi)
    }

    fun pollNotificationsAsync(context: Context, onComplete: (() -> Unit)? = null) {
        val appContext = context.applicationContext
        executor.execute {
            try {
                pollNotificationsBlocking(appContext)
            } catch (_: Exception) {
            } finally {
                onComplete?.invoke()
            }
        }
    }

    private fun pollNotificationsBlocking(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val baseUrl = prefs.getString(KEY_BASE_URL, "") ?: ""
        val token = prefs.getString(KEY_TOKEN, "") ?: ""
        val enabled = prefs.getBoolean(KEY_ENABLED, true)
        if (baseUrl.isBlank() || token.isBlank() || !enabled) return
        if (!hasNotificationPermission(context)) return

        val url = URL("${baseUrl.trimEnd('/')}/notifications")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 10_000
            readTimeout = 10_000
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Accept", "application/json")
        }

        try {
            if (conn.responseCode != 200) return
            val body = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
            val json = JSONObject(body)
            if (!json.optBoolean("success", false)) return
            val arr = json.optJSONArray("data") ?: return

            val seenIds = (prefs.getStringSet(KEY_SEEN_IDS, emptySet()) ?: emptySet()).toMutableSet()
            val hasBaseline = prefs.getBoolean(KEY_HAS_BASELINE, false)

            if (!hasBaseline) {
                // First background check before Flutter seeded IDs: notify only if created within 2m
                val cutoffMs = System.currentTimeMillis() - 120_000L
                for (i in 0 until arr.length()) {
                    val item = arr.optJSONObject(i) ?: continue
                    val id = item.optString("id", "")
                    if (id.isBlank()) continue
                    val isUnread = item.optBoolean("isUnread", true)
                    val createdAtMs = parseIsoMillis(item.optString("createdAt", ""))
                    if (isUnread && createdAtMs >= cutoffMs && !seenIds.contains(id)) {
                        showSystemNotification(
                            context,
                            id,
                            item.optString("title", "CarQConnect"),
                            item.optString("description", ""),
                            item.optString("type", "general")
                        )
                    }
                    seenIds.add(id)
                }
                prefs.edit()
                    .putStringSet(KEY_SEEN_IDS, seenIds.toList().takeLast(250).toSet())
                    .putBoolean(KEY_HAS_BASELINE, true)
                    .apply()
                return
            }

            // Show new unread items newest-last so notification drawer orders naturally
            val newItems = mutableListOf<JSONObject>()
            for (i in 0 until arr.length()) {
                val item = arr.optJSONObject(i) ?: continue
                val id = item.optString("id", "")
                if (id.isBlank() || seenIds.contains(id)) continue
                seenIds.add(id)
                if (item.optBoolean("isUnread", true)) {
                    newItems.add(item)
                }
            }

            for (item in newItems.asReversed().take(5)) {
                showSystemNotification(
                    context,
                    item.optString("id"),
                    item.optString("title", "CarQConnect"),
                    item.optString("description", ""),
                    item.optString("type", "general")
                )
            }

            if (newItems.isNotEmpty()) {
                prefs.edit()
                    .putStringSet(KEY_SEEN_IDS, seenIds.toList().takeLast(250).toSet())
                    .apply()
            }
        } finally {
            conn.disconnect()
        }
    }

    private fun parseIsoMillis(iso: String): Long {
        if (iso.isBlank()) return 0L
        return try {
            val cleaned = iso.substringBefore('.').substringBefore('Z').substringBefore('+')
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }
            sdf.parse(cleaned)?.time ?: 0L
        } catch (_: Exception) {
            0L
        }
    }
}
