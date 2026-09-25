import { Platform, Share } from 'react-native'

// The one platform branch: the web build reaches for the browser's share sheet, native uses React Native's Share.
// navigator is only touched inside the web function, which Platform.select never picks on iOS/Android.
export const shareText = Platform.select<(message: string) => Promise<void>>({
  web: async (message) => {
    if (typeof navigator !== 'undefined' && navigator.share) await navigator.share({ title: 'Daymark', text: message })
    else if (typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(message)
  },
  default: async (message) => {
    await Share.share({ message })
  },
})
