package com.dailiary

import android.app.Activity
import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.core.app.ActivityCompat
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PickFileModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var pickPromise: Promise? = null

  companion object {
    const val REQUEST_PICK_FILE = 9001
    @Volatile
    var pendingResultCode: Int? = null
    @Volatile
    var pendingResultUri: String? = null

    /** 보관된 결과 전달 시도 (context 준비 후 MainActivity 재시도용) */
    @JvmStatic
    fun tryDeliverPendingFromApp(application: android.app.Application): Boolean {
      return try {
        val app = application as? ReactApplication ?: return false
        val ctx = app.reactNativeHost?.reactInstanceManager?.currentReactContext as? ReactApplicationContext ?: return false
        val module = ctx.getNativeModule("PickFile") as? PickFileModule ?: return false
        module.tryDeliverPendingResult()
      } catch (_: Throwable) {
        false
      }
    }
  }

  private val activityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent) {
      if (requestCode != REQUEST_PICK_FILE) return
      val promise = pickPromise ?: return
      pickPromise = null
      if (resultCode != Activity.RESULT_OK || data.data == null) {
        promise.reject("CANCELLED", "파일을 선택하지 않았습니다.")
        return
      }
      promise.resolve(data.data!!.toString())
    }
  }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "PickFile"

  @ReactMethod
  fun pickBackupFile(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Activity not available")
      return
    }
    pickPromise?.reject("CANCELLED", "새로 선택합니다.")
    pickPromise = promise
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "*/*"
      putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("application/json", "text/plain"))
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    try {
      ActivityCompat.startActivityForResult(
        activity,
        intent,
        REQUEST_PICK_FILE,
        null
      )
    } catch (e: Exception) {
      pickPromise = null
      promise.reject("PICK_ERROR", e.message)
    }
  }

  /** MainActivity에서 결과 전달용 */
  fun deliverResult(resultCode: Int, uri: String?) {
    val promise = pickPromise ?: return
    pickPromise = null
    Handler(Looper.getMainLooper()).post {
      try {
        if (resultCode != Activity.RESULT_OK || uri.isNullOrEmpty()) {
          promise.reject("CANCELLED", "파일을 선택하지 않았습니다.")
        } else {
          promise.resolve(uri)
        }
      } catch (_: Exception) { }
    }
  }

  /** 컨텍스트가 준비되지 않았을 때 결과 보관 후, 나중에 전달 시도. MainActivity에서 호출 */
  fun storePendingResult(resultCode: Int, uri: String?) {
    pendingResultCode = resultCode
    pendingResultUri = uri
  }

  /** 보관된 결과가 있으면 전달 시도. 성공 시 true */
  fun tryDeliverPendingResult(): Boolean {
    return try {
      val code = pendingResultCode ?: return true
      val uri = pendingResultUri
      pendingResultCode = null
      pendingResultUri = null
      val promise = pickPromise ?: run {
        pendingResultCode = code
        pendingResultUri = uri
        return false
      }
      pickPromise = null
      Handler(Looper.getMainLooper()).post {
        try {
          if (code != Activity.RESULT_OK || uri.isNullOrEmpty()) {
            promise.reject("CANCELLED", "파일을 선택하지 않았습니다.")
          } else {
            promise.resolve(uri)
          }
        } catch (_: Throwable) { }
      }
      true
    } catch (_: Throwable) {
      false
    }
  }
}
