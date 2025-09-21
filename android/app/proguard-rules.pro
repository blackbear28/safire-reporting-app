# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
# react-native-gesture-handler
-keep class com.swmansion.gesturehandler.** { *; }
# react-native-screens
-keep class com.swmansion.rnscreens.** { *; }
# react-native-safe-area-context
-keep class com.th3rdwave.safeareacontext.** { *; }
# react-native-pager-view
-keep class com.reactnativepagerview.** { *; }
# @react-native-community/netinfo
-keep class com.reactnativecommunity.netinfo.** { *; }
# @react-native-async-storage/async-storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Add any project specific keep options here:
