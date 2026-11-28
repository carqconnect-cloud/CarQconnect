package com.fioner.carqconnect.app

import android.app.job.JobParameters
import android.app.job.JobService

class NotificationSyncJobService : JobService() {
    override fun onStartJob(params: JobParameters?): Boolean {
        CarQNotificationHelper.pollNotificationsAsync(this) {
            jobFinished(params, false)
        }
        return true
    }

    override fun onStopJob(params: JobParameters?): Boolean = true
}
