# ============================================================================
# CarQConnect ProGuard & R8 Optimization and Keep Rules
# ============================================================================

# Flutter SDK & Engine internals
-keep class io.flutter.** { *; }
-dontwarn io.flutter.**
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.embedding.** { *; }

# Flutter generated plugin registrants
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.plugins.**

# Kotlin Runtime & Coroutines
-keep class kotlin.** { *; }
-keep class kotlin.reflect.** { *; }
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# Flutter Secure Storage
-keep class it.nplace.flutter_secure_storage.** { *; }
-dontwarn it.nplace.flutter_secure_storage.**
-keep class androidx.security.crypto.** { *; }
-dontwarn androidx.security.crypto.**

# Flutter Jailbreak Detection
-keep class app.mews.flutter_jailbreak_detection.** { *; }
-dontwarn app.mews.flutter_jailbreak_detection.**
-keep class com.scottyab.rootbeer.** { *; }
-dontwarn com.scottyab.rootbeer.**

# Razorpay SDK
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** { *; }
-optimizations !method/inlining/
-keepclasseswithmembers class * {
    public void onPaymentSuccess(java.lang.String);
    public void onPaymentError(int, java.lang.String);
}

# Mobile Scanner & CameraX
-keep class dev.steenbakker.mobile_scanner.** { *; }
-dontwarn dev.steenbakker.mobile_scanner.**
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**
-keep class com.google.mlkit.vision.** { *; }
-dontwarn com.google.mlkit.vision.**

# Google Sign-In & Play Services
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.api.client.** { *; }
-dontwarn com.google.api.client.**

# 3D Model Viewer & WebKit
-keep class android.webkit.** { *; }
-dontwarn android.webkit.**
-keep class com.google.ar.core.** { *; }
-dontwarn com.google.ar.core.**

# JSON and Serialization rules
-keepattributes Signature
-keepattributes InnerClasses
-keepclassmembers enum * { *; }
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

