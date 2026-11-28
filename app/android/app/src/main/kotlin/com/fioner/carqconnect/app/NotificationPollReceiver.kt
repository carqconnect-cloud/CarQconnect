package com.fioner.carqconnect.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class NotificationPollReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == CarQNotificationHelper.ACTION_POLL_NOTIFICATIONS
        ) {
            val pendingResult = goAsync()
            CarQNotificationHelper.scheduleBackgroundSync(context)
            CarQNotificationHelper.pollNotificationsAsync(context) {
                pendingResult.finish()
            }
        }
    }
}
