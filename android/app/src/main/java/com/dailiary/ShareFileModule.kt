package com.dailiary

import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import java.io.InputStreamReader
import java.nio.charset.StandardCharsets

class ShareFileModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ShareFile"

  @ReactMethod
  fun getContentUri(filePath: String, promise: Promise) {
    try {
      val path = filePath.replace("file://", "")
      val file = File(path)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "File not found: $filePath")
        return
      }
      val context = reactApplicationContext.applicationContext
      val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file
      )
      promise.resolve(uri.toString())
    } catch (e: Exception) {
      promise.reject("GET_URI_ERROR", e.message)
    }
  }

  /** 파일을 공유 시트로 열기 (Drive 등에서 읽기 권한·MIME 타입 명시) */
  @ReactMethod
  fun shareFile(filePath: String, title: String, promise: Promise) {
    try {
      val path = filePath.replace("file://", "")
      val file = File(path)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "File not found: $filePath")
        return
      }
      val context = reactApplicationContext.applicationContext
      val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file
      )
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = "application/json"
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_TITLE, title)
      }
      val chooser = Intent.createChooser(intent, title)
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.currentActivity?.startActivity(chooser)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SHARE_ERROR", e.message)
    }
  }

  /** content:// URI 내용을 문자열로 읽기 (Drive 등에서 선택한 파일용) */
  @ReactMethod
  fun readContentUri(uriString: String, promise: Promise) {
    try {
      val uri = Uri.parse(uriString)
      val context = reactApplicationContext.applicationContext
      context.contentResolver.openInputStream(uri)?.use { inputStream ->
        InputStreamReader(inputStream, StandardCharsets.UTF_8).use { reader ->
          val sb = StringBuilder()
          val buffer = CharArray(8192)
          var n: Int
          while (reader.read(buffer).also { n = it } != -1) {
            sb.append(buffer, 0, n)
          }
          promise.resolve(sb.toString())
        }
      } ?: promise.reject("READ_ERROR", "Could not open content URI")
    } catch (e: Exception) {
      promise.reject("READ_ERROR", e.message)
    }
  }
}
