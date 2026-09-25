import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdateToast() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()

  if (!needRefresh[0]) return null

  return <aside className="update-toast" role="status">
    <span>New version available</span>
    <button type="button" onClick={() => void updateServiceWorker(true)}>Refresh</button>
  </aside>
}

export function OfflineBanner({ offline }: { offline: boolean }) {
  if (!offline) return null
  return <div className="offline-banner" role="status">You are offline. New habits will sync when you reconnect.</div>
}