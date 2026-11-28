package expo.modules.seyli.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.view.WindowManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Envoi direct d'un SMS, sans passer par l'application Messages.
 *
 * `expo-sms` ne fait qu'ouvrir le composeur et résout toujours `unknown` : pour
 * une alerte SOS à un clic, l'utilisatrice n'a pas à appuyer sur « Envoyer ».
 * `SmsManager` envoie depuis l'application elle-même, à condition de détenir la
 * permission d'exécution `SEND_SMS` (demandée côté JS avant l'appel).
 */
class SmsPermissionException :
  CodedException("SEYLI n'a pas la permission d'envoyer des SMS sur cet appareil.")

class NoTelephonyException :
  CodedException("Cet appareil n'a pas de module téléphonie : le SMS ne peut pas partir.")

class SmsSendException(message: String) :
  CodedException(message)

class SeyliSmsModule : Module() {
  // Bridgeless builds can expose a null reactContext while the activity is live;
  // fall back to it so the send still has a valid Context.
  private val context: Context
    get() = appContext.reactContext
      ?: appContext.currentActivity
      ?: throw CodedException("Contexte Android indisponible.")

  private fun hasPermission(): Boolean =
    context.checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED

  private fun hasTelephony(): Boolean =
    context.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)

  private fun manager(): SmsManager? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      context.getSystemService(SmsManager::class.java)
    } else {
      @Suppress("DEPRECATION")
      SmsManager.getDefault()
    }

  /**
   * Candidates in order. The "default" manager resolves its subscription through
   * telephony APIs that are guarded by `READ_PHONE_STATE` on several OEM/IMS
   * stacks, which surfaces as `SecurityException: getGroupIdLevel1` even though
   * `SEND_SMS` is granted. Pinning the subscription explicitly sidesteps that
   * lookup, so it is attempted as a second chance instead of asking the user for
   * a permission SEYLI has no business reading.
   */
  private fun managers(): List<SmsManager> {
    val candidates = mutableListOf<SmsManager>()
    val default = manager()
    if (default != null) candidates.add(default)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && default != null) {
      try {
        val subId = SubscriptionManager.getDefaultSmsSubscriptionId()
        if (subId >= SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
          candidates.add(default.createForSubscriptionId(subId))
        }
      } catch (_: Exception) {
        // No pinnable subscription: the default manager is all we have.
      }
    }
    return candidates
  }

  override fun definition() = ModuleDefinition {
    Name("SeyliSms")

    Function("canSend") {
      hasPermission() && hasTelephony()
    }

    /**
     * FLAG_SECURE empêche la capture d'écran et l'enregistrement de l'écran par
     * le système, donc les aperçus dans la galerie ou le multitâche. Le drapeau
     * appartient à la fenêtre : il est posé sur le thread UI.
     */
    Function("setSecureScreen") { enabled: Boolean ->
      val activity = appContext.currentActivity
      if (activity == null) {
        false
      } else {
        activity.runOnUiThread {
          if (enabled) {
            activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
          } else {
            activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
          }
        }
        true
      }
    }

    AsyncFunction("send") { addresses: List<String>, message: String, promise: Promise ->
      if (!hasTelephony()) {
        promise.reject(NoTelephonyException())
        return@AsyncFunction
      }
      if (!hasPermission()) {
        promise.reject(SmsPermissionException())
        return@AsyncFunction
      }
      val candidates = managers()
      if (candidates.isEmpty()) {
        promise.reject(NoTelephonyException())
        return@AsyncFunction
      }

      val targets = addresses.map { it.trim() }.filter { it.isNotEmpty() }
      if (targets.isEmpty()) {
        promise.reject(SmsSendException("Aucun numéro de destinataire."))
        return@AsyncFunction
      }

      var lastError: Exception? = null
      for (smsManager in candidates) {
        try {
          val parts = smsManager.divideMessage(message)
          for (address in targets) {
            if (parts.size > 1) {
              smsManager.sendMultipartTextMessage(address, null, parts, null, null)
            } else {
              smsManager.sendTextMessage(address, null, message, null, null)
            }
          }
          promise.resolve(mapOf("recipients" to targets.size, "parts" to parts.size))
          return@AsyncFunction
        } catch (error: Exception) {
          lastError = error
        }
      }

      promise.reject(
        SmsSendException("Échec de l'envoi du SMS : ${lastError?.message ?: "erreur inconnue"}")
      )
    }
  }
}
