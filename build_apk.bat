@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot"
set "ANDROID_HOME=D:\Project\socialmedia\android-sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "D:\Project\socialmedia\android"
echo Building APK with Gradle and JDK 21...
call gradlew.bat assembleDebug --stacktrace
