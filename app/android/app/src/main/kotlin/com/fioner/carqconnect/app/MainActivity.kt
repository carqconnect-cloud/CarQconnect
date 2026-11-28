package com.fioner.carqconnect.app

import android.Manifest
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import androidx.annotation.NonNull
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.carqconnect.app/media"
    private val NOTIF_CHANNEL = "com.carqconnect.app/notifications"
    private val REQUEST_POST_NOTIFICATIONS = 4101

    private var notifChannel: MethodChannel? = null
    private var pendingPermissionResult: MethodChannel.Result? = null
    private var pendingRoute: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        CarQNotificationHelper.ensureChannel(this)
        captureRouteFromIntent(intent, notifyFlutter = false)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        captureRouteFromIntent(intent, notifyFlutter = true)
    }

    private fun captureRouteFromIntent(intent: Intent?, notifyFlutter: Boolean) {
        val route = intent?.getStringExtra(CarQNotificationHelper.EXTRA_ROUTE)
        if (!route.isNullOrBlank()) {
            pendingRoute = route
            if (notifyFlutter) {
                notifChannel?.invokeMethod("onNotificationTap", mapOf("route" to route))
            }
        }
    }

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        CarQNotificationHelper.ensureChannel(this)

        notifChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, NOTIF_CHANNEL)
        notifChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "hasPermission" -> {
                    result.success(CarQNotificationHelper.hasNotificationPermission(this))
                }
                "requestPermission" -> {
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                        result.success(CarQNotificationHelper.hasNotificationPermission(this))
                        return@setMethodCallHandler
                    }
                    val granted = ContextCompat.checkSelfPermission(
                        this,
                        Manifest.permission.POST_NOTIFICATIONS
                    ) == PackageManager.PERMISSION_GRANTED
                    if (granted) {
                        result.success(true)
                        return@setMethodCallHandler
                    }
                    pendingPermissionResult?.success(false)
                    pendingPermissionResult = result
                    ActivityCompat.requestPermissions(
                        this,
                        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                        REQUEST_POST_NOTIFICATIONS
                    )
                }
                "showNotification" -> {
                    val id = call.argument<String>("id") ?: System.currentTimeMillis().toString()
                    val title = call.argument<String>("title") ?: "CarQConnect"
                    val body = call.argument<String>("body") ?: ""
                    val type = call.argument<String>("type") ?: "general"
                    CarQNotificationHelper.showSystemNotification(this, id, title, body, type)
                    result.success(true)
                }
                "syncConfig" -> {
                    val baseUrl = call.argument<String>("baseUrl") ?: ""
                    val token = call.argument<String>("token") ?: ""
                    val enabled = call.argument<Boolean>("enabled") ?: true
                    val seedIds = call.argument<List<String>>("seedIds")
                    CarQNotificationHelper.syncConfig(this, baseUrl, token, enabled, seedIds)
                    result.success(true)
                }
                "markSeenIds" -> {
                    val ids = call.argument<List<String>>("ids") ?: emptyList()
                    CarQNotificationHelper.markSeenIds(this, ids)
                    result.success(true)
                }
                "pollNow" -> {
                    CarQNotificationHelper.pollNotificationsAsync(this)
                    result.success(true)
                }
                "getLaunchRoute" -> {
                    val route = pendingRoute
                    pendingRoute = null
                    result.success(route)
                }
                else -> result.notImplemented()
            }
        }

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "saveImageToGallery" -> {
                    val bytes = call.argument<ByteArray>("bytes")
                    val filename = call.argument<String>("filename") ?: "QR_${System.currentTimeMillis()}.png"
                    if (bytes == null) {
                        result.error("INVALID_ARGUMENT", "Bytes cannot be null", null)
                        return@setMethodCallHandler
                    }
                    try {
                        val saved = saveToGallery(bytes, filename)
                        if (saved) {
                            result.success(true)
                        } else {
                            result.error("SAVE_FAILED", "Failed to save image to gallery", null)
                        }
                    } catch (e: Exception) {
                        result.error("ERROR", e.localizedMessage, null)
                    }
                }
                "shareContent" -> {
                    val text = call.argument<String>("text") ?: ""
                    val subject = call.argument<String>("subject") ?: "Share Document"
                    val title = call.argument<String>("title") ?: "Share via"
                    try {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, subject)
                            putExtra(Intent.EXTRA_TEXT, text)
                        }
                        val chooser = Intent.createChooser(shareIntent, title).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        this@MainActivity.startActivity(chooser)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("SHARE_ERROR", e.localizedMessage, null)
                    }
                }
                "isDeviceRooted" -> {
                    result.success(isRooted())
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_POST_NOTIFICATIONS) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            pendingPermissionResult?.success(granted)
            pendingPermissionResult = null
        }
    }

    private fun isRooted(): Boolean {
        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su"
        )
        for (path in paths) {
            if (File(path).exists()) return true
        }
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) {
            return true
        }
        return false
    }

    private fun saveToGallery(bytes: ByteArray, filename: String): Boolean {
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return false
        val resolver = applicationContext.contentResolver

        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + File.separator + "CarQConnect")
                }
                val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues) ?: return false
                resolver.openOutputStream(uri)?.use { stream ->
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
                    stream.flush()
                } ?: return false
                true
            } else {
                val picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                val appDir = File(picturesDir, "CarQConnect")
                if (!appDir.exists()) appDir.mkdirs()
                val file = File(appDir, filename)
                FileOutputStream(file).use { out ->
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                }
                MediaStore.Images.Media.insertImage(resolver, file.absolutePath, filename, "CarQConnect Digital E-tag")
                true
            }
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
